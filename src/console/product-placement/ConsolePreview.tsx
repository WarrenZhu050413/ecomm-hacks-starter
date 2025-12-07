/**
 * ConsolePreview - Consumer-like preview for Console placements
 *
 * Features:
 * - Mask-based hover detection (only product areas trigger popup)
 * - ProductOverlay with Add to Bag / Buy Now
 * - ShoppingBag with checkout flow
 * - Scrollable gallery of generated placements
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { ProductOverlay } from '../../components/ProductOverlay'
import { ShoppingBag } from '../../components/ShoppingBag'
import type { Product, BagItem } from '../../types/consumer'
import './ConsolePreview.css'

// Placement from Console
interface ScenePlacement {
  sceneId: string
  description: string
  mood: string
  sceneType: 'continuation' | 'exploration'
  imageData: string // base64 scene
  mimeType: string
  selectedProduct?: {
    id: string
    name: string
    brand: string
    img: string  // Product image URL for preview
  }
  placementHint?: string
  rationale?: string
  composedImage?: string // base64
  maskImage?: string // base64
}

interface ConsolePreviewProps {
  placements: ScenePlacement[]
  onClose: () => void
}

export function ConsolePreview({ placements, onClose }: ConsolePreviewProps) {
  // Filter to only show placements with composed images
  const readyPlacements = placements.filter(p => p.composedImage && p.maskImage)

  // Shopping state
  const [bag, setBag] = useState<BagItem[]>([])
  const [showBag, setShowBag] = useState(false)

  // Product hover state
  const [activeProduct, setActiveProduct] = useState<{
    product: Product
    position: { x: number; y: number }
    productBounds: { left: number; right: number; top: number; bottom: number }
    placementId: string
    sceneImageUrl: string
  } | null>(null)
  const [productHoverPlacementId, setProductHoverPlacementId] = useState<string | null>(null)
  const [productClickLocked, setProductClickLocked] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPlacementRef = useRef<string | null>(null) // Track which placement the show timeout is for

  // Mask canvas refs for hover detection
  const maskCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const maskImageDataRefs = useRef<Map<string, ImageData>>(new Map())
  const highlightDataUrlRefs = useRef<Map<string, string>>(new Map())

  // Load mask image data for a placement
  const loadMaskForPlacement = useCallback((placementId: string, maskBase64: string, mimeType: string) => {
    if (maskImageDataRefs.current.has(placementId)) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      maskCanvasRefs.current.set(placementId, canvas)
      maskImageDataRefs.current.set(placementId, imageData)

      // Generate highlight overlay
      const highlightCanvas = document.createElement('canvas')
      highlightCanvas.width = img.width
      highlightCanvas.height = img.height
      const highlightCtx = highlightCanvas.getContext('2d')
      if (!highlightCtx) return

      const highlightData = highlightCtx.createImageData(img.width, img.height)

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i] ?? 0
        const g = imageData.data[i + 1] ?? 0
        const b = imageData.data[i + 2] ?? 0
        const brightness = (r + g + b) / 3

        if (brightness > 128) {
          highlightData.data[i] = 255
          highlightData.data[i + 1] = 255
          highlightData.data[i + 2] = 255
          highlightData.data[i + 3] = 40
        }
      }

      highlightCtx.putImageData(highlightData, 0, 0)
      highlightDataUrlRefs.current.set(placementId, highlightCanvas.toDataURL('image/png'))
    }
    img.src = `data:${mimeType};base64,${maskBase64}`
  }, [])

  // Load masks on mount
  useEffect(() => {
    readyPlacements.forEach(p => {
      if (p.maskImage) {
        loadMaskForPlacement(p.sceneId, p.maskImage, p.mimeType)
      }
    })
  }, [readyPlacements, loadMaskForPlacement])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Check if mouse is over product area using mask
  const isMouseOverProductArea = useCallback((placementId: string, mouseX: number, mouseY: number, cardRect: DOMRect): boolean => {
    const imageData = maskImageDataRefs.current.get(placementId)
    const canvas = maskCanvasRefs.current.get(placementId)
    if (!imageData || !canvas) return false

    // Calculate object-fit: cover cropping
    const cardAspect = cardRect.width / cardRect.height
    const imageAspect = canvas.width / canvas.height

    let visibleWidth: number, visibleHeight: number
    let offsetX = 0, offsetY = 0

    if (imageAspect > cardAspect) {
      visibleHeight = canvas.height
      visibleWidth = canvas.height * cardAspect
      offsetX = (canvas.width - visibleWidth) / 2
    } else {
      visibleWidth = canvas.width
      visibleHeight = canvas.width / cardAspect
      offsetY = (canvas.height - visibleHeight) / 2
    }

    const relX = (mouseX - cardRect.left) / cardRect.width
    const relY = (mouseY - cardRect.top) / cardRect.height
    const maskX = Math.floor(offsetX + relX * visibleWidth)
    const maskY = Math.floor(offsetY + relY * visibleHeight)

    if (maskX < 0 || maskX >= canvas.width || maskY < 0 || maskY >= canvas.height) {
      return false
    }

    const pixelIndex = (maskY * canvas.width + maskX) * 4
    const r = imageData.data[pixelIndex] ?? 0
    const g = imageData.data[pixelIndex + 1] ?? 0
    const b = imageData.data[pixelIndex + 2] ?? 0
    const brightness = (r + g + b) / 3

    return brightness > 128
  }, [])

  // Calculate product bounding box from mask
  const getProductBounds = useCallback((placementId: string, cardRect: DOMRect): { left: number; right: number; top: number; bottom: number } | null => {
    const imageData = maskImageDataRefs.current.get(placementId)
    const canvas = maskCanvasRefs.current.get(placementId)
    if (!imageData || !canvas) return null

    const cardAspect = cardRect.width / cardRect.height
    const imageAspect = canvas.width / canvas.height

    let visibleWidth: number, visibleHeight: number
    let offsetX = 0, offsetY = 0

    if (imageAspect > cardAspect) {
      visibleHeight = canvas.height
      visibleWidth = canvas.height * cardAspect
      offsetX = (canvas.width - visibleWidth) / 2
    } else {
      visibleWidth = canvas.width
      visibleHeight = canvas.width / cardAspect
      offsetY = (canvas.height - visibleHeight) / 2
    }

    let minX = canvas.width
    let maxX = 0
    let minY = canvas.height
    let maxY = 0

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const pixelIndex = (y * canvas.width + x) * 4
        const r = imageData.data[pixelIndex] ?? 0
        const g = imageData.data[pixelIndex + 1] ?? 0
        const b = imageData.data[pixelIndex + 2] ?? 0
        const brightness = (r + g + b) / 3

        if (brightness > 128) {
          if (x >= offsetX && x <= offsetX + visibleWidth &&
              y >= offsetY && y <= offsetY + visibleHeight) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
    }

    if (minX >= maxX || minY >= maxY) return null

    const screenX = (maskX: number) => cardRect.left + ((maskX - offsetX) / visibleWidth) * cardRect.width
    const screenY = (maskY: number) => cardRect.top + ((maskY - offsetY) / visibleHeight) * cardRect.height

    return {
      left: screenX(minX),
      right: screenX(maxX),
      top: screenY(minY),
      bottom: screenY(maxY),
    }
  }, [])

  // Handle mouse move over card
  const handleCardMouseMove = useCallback((placement: ScenePlacement, e: React.MouseEvent<HTMLDivElement>) => {
    if (!placement.selectedProduct) return

    const cardElement = e.currentTarget
    const rect = cardElement.getBoundingClientRect()

    const overProduct = isMouseOverProductArea(placement.sceneId, e.clientX, e.clientY, rect)

    if (overProduct) {
      setProductHoverPlacementId(placement.sceneId)

      // Cancel any pending hide timeout since we're over a product
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }

      // Only start a new show timeout if we don't already have one for this placement
      // or if there's already an active product for a DIFFERENT placement
      const shouldStartTimeout =
        (pendingPlacementRef.current !== placement.sceneId && !activeProduct) ||
        (activeProduct && activeProduct.placementId !== placement.sceneId)

      if (shouldStartTimeout) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        pendingPlacementRef.current = placement.sceneId

        hoverTimeoutRef.current = setTimeout(() => {
          // Verify this timeout is still relevant
          if (pendingPlacementRef.current !== placement.sceneId) return

          const bounds = getProductBounds(placement.sceneId, rect)
          if (bounds && placement.selectedProduct) {
            const product: Product = {
              id: placement.selectedProduct.id,
              name: placement.selectedProduct.name,
              brand: placement.selectedProduct.brand,
              price: 1200, // Placeholder price
              currency: 'USD',
              imageUrl: placement.selectedProduct.img,  // Use actual product image
            }
            setActiveProduct({
              product,
              position: { x: e.clientX, y: e.clientY },
              productBounds: bounds,
              placementId: placement.sceneId,
              sceneImageUrl: `data:${placement.mimeType};base64,${placement.composedImage}`,
            })
          }
          pendingPlacementRef.current = null
        }, 300)
      }
    } else {
      // Not over product area
      setProductHoverPlacementId(null)

      // Cancel any pending show timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
        pendingPlacementRef.current = null
      }

      // Only schedule hide if we're showing this placement's overlay and not click-locked
      if (!productClickLocked && activeProduct?.placementId === placement.sceneId) {
        if (!hideTimeoutRef.current) {
          hideTimeoutRef.current = setTimeout(() => {
            const overlayHovered = document.querySelector('.product-overlay:hover')
            if (!overlayHovered) {
              setActiveProduct(null)
            }
            hideTimeoutRef.current = null
          }, 150)
        }
      }
    }
  }, [isMouseOverProductArea, productClickLocked, getProductBounds, activeProduct])

  // Handle card click
  const handleCardClick = useCallback((placement: ScenePlacement, e: React.MouseEvent<HTMLDivElement>) => {
    if (!placement.selectedProduct) return

    const cardElement = e.currentTarget
    const rect = cardElement.getBoundingClientRect()

    const overProduct = isMouseOverProductArea(placement.sceneId, e.clientX, e.clientY, rect)

    if (overProduct) {
      e.stopPropagation()

      const bounds = getProductBounds(placement.sceneId, rect)
      if (bounds && placement.selectedProduct) {
        const product: Product = {
          id: placement.selectedProduct.id,
          name: placement.selectedProduct.name,
          brand: placement.selectedProduct.brand,
          price: 1200,
          currency: 'USD',
          imageUrl: placement.selectedProduct.img,  // Use actual product image
        }
        setActiveProduct({
          product,
          position: { x: e.clientX, y: e.clientY },
          productBounds: bounds,
          placementId: placement.sceneId,
          sceneImageUrl: `data:${placement.mimeType};base64,${placement.composedImage}`,
        })
        setProductClickLocked(true)

        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
        }
      }
    } else if (productClickLocked) {
      setActiveProduct(null)
      setProductClickLocked(false)
      setProductHoverPlacementId(null)
    }
  }, [isMouseOverProductArea, getProductBounds, productClickLocked])

  // Handle card mouse leave
  const handleCardMouseLeave = useCallback((placementId: string) => {
    // Cancel any pending show timeout for this card
    if (pendingPlacementRef.current === placementId) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      pendingPlacementRef.current = null
    }

    // Clear hover highlight
    setProductHoverPlacementId(null)

    // Only schedule hide if showing this placement and not click-locked
    if (!productClickLocked && activeProduct?.placementId === placementId) {
      // Cancel any existing hide timeout first
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
      hideTimeoutRef.current = setTimeout(() => {
        const overlayHovered = document.querySelector('.product-overlay:hover')
        if (!overlayHovered) {
          setActiveProduct(null)
        }
        hideTimeoutRef.current = null
      }, 200) // Slightly longer delay for card leave
    }
  }, [productClickLocked, activeProduct])

  // Click outside to dismiss popup
  useEffect(() => {
    if (!productClickLocked) return

    const handleClickOutside = (e: MouseEvent) => {
      const overlay = document.querySelector('.product-overlay')
      const target = e.target as Node

      if (!overlay?.contains(target)) {
        setActiveProduct(null)
        setProductClickLocked(false)
        setProductHoverPlacementId(null)
      }
    }

    const timeoutId = setTimeout(() => {
      window.addEventListener('click', handleClickOutside)
    }, 50)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('click', handleClickOutside)
    }
  }, [productClickLocked])

  // Shopping handlers
  const handleAddToBag = useCallback((product: Product) => {
    setBag(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, addedAt: new Date() }]
    })
    setActiveProduct(null)
    setProductClickLocked(false)
  }, [])

  const handleBuyNow = useCallback(() => {
    setActiveProduct(null)
    setProductClickLocked(false)
  }, [])

  const handleRemoveFromBag = useCallback((productId: string) => {
    setBag(prev => prev.filter(item => item.product.id !== productId))
  }, [])

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromBag(productId)
      return
    }
    setBag(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }, [handleRemoveFromBag])

  const bagTotal = bag.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const bagCount = bag.reduce((sum, item) => sum + item.quantity, 0)

  if (readyPlacements.length === 0) {
    return (
      <div className="console-preview-empty">
        <h3>No placements ready</h3>
        <p>Generate placements with products to preview the consumer experience</p>
        <button className="console-preview-close-btn" onClick={onClose}>
          Back to Test View
        </button>
      </div>
    )
  }

  return (
    <div className="console-preview">
      {/* Header */}
      <div className="console-preview-header">
        <h2>Consumer Preview</h2>
        <div className="console-preview-header-actions">
          <button
            className={`console-preview-bag-btn ${bagCount > 0 ? 'has-items' : ''}`}
            onClick={() => setShowBag(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {bagCount > 0 && <span className="bag-badge">{bagCount}</span>}
          </button>
          <button className="console-preview-close-btn" onClick={onClose}>
            Exit Preview
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="console-preview-gallery">
        {readyPlacements.map(placement => (
          <div
            key={placement.sceneId}
            className={`console-preview-card ${productHoverPlacementId === placement.sceneId ? 'over-product' : ''}`}
            onMouseMove={(e) => handleCardMouseMove(placement, e)}
            onMouseLeave={() => handleCardMouseLeave(placement.sceneId)}
            onClick={(e) => handleCardClick(placement, e)}
          >
            <img
              src={`data:${placement.mimeType};base64,${placement.composedImage}`}
              alt={placement.description}
              className="console-preview-image"
            />
            {/* Product highlight overlay */}
            {productHoverPlacementId === placement.sceneId && highlightDataUrlRefs.current.get(placement.sceneId) && (
              <img
                src={highlightDataUrlRefs.current.get(placement.sceneId)}
                alt=""
                className="console-preview-highlight"
              />
            )}
            {/* Product info badge */}
            {placement.selectedProduct && (
              <div className="console-preview-product-badge">
                {placement.selectedProduct.brand}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Product Overlay */}
      {activeProduct && (
        <ProductOverlay
          product={activeProduct.product}
          position={activeProduct.position}
          productBounds={activeProduct.productBounds}
          sceneImageUrl={activeProduct.sceneImageUrl}
          onAddToBag={() => handleAddToBag(activeProduct.product)}
          onBuyNow={handleBuyNow}
          onClose={() => {
            setActiveProduct(null)
            setProductClickLocked(false)
          }}
        />
      )}

      {/* Shopping Bag Sidebar */}
      {showBag && (
        <ShoppingBag
          items={bag}
          onClose={() => setShowBag(false)}
          onRemove={handleRemoveFromBag}
          onUpdateQuantity={handleUpdateQuantity}
          onCheckout={() => {
            setBag([])
          }}
          total={bagTotal}
        />
      )}
    </div>
  )
}
