/**
 * ConsumerCanvas - Main consumer-facing interface with product discovery
 *
 * Features:
 * - Floating cards with integrated product placements
 * - Mask-based hover detection for products
 * - Glassmorphic product overlay (Add to Bag / Buy Now)
 * - Shopping bag with checkout flow
 * - Debug mode toggle (/debug suffix)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'
import { ShoppingBag } from './ShoppingBag'
import { ProductOverlay } from './ProductOverlay'
import { PaymentScreen } from './PaymentScreen'
import './ConsumerCanvas.css'

// Types
export interface Product {
  id: string
  name: string
  brand: string
  price: number
  currency: string
  imageUrl: string
  description?: string
}

export interface AdvertiserImageSet {
  id: string
  sceneImageUrl: string      // The integrated scene with product
  maskImageUrl: string       // White = product area for hit detection
  product: Product
  originalBackgroundUrl?: string
}

export interface BagItem {
  product: Product
  quantity: number
  addedAt: Date
}

export interface PaymentInfo {
  cardNumber: string
  cardHolder: string
  expiry: string
  cvv: string
  address: string
  city: string
  zip: string
  country: string
}

// Sample advertiser data (pre-approved image sets)
const SAMPLE_ADVERTISER_SETS: AdvertiserImageSet[] = [
  {
    id: 'prada-cafe-1',
    sceneImageUrl: '/prototypes/product-outline-integration/integrated_scene.png',
    maskImageUrl: '/prototypes/product-outline-integration/mask.png',
    product: {
      id: 'prada-galleria',
      name: 'Galleria Saffiano Bag',
      brand: 'Prada',
      price: 3200,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=300&fit=crop',
      description: 'Iconic saffiano leather tote with gold hardware'
    }
  },
  {
    id: 'lv-paris-1',
    sceneImageUrl: '/prototypes/product-outline-integration/integrated_scene_0.png',
    maskImageUrl: '/prototypes/product-outline-integration/mask_0.png',
    product: {
      id: 'lv-neverfull',
      name: 'Neverfull MM',
      brand: 'Louis Vuitton',
      price: 2030,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=300&fit=crop',
      description: 'Monogram canvas tote with removable pouch'
    }
  }
]

interface ConsumerCanvasProps {
  debugMode?: boolean
  advertiserSets?: AdvertiserImageSet[]
}

export default function ConsumerCanvas({
  debugMode = false,
  advertiserSets = SAMPLE_ADVERTISER_SETS
}: ConsumerCanvasProps) {
  // State
  const [bag, setBag] = useState<BagItem[]>([])
  const [showBag, setShowBag] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [activeProduct, setActiveProduct] = useState<{
    product: Product
    position: { x: number; y: number }
  } | null>(null)
  const [hoveredSetId, setHoveredSetId] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(() => {
    const saved = localStorage.getItem('ephemeral-payment-info')
    return saved ? JSON.parse(saved) : null
  })
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  // Refs for mask canvases (one per advertiser set)
  const maskCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const maskImageDataRefs = useRef<Map<string, ImageData>>(new Map())
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const HOVER_DELAY = 800 // ms before showing product card

  // Load mask images into canvases for hit detection
  useEffect(() => {
    advertiserSets.forEach(set => {
      const canvas = document.createElement('canvas')
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          maskCanvasRefs.current.set(set.id, canvas)
          maskImageDataRefs.current.set(set.id, imageData)
        }
      }
      img.src = set.maskImageUrl
    })
  }, [advertiserSets])

  // Check if mouse is over product area using mask
  const isMouseOverProduct = useCallback((
    setId: string,
    mouseX: number,
    mouseY: number,
    imageRect: DOMRect
  ): boolean => {
    const maskData = maskImageDataRefs.current.get(setId)
    const canvas = maskCanvasRefs.current.get(setId)
    if (!maskData || !canvas) return false

    // Map mouse position to mask coordinates
    const scaleX = canvas.width / imageRect.width
    const scaleY = canvas.height / imageRect.height
    const maskX = Math.floor((mouseX - imageRect.left) * scaleX)
    const maskY = Math.floor((mouseY - imageRect.top) * scaleY)

    // Bounds check
    if (maskX < 0 || maskX >= canvas.width || maskY < 0 || maskY >= canvas.height) {
      return false
    }

    // Get pixel brightness (white = product)
    const pixelIndex = (maskY * canvas.width + maskX) * 4
    const r = maskData.data[pixelIndex] ?? 0
    const g = maskData.data[pixelIndex + 1] ?? 0
    const b = maskData.data[pixelIndex + 2] ?? 0
    const brightness = (r + g + b) / 3

    return brightness > 128
  }, [])

  // Handle mouse move over scene
  const handleSceneMouseMove = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    set: AdvertiserImageSet
  ) => {
    const imageEl = e.currentTarget.querySelector('img')
    if (!imageEl) return

    const rect = imageEl.getBoundingClientRect()
    const overProduct = isMouseOverProduct(set.id, e.clientX, e.clientY, rect)

    if (overProduct && hoveredSetId !== set.id) {
      // Started hovering over product
      setHoveredSetId(set.id)

      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }

      // Set timeout for showing product card
      hoverTimeoutRef.current = setTimeout(() => {
        setActiveProduct({
          product: set.product,
          position: { x: e.clientX, y: e.clientY }
        })
      }, HOVER_DELAY)
    } else if (!overProduct && hoveredSetId === set.id) {
      // Left product area
      setHoveredSetId(null)
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      // Don't hide immediately - allow moving to the card
    }

    // Update position if active
    if (activeProduct && hoveredSetId === set.id) {
      setActiveProduct(prev => prev ? {
        ...prev,
        position: { x: e.clientX, y: e.clientY }
      } : null)
    }
  }, [isMouseOverProduct, hoveredSetId, activeProduct])

  // Handle mouse leave scene
  const handleSceneMouseLeave = useCallback(() => {
    // Small delay to allow moving to product card
    setTimeout(() => {
      if (!document.querySelector('.product-overlay:hover')) {
        setHoveredSetId(null)
        setActiveProduct(null)
      }
    }, 100)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  // Add to bag
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
    setHoveredSetId(null)
  }, [])

  // Buy now - go directly to checkout
  const handleBuyNow = useCallback((product: Product) => {
    handleAddToBag(product)
    setShowPayment(true)
  }, [handleAddToBag])

  // Remove from bag
  const handleRemoveFromBag = useCallback((productId: string) => {
    setBag(prev => prev.filter(item => item.product.id !== productId))
  }, [])

  // Update quantity
  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromBag(productId)
      return
    }
    setBag(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ))
  }, [handleRemoveFromBag])

  // Save payment info
  const handleSavePaymentInfo = useCallback((info: PaymentInfo) => {
    setPaymentInfo(info)
    localStorage.setItem('ephemeral-payment-info', JSON.stringify(info))
  }, [])

  // Complete purchase
  const handleCompletePurchase = useCallback(() => {
    setPurchaseSuccess(true)
    setBag([])
    setTimeout(() => {
      setPurchaseSuccess(false)
      setShowPayment(false)
    }, 3000)
  }, [])

  // Calculate totals
  const bagTotal = bag.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const bagCount = bag.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="consumer-canvas">
      {/* Header with bag icon */}
      <header className="consumer-header">
        <div className="header-left">
          <h1 className="header-title">Ephemeral</h1>
          {debugMode && <span className="debug-badge">Debug Mode</span>}
        </div>
        <button
          className="bag-button"
          onClick={() => setShowBag(true)}
        >
          <svg className="bag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {bagCount > 0 && <span className="bag-count">{bagCount}</span>}
        </button>
      </header>

      {/* Main content - Grid of scenes */}
      <main className="scenes-grid">
        {advertiserSets.map(set => (
          <div
            key={set.id}
            className={clsx('scene-card', hoveredSetId === set.id && 'hovered')}
            onMouseMove={(e) => handleSceneMouseMove(e, set)}
            onMouseLeave={handleSceneMouseLeave}
          >
            <img
              src={set.sceneImageUrl}
              alt="Lifestyle scene"
              className="scene-image"
            />

            {/* Subtle highlight overlay when hovered */}
            {hoveredSetId === set.id && (
              <div className="scene-highlight" />
            )}

            {debugMode && (
              <div className="debug-overlay">
                <span>Set: {set.id}</span>
                <span>Product: {set.product.name}</span>
              </div>
            )}
          </div>
        ))}
      </main>

      {/* Product Overlay - appears on hover */}
      {activeProduct && (
        <ProductOverlay
          product={activeProduct.product}
          position={activeProduct.position}
          onAddToBag={() => handleAddToBag(activeProduct.product)}
          onBuyNow={() => handleBuyNow(activeProduct.product)}
          onClose={() => {
            setActiveProduct(null)
            setHoveredSetId(null)
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
            setShowBag(false)
            setShowPayment(true)
          }}
          total={bagTotal}
        />
      )}

      {/* Payment Screen */}
      {showPayment && (
        <PaymentScreen
          items={bag}
          total={bagTotal}
          savedInfo={paymentInfo}
          onSaveInfo={handleSavePaymentInfo}
          onComplete={handleCompletePurchase}
          onClose={() => setShowPayment(false)}
          success={purchaseSuccess}
        />
      )}

      {/* Debug Controls */}
      {debugMode && (
        <div className="debug-controls">
          <h3>Debug Controls</h3>
          <div className="debug-info">
            <p>Hover delay: {HOVER_DELAY}ms</p>
            <p>Active sets: {advertiserSets.length}</p>
            <p>Bag items: {bagCount}</p>
            <p>Hovered: {hoveredSetId || 'none'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
