/**
 * ShaderBackground - WebGL shader background component.
 * Renders GLSL fragment shaders in Shadertoy format.
 *
 * Note: Shader generation is complex and may fail. This renderer
 * gracefully falls back to gradient when shaders fail to compile.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { backgroundRegistry, type BackgroundRendererProps } from './types'
import { GradientBackground } from './GradientBackground'

// Vertex shader - simple fullscreen quad
const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

// Wrapper to convert Shadertoy format to standard WebGL
function wrapShaderCode(userCode: string, colorCount: number): string {
  const colorUniforms = Array.from(
    { length: colorCount },
    (_, i) => `uniform vec3 uColor${i};`
  ).join('\n')

  return `
    precision mediump float;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec2 iMouse;
    uniform float uSpeed;
    ${colorUniforms}

    ${userCode}

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `
}

// Convert hex color to RGB floats (0-1)
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result || !result[1] || !result[2] || !result[3]) return [1, 1, 1]
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ]
}

export function ShaderBackground({
  theme,
  fallback,
  onError,
}: BackgroundRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const startTimeRef = useRef<number>(0)
  const [hasError, setHasError] = useState(false)

  // Extract shader config from theme (assumes shader field exists)
  const shader = (theme as { shader?: string }).shader
  const speed = (theme as { shaderSpeed?: number }).shaderSpeed ?? 1.0
  const colors = (theme as { shaderColors?: string[] }).shaderColors ?? []

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = 0
    }
    if (glRef.current && programRef.current) {
      glRef.current.deleteProgram(programRef.current)
      programRef.current = null
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion || !shader) {
      setHasError(true)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // Get WebGL context
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    })

    if (!gl) {
      setHasError(true)
      onError?.('WebGL not supported')
      return
    }

    glRef.current = gl

    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)
    if (!vertexShader) {
      setHasError(true)
      onError?.('Failed to create vertex shader')
      return
    }
    gl.shaderSource(vertexShader, VERTEX_SHADER)
    gl.compileShader(vertexShader)

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      const error =
        gl.getShaderInfoLog(vertexShader) || 'Unknown vertex shader error'
      setHasError(true)
      onError?.(error)
      gl.deleteShader(vertexShader)
      return
    }

    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    if (!fragmentShader) {
      setHasError(true)
      onError?.('Failed to create fragment shader')
      gl.deleteShader(vertexShader)
      return
    }

    const wrappedShader = wrapShaderCode(shader, colors.length)
    gl.shaderSource(fragmentShader, wrappedShader)
    gl.compileShader(fragmentShader)

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const error =
        gl.getShaderInfoLog(fragmentShader) || 'Unknown fragment shader error'
      console.error('Shader compilation error:', error)
      setHasError(true)
      onError?.(error)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    // Create program
    const program = gl.createProgram()
    if (!program) {
      setHasError(true)
      onError?.('Failed to create program')
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error =
        gl.getProgramInfoLog(program) || 'Unknown program link error'
      setHasError(true)
      onError?.(error)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    // Shaders are attached to program, can delete shader objects
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    programRef.current = program

    // Create fullscreen quad
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    // Get uniform locations
    const iTimeLocation = gl.getUniformLocation(program, 'iTime')
    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution')
    const iMouseLocation = gl.getUniformLocation(program, 'iMouse')
    const uSpeedLocation = gl.getUniformLocation(program, 'uSpeed')
    const colorLocations = colors.map((_, i) =>
      gl.getUniformLocation(program, `uColor${i}`)
    )

    gl.useProgram(program)

    // Set static uniforms
    gl.uniform1f(uSpeedLocation, speed)
    colors.forEach((hex, i) => {
      const location = colorLocations[i]
      if (location) {
        const rgb = hexToRgb(hex)
        gl.uniform3f(location, rgb[0], rgb[1], rgb[2])
      }
    })

    startTimeRef.current = performance.now()

    // Resize handler
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2) // Limit DPR for performance
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize)

    // Mouse tracking
    let mouseX = 0
    let mouseY = 0
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = rect.height - (e.clientY - rect.top) // Flip Y
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    const render = () => {
      const time = (performance.now() - startTimeRef.current) / 1000

      gl.uniform1f(iTimeLocation, time)
      gl.uniform2f(iResolutionLocation, canvas.width, canvas.height)
      gl.uniform2f(iMouseLocation, mouseX, mouseY)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      cleanup()
    }
  }, [shader, speed, colors, onError, prefersReducedMotion, cleanup])

  // Show fallback if error or reduced motion
  if (hasError || prefersReducedMotion || !shader) {
    return <GradientBackground theme={theme} fallback={fallback} />
  }

  return (
    <canvas
      ref={canvasRef}
      className="shader-background"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 0,
      }}
    />
  )
}

// Register with priority 20 - higher than image
backgroundRegistry.register({
  name: 'shader',
  matcher: (theme) => ((theme as { shader?: string }).shader ? 20 : 0),
  renderer: ShaderBackground,
})
