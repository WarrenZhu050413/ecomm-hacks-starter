/**
 * ConfigSidebar - Slide-out settings panel for runtime configuration.
 * Allows editing physics, spawning, models, and theme settings.
 */

import { useState, useEffect } from 'react'
import type {
  CanvasConfig,
  CardTheme,
  CanvasTheme,
  PhysicsConfig,
  SpawningConfig,
  ModelsConfig,
  ModelType,
} from '@/services/api'
import './ConfigSidebar.css'

interface ConfigSidebarProps {
  isOpen: boolean
  onClose: () => void
  config: CanvasConfig
  onApply: (config: CanvasConfig) => void
  onSave?: (config: CanvasConfig) => void
}

export default function ConfigSidebar({
  isOpen,
  onClose,
  config,
  onApply,
  onSave,
}: ConfigSidebarProps) {
  // Editor mode: form or json
  const [editorMode, setEditorMode] = useState<'form' | 'json'>('form')
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Local state for editing
  const [physics, setPhysics] = useState<PhysicsConfig>(config.physics)
  const [spawning, setSpawning] = useState<SpawningConfig>(config.spawning)
  const [models, setModels] = useState<ModelsConfig>(config.models)
  const [cardTheme, setCardTheme] = useState<CardTheme>(config.cardTheme)
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>(
    config.canvasTheme
  )
  const [generationContext, setGenerationContext] = useState<string>(
    config.generationContext
  )
  const [directives, setDirectives] = useState<string[]>(config.directives)

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['physics', 'spawning'])
  )

  // Reset local state when config prop changes
  useEffect(() => {
    setPhysics(config.physics)
    setSpawning(config.spawning)
    setModels(config.models)
    setCardTheme(config.cardTheme)
    setCanvasTheme(config.canvasTheme)
    setGenerationContext(config.generationContext)
    setDirectives(config.directives)
    // Update JSON text if in JSON mode
    if (editorMode === 'json') {
      setJsonText(JSON.stringify(config, null, 2))
      setJsonError(null)
    }
  }, [config, editorMode])

  // Sync JSON text when switching to JSON mode
  useEffect(() => {
    if (editorMode === 'json') {
      setJsonText(JSON.stringify(config, null, 2))
      setJsonError(null)
    }
  }, [editorMode, config])

  // Handle JSON text changes with validation
  const handleJsonChange = (text: string) => {
    setJsonText(text)
    try {
      JSON.parse(text)
      setJsonError(null)
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }

  // Get current config from either form or JSON
  const getCurrentConfig = (): CanvasConfig | null => {
    if (editorMode === 'json') {
      try {
        return JSON.parse(jsonText) as CanvasConfig
      } catch {
        return null
      }
    }
    return {
      ...config,
      physics,
      spawning,
      models,
      cardTheme,
      canvasTheme,
      generationContext,
      directives,
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const handleApply = () => {
    const newConfig = getCurrentConfig()
    if (newConfig) {
      onApply(newConfig)
    }
  }

  const handleSave = () => {
    const newConfig = getCurrentConfig()
    if (newConfig && onSave) {
      onSave(newConfig)
    }
  }

  const handleReset = () => {
    setPhysics(config.physics)
    setSpawning(config.spawning)
    setModels(config.models)
    setCardTheme(config.cardTheme)
    setCanvasTheme(config.canvasTheme)
    if (editorMode === 'json') {
      setJsonText(JSON.stringify(config, null, 2))
      setJsonError(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`config-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="config-sidebar-header">
        <h2>Settings</h2>
        <div className="config-mode-toggle">
          <button
            className={editorMode === 'form' ? 'active' : ''}
            onClick={() => setEditorMode('form')}
          >
            Form
          </button>
          <button
            className={editorMode === 'json' ? 'active' : ''}
            onClick={() => setEditorMode('json')}
          >
            JSON
          </button>
        </div>
        <button className="config-sidebar-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="config-sidebar-body">
        {editorMode === 'json' ? (
          <div className="config-json-editor">
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              spellCheck={false}
              placeholder="Edit config JSON..."
            />
            {jsonError && <div className="json-error">Error: {jsonError}</div>}
          </div>
        ) : (
          <>
            {/* Physics Section */}
            <section className="config-section">
              <button
                className="config-section-header"
                onClick={() => toggleSection('physics')}
              >
                <span>Physics</span>
                <span className="config-section-toggle">
                  {expandedSections.has('physics') ? '−' : '+'}
                </span>
              </button>
              {expandedSections.has('physics') && (
                <div className="config-section-content">
                  <div className="config-row">
                    <label>Card Lifetime</label>
                    <div className="config-input-group">
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        value={physics.cardLifetime}
                        onChange={(e) =>
                          setPhysics((p) => ({
                            ...p,
                            cardLifetime: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="config-value">
                        {physics.cardLifetime}s
                      </span>
                    </div>
                  </div>

                  <div className="config-row">
                    <label>Drift Speed</label>
                    <div className="config-input-group">
                      <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={physics.driftSpeed}
                        onChange={(e) =>
                          setPhysics((p) => ({
                            ...p,
                            driftSpeed: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="config-value">
                        {physics.driftSpeed.toFixed(1)}x
                      </span>
                    </div>
                  </div>

                  <div className="config-row">
                    <label>Jiggle</label>
                    <div className="config-input-group">
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={physics.jiggle}
                        onChange={(e) =>
                          setPhysics((p) => ({
                            ...p,
                            jiggle: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="config-value">
                        {physics.jiggle.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="config-row">
                    <label>Bounce</label>
                    <div className="config-input-group">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={physics.bounce}
                        onChange={(e) =>
                          setPhysics((p) => ({
                            ...p,
                            bounce: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="config-value">
                        {physics.bounce.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Spawning Section */}
            <section className="config-section">
              <button
                className="config-section-header"
                onClick={() => toggleSection('spawning')}
              >
                <span>Spawning</span>
                <span className="config-section-toggle">
                  {expandedSections.has('spawning') ? '−' : '+'}
                </span>
              </button>
              {expandedSections.has('spawning') && (
                <div className="config-section-content">
                  <div className="config-row">
                    <label>Interval</label>
                    <div className="config-input-group">
                      <input
                        type="range"
                        min="3"
                        max="30"
                        step="1"
                        value={spawning.intervalSeconds}
                        onChange={(e) =>
                          setSpawning((s) => ({
                            ...s,
                            intervalSeconds: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="config-value">
                        {spawning.intervalSeconds}s
                      </span>
                    </div>
                  </div>

                  <div className="config-row">
                    <label>Min Cards</label>
                    <div className="config-input-group">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={spawning.minCards}
                        onChange={(e) =>
                          setSpawning((s) => ({
                            ...s,
                            minCards: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="config-value">{spawning.minCards}</span>
                    </div>
                  </div>

                  <div className="config-row">
                    <label>Image Weight</label>
                    <div className="config-input-group">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={spawning.imageWeight ?? 0}
                        onChange={(e) =>
                          setSpawning((s) => ({
                            ...s,
                            imageWeight: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="config-value">
                        {Math.round((spawning.imageWeight ?? 0) * 100)}%
                      </span>
                    </div>
                    <p className="config-hint">
                      Probability of generating an image card (from Wikimedia)
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Models Section */}
            <section className="config-section">
              <button
                className="config-section-header"
                onClick={() => toggleSection('models')}
              >
                <span>Models</span>
                <span className="config-section-toggle">
                  {expandedSections.has('models') ? '−' : '+'}
                </span>
              </button>
              {expandedSections.has('models') && (
                <div className="config-section-content">
                  <div className="config-row">
                    <label>Generation</label>
                    <select
                      value={models.generation}
                      onChange={(e) =>
                        setModels((m) => ({
                          ...m,
                          generation: e.target.value as ModelType,
                        }))
                      }
                    >
                      <option value="pro">Gemini 3 Pro (recommended)</option>
                    </select>
                  </div>

                  <div className="config-row">
                    <label>Chat</label>
                    <select
                      value={models.chat}
                      onChange={(e) =>
                        setModels((m) => ({
                          ...m,
                          chat: e.target.value as ModelType,
                        }))
                      }
                    >
                      <option value="pro">Gemini 3 Pro (recommended)</option>
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* Card Theme Section */}
            <section className="config-section">
              <button
                className="config-section-header"
                onClick={() => toggleSection('cardTheme')}
              >
                <span>Card Theme</span>
                <span className="config-section-toggle">
                  {expandedSections.has('cardTheme') ? '−' : '+'}
                </span>
              </button>
              {expandedSections.has('cardTheme') && (
                <div className="config-section-content">
                  <div className="config-row vertical">
                    <label>Container Classes</label>
                    <textarea
                      value={cardTheme.container}
                      onChange={(e) =>
                        setCardTheme((t) => ({
                          ...t,
                          container: e.target.value,
                        }))
                      }
                      placeholder="Tailwind classes for card container"
                      rows={2}
                    />
                  </div>

                  <div className="config-row vertical">
                    <label>Primary Text</label>
                    <textarea
                      value={cardTheme.primary}
                      onChange={(e) =>
                        setCardTheme((t) => ({ ...t, primary: e.target.value }))
                      }
                      placeholder="Tailwind classes for primary text"
                      rows={2}
                    />
                  </div>

                  <div className="config-row vertical">
                    <label>Secondary Text</label>
                    <textarea
                      value={cardTheme.secondary}
                      onChange={(e) =>
                        setCardTheme((t) => ({
                          ...t,
                          secondary: e.target.value,
                        }))
                      }
                      placeholder="Tailwind classes for secondary text"
                      rows={2}
                    />
                  </div>

                  <div className="config-row vertical">
                    <label>Meta Text</label>
                    <textarea
                      value={cardTheme.meta}
                      onChange={(e) =>
                        setCardTheme((t) => ({ ...t, meta: e.target.value }))
                      }
                      placeholder="Tailwind classes for meta text"
                      rows={2}
                    />
                  </div>

                  <div className="config-row vertical">
                    <label>Dragging State</label>
                    <textarea
                      value={cardTheme.dragging ?? ''}
                      onChange={(e) =>
                        setCardTheme((t) => ({
                          ...t,
                          dragging: e.target.value || null,
                        }))
                      }
                      placeholder="Classes applied while dragging"
                      rows={1}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Canvas Theme Section */}
            <section className="config-section">
              <button
                className="config-section-header"
                onClick={() => toggleSection('canvasTheme')}
              >
                <span>Canvas Theme</span>
                <span className="config-section-toggle">
                  {expandedSections.has('canvasTheme') ? '−' : '+'}
                </span>
              </button>
              {expandedSections.has('canvasTheme') && (
                <div className="config-section-content">
                  <div className="config-row vertical">
                    <label>Background (CSS fallback)</label>
                    <textarea
                      value={canvasTheme.background}
                      onChange={(e) =>
                        setCanvasTheme((t) => ({
                          ...t,
                          background: e.target.value,
                        }))
                      }
                      placeholder="CSS background value (gradient or color)"
                      rows={2}
                    />
                  </div>

                  <div className="config-row">
                    <label>Accent Color</label>
                    <div className="config-input-group">
                      <input
                        type="color"
                        value={canvasTheme.accent}
                        onChange={(e) =>
                          setCanvasTheme((t) => ({
                            ...t,
                            accent: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        value={canvasTheme.accent}
                        onChange={(e) =>
                          setCanvasTheme((t) => ({
                            ...t,
                            accent: e.target.value,
                          }))
                        }
                        className="config-color-text"
                      />
                    </div>
                  </div>

                  <div className="config-divider">Image Background</div>

                  <div className="config-row vertical">
                    <label>Image URL</label>
                    <input
                      type="text"
                      value={canvasTheme.backgroundImage ?? ''}
                      onChange={(e) =>
                        setCanvasTheme((t) => ({
                          ...t,
                          backgroundImage: e.target.value || null,
                        }))
                      }
                      placeholder="https://upload.wikimedia.org/..."
                    />
                    <p className="config-hint">
                      Wikimedia Commons URL for background image
                    </p>
                  </div>

                  <div className="config-row vertical">
                    <label>CSS Filter</label>
                    <input
                      type="text"
                      value={canvasTheme.backgroundFilter ?? ''}
                      onChange={(e) =>
                        setCanvasTheme((t) => ({
                          ...t,
                          backgroundFilter: e.target.value || null,
                        }))
                      }
                      placeholder="blur(12px) brightness(0.3) saturate(1.2)"
                    />
                    <p className="config-hint">
                      blur, brightness, saturate, hue-rotate, grayscale, sepia
                    </p>
                  </div>

                  <div className="config-row vertical">
                    <label>Blend Mode</label>
                    <select
                      value={canvasTheme.backgroundBlendMode ?? ''}
                      onChange={(e) =>
                        setCanvasTheme((t) => ({
                          ...t,
                          backgroundBlendMode: e.target.value || null,
                        }))
                      }
                    >
                      <option value="">None</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                      <option value="darken">Darken</option>
                      <option value="lighten">Lighten</option>
                      <option value="color-dodge">Color Dodge</option>
                      <option value="color-burn">Color Burn</option>
                      <option value="soft-light">Soft Light</option>
                      <option value="difference">Difference</option>
                    </select>
                  </div>

                  <div className="config-row vertical">
                    <label>Color Overlay</label>
                    <input
                      type="text"
                      value={canvasTheme.backgroundOverlay ?? ''}
                      onChange={(e) =>
                        setCanvasTheme((t) => ({
                          ...t,
                          backgroundOverlay: e.target.value || null,
                        }))
                      }
                      placeholder="rgba(0,0,0,0.4)"
                    />
                    <p className="config-hint">
                      Semi-transparent color overlay on top of image
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Generation Context Section */}
            <section className="config-section">
              <button
                className="config-section-header"
                onClick={() => toggleSection('context')}
              >
                <span>Generation Context</span>
                <span className="config-section-toggle">
                  {expandedSections.has('context') ? '−' : '+'}
                </span>
              </button>
              {expandedSections.has('context') && (
                <div className="config-section-content">
                  <div className="config-row vertical">
                    <label>LLM Prompt Context</label>
                    <textarea
                      className="config-textarea"
                      value={generationContext}
                      onChange={(e) => setGenerationContext(e.target.value)}
                      rows={4}
                      placeholder="Instructions that guide card generation..."
                    />
                    <p className="config-hint">
                      This text is sent to the LLM with every card generation.
                      Describe the style, tone, and content you want.
                    </p>
                  </div>

                  <div className="config-row vertical">
                    <label>Diversity Directives</label>
                    <p
                      className="config-hint"
                      style={{ marginBottom: '0.5rem' }}
                    >
                      Short phrases that push generation in different directions
                      (one per line).
                    </p>
                    <textarea
                      className="config-textarea"
                      value={directives.join('\n')}
                      onChange={(e) =>
                        setDirectives(
                          e.target.value.split('\n').filter((d) => d.trim())
                        )
                      }
                      rows={5}
                      placeholder="Explore something unexpected&#10;Go deeper into themes&#10;Introduce contrast..."
                    />
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <div className="config-sidebar-footer">
        <button className="config-btn secondary" onClick={handleReset}>
          Reset
        </button>
        <button
          className="config-btn primary"
          onClick={handleApply}
          disabled={editorMode === 'json' && jsonError !== null}
        >
          Apply
        </button>
        {onSave && (
          <button
            className="config-btn save"
            onClick={handleSave}
            disabled={editorMode === 'json' && jsonError !== null}
            title="Save config permanently"
          >
            Save
          </button>
        )}
      </div>
    </div>
  )
}
