/**
 * ConsumerGallery - Image-only scrollable gallery with product placement
 *
 * Features:
 * - Images only (no text cards)
 * - Subtle vertical drift, minimal horizontal movement
 * - Hover pauses card, full opacity, prevents fade
 * - Double-click expands image to right 2/3 of screen
 * - Mouse wheel scrolls through images (writing pane stays fixed)
 * - Fade zones at top/bottom 1/8 of screen
 * - Scroll position indicator on right
 * - Infinite scroll spawning new images
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'
import { ShoppingBag } from './ShoppingBag'
import { ProductOverlay } from './ProductOverlay'
import { PaymentScreen } from './PaymentScreen'
import type { Product, BagItem, PaymentInfo } from './ConsumerCanvas'
import { WritingPane } from './WritingPane'
import { ResizeDivider } from './ResizeDivider'
import './ConsumerGallery.css'

// Luxury brand product images (using web sources)
const LUXURY_PRODUCTS: Array<{
  id: string
  imageUrl: string
  maskUrl?: string
  product: Product
}> = [
  {
    id: 'lv-neverfull-1',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
    product: {
      id: 'lv-001',
      name: 'Neverfull MM',
      brand: 'Louis Vuitton',
      price: 2030,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80',
      description: 'Iconic tote in Monogram canvas',
    },
  },
  {
    id: 'gucci-marmont-1',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
    product: {
      id: 'gucci-001',
      name: 'GG Marmont Small Bag',
      brand: 'Gucci',
      price: 2350,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
      description: 'Matelassé leather with Double G',
    },
  },
  {
    id: 'chanel-classic-1',
    imageUrl: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80',
    product: {
      id: 'chanel-001',
      name: 'Classic Flap Bag',
      brand: 'Chanel',
      price: 8200,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&q=80',
      description: 'Lambskin with gold-tone hardware',
    },
  },
  {
    id: 'hermes-birkin-1',
    imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80',
    product: {
      id: 'hermes-001',
      name: 'Birkin 25',
      brand: 'Hermès',
      price: 12500,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&q=80',
      description: 'Togo leather in Étoupe',
    },
  },
  {
    id: 'dior-saddle-1',
    imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80',
    product: {
      id: 'dior-001',
      name: 'Saddle Bag',
      brand: 'Dior',
      price: 3800,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80',
      description: 'Blue oblique jacquard canvas',
    },
  },
  {
    id: 'prada-galleria-1',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    product: {
      id: 'prada-001',
      name: 'Galleria Saffiano',
      brand: 'Prada',
      price: 3200,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80',
      description: 'Saffiano leather tote',
    },
  },
  {
    id: 'bottega-cassette-1',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
    product: {
      id: 'bottega-001',
      name: 'Cassette Bag',
      brand: 'Bottega Veneta',
      price: 3100,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80',
      description: 'Intrecciato leather crossbody',
    },
  },
  {
    id: 'celine-triomphe-1',
    imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80',
    product: {
      id: 'celine-001',
      name: 'Triomphe Bag',
      brand: 'Celine',
      price: 2950,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&q=80',
      description: 'Shiny calfskin with clasp',
    },
  },
  {
    id: 'ysl-loulou-1',
    imageUrl: 'https://images.unsplash.com/photo-1575032617751-6ddec2089882?w=800&q=80',
    product: {
      id: 'ysl-001',
      name: 'Loulou Medium',
      brand: 'Saint Laurent',
      price: 2590,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1575032617751-6ddec2089882?w=400&q=80',
      description: '"Y" quilted leather',
    },
  },
  {
    id: 'fendi-baguette-1',
    imageUrl: 'https://images.unsplash.com/photo-1614179689702-355944cd0918?w=800&q=80',
    product: {
      id: 'fendi-001',
      name: 'Baguette',
      brand: 'Fendi',
      price: 3390,
      currency: 'USD',
      imageUrl: 'https://images.unsplash.com/photo-1614179689702-355944cd0918?w=400&q=80',
      description: 'FF embroidered fabric',
    },
  },
]

// Additional lifestyle images (no product attached)
const LIFESTYLE_IMAGES = [
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
]

interface ImageCard {
  id: string
  imageUrl: string
  product?: Product
  x: number
  y: number // Absolute Y position in scroll space
  vx: number
  vy: number
  opacity: number
  scale: number
  spawnTime: number
  isHovered: boolean
  isExpanded: boolean
  width: number
  height: number
}

interface ConsumerGalleryProps {
  debugMode?: boolean
}

let cardIdCounter = 0

export function ConsumerGallery({ debugMode = false }: ConsumerGalleryProps) {
  // Cards state
  const [cards, setCards] = useState<ImageCard[]>([])
  const [scrollOffset, setScrollOffset] = useState(0)
  const [totalHeight, setTotalHeight] = useState(2000) // Grows as we scroll
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  // Writing pane state
  const [writingPaneWidth, setWritingPaneWidth] = useState(() => {
    const saved = localStorage.getItem('consumer-writing-pane-width')
    return saved ? parseFloat(saved) : 33.33
  })
  const [userComposition, setUserComposition] = useState('')

  // Shopping state
  const [bag, setBag] = useState<BagItem[]>([])
  const [showBag, setShowBag] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(() => {
    const saved = localStorage.getItem('ephemeral-payment-info')
    return saved ? JSON.parse(saved) : null
  })
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  // Product hover state
  const [activeProduct, setActiveProduct] = useState<{
    product: Product
    position: { x: number; y: number }
    cardId: string
  } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const cardsRef = useRef<ImageCard[]>(cards)
  const scrollOffsetRef = useRef(scrollOffset)
  const usedProductIds = useRef<Set<string>>(new Set())
  const usedImageUrls = useRef<Set<string>>(new Set())

  cardsRef.current = cards
  scrollOffsetRef.current = scrollOffset

  // Create a new card
  const createCard = useCallback((y?: number): ImageCard => {
    // Decide if product card (60% chance) or lifestyle (40%)
    const useProduct = Math.random() < 0.6

    let imageUrl: string
    let product: Product | undefined

    if (useProduct) {
      // Find unused product
      const available = LUXURY_PRODUCTS.filter(p => !usedProductIds.current.has(p.id))
      if (available.length > 0) {
        const selected = available[Math.floor(Math.random() * available.length)]!
        imageUrl = selected.imageUrl
        product = selected.product
        usedProductIds.current.add(selected.id)
      } else {
        // All used, reset and pick random
        usedProductIds.current.clear()
        const selected = LUXURY_PRODUCTS[Math.floor(Math.random() * LUXURY_PRODUCTS.length)]!
        imageUrl = selected.imageUrl
        product = selected.product
        usedProductIds.current.add(selected.id)
      }
    } else {
      // Lifestyle image
      const available = LIFESTYLE_IMAGES.filter(url => !usedImageUrls.current.has(url))
      if (available.length > 0) {
        imageUrl = available[Math.floor(Math.random() * available.length)]!
        usedImageUrls.current.add(imageUrl)
      } else {
        usedImageUrls.current.clear()
        imageUrl = LIFESTYLE_IMAGES[Math.floor(Math.random() * LIFESTYLE_IMAGES.length)]!
        usedImageUrls.current.add(imageUrl)
      }
    }

    // Random size (aspect ratios)
    const widthOptions = [220, 260, 300, 340]
    const width = widthOptions[Math.floor(Math.random() * widthOptions.length)]!
    const heightRatio = 0.8 + Math.random() * 0.6 // 0.8 to 1.4
    const height = Math.floor(width * heightRatio)

    return {
      id: `card-${++cardIdCounter}`,
      imageUrl,
      product,
      x: 15 + Math.random() * 50, // 15-65% from left (within right 2/3)
      y: y ?? scrollOffsetRef.current + Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.02, // Very slow horizontal
      vy: (Math.random() - 0.5) * 0.08, // Slightly more vertical
      opacity: 0,
      scale: 1,
      spawnTime: Date.now(),
      isHovered: false,
      isExpanded: false,
      width,
      height,
    }
  }, [])

  // Initialize with cards
  useEffect(() => {
    const initialCards: ImageCard[] = []
    for (let i = 0; i < 8; i++) {
      const card = createCard(100 + i * 250 + Math.random() * 100)
      initialCards.push(card)
    }
    setCards(initialCards)
  }, [createCard])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now()

      setCards(prev => {
        return prev.map(card => {
          // Skip physics if hovered or expanded
          if (card.isHovered || card.isExpanded) {
            return { ...card, opacity: 1 }
          }

          let { x, y, vx, vy, opacity } = card
          const age = now - card.spawnTime

          // Fade in
          if (age < 600) {
            opacity = age / 600
          } else {
            opacity = 1
          }

          // Apply velocity (subtle drift)
          x += vx * 0.15
          y += vy * 0.15

          // Damping
          vx *= 0.998
          vy *= 0.998

          // Add tiny jiggle (more vertical)
          vx += (Math.random() - 0.5) * 0.003
          vy += (Math.random() - 0.5) * 0.008

          // Horizontal bounds (keep in right 2/3 area, accounting for writing pane)
          if (x < 5) { x = 5; vx = Math.abs(vx) * 0.3 }
          if (x > 85) { x = 85; vx = -Math.abs(vx) * 0.3 }

          return { ...card, x, y, vx, vy, opacity }
        })
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Infinite scroll - spawn new cards as user scrolls down
  useEffect(() => {
    const checkSpawn = () => {
      const viewportHeight = window.innerHeight
      const visibleBottom = scrollOffset + viewportHeight

      // If we're near the bottom of our content, spawn more
      if (visibleBottom > totalHeight - viewportHeight) {
        // Add more cards below
        const newCards: ImageCard[] = []
        for (let i = 0; i < 4; i++) {
          const card = createCard(totalHeight + i * 200 + Math.random() * 100)
          newCards.push(card)
        }
        setCards(prev => [...prev, ...newCards])
        setTotalHeight(prev => prev + 1000)
      }
    }
    checkSpawn()
  }, [scrollOffset, totalHeight, createCard])

  // Handle scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only scroll if mouse is in the image area (not writing pane)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const writingPaneEnd = rect.left + (rect.width * writingPaneWidth / 100)
    if (e.clientX < writingPaneEnd) return // In writing pane, let it scroll naturally

    e.preventDefault()
    setScrollOffset(prev => Math.max(0, prev + e.deltaY * 0.8))
  }, [writingPaneWidth])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Calculate visible Y position (accounting for scroll)
  const getVisibleY = (absoluteY: number) => absoluteY - scrollOffset

  // Calculate fade opacity based on position
  const getFadeOpacity = (visibleY: number, cardHeight: number) => {
    const viewportHeight = window.innerHeight
    const fadeZone = viewportHeight * 0.125 // 1/8 of screen

    const cardTop = visibleY
    const cardBottom = visibleY + cardHeight

    // Top fade zone
    if (cardTop < fadeZone) {
      return Math.max(0, cardTop / fadeZone)
    }
    // Bottom fade zone
    if (cardBottom > viewportHeight - fadeZone) {
      return Math.max(0, (viewportHeight - cardBottom + cardHeight) / fadeZone)
    }
    return 1
  }

  // Handle hover
  const handleCardMouseEnter = useCallback((cardId: string) => {
    setHoveredCardId(cardId)
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isHovered: true } : c))
  }, [])

  const handleCardMouseLeave = useCallback((cardId: string) => {
    // Delay to check if moved to product overlay
    setTimeout(() => {
      const overlayHovered = document.querySelector('.product-overlay:hover')
      if (!overlayHovered) {
        setHoveredCardId(null)
        setActiveProduct(null)
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, isHovered: false } : c))
      }
    }, 150)
  }, [])

  // Handle double click to expand
  const handleCardDoubleClick = useCallback((cardId: string) => {
    if (expandedCardId === cardId) {
      setExpandedCardId(null)
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, isExpanded: false } : c))
    } else {
      setExpandedCardId(cardId)
      setCards(prev => prev.map(c => ({
        ...c,
        isExpanded: c.id === cardId,
      })))
    }
  }, [expandedCardId])

  // Handle product hover
  const handleProductHover = useCallback((card: ImageCard, e: React.MouseEvent) => {
    if (!card.product) return

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)

    hoverTimeoutRef.current = setTimeout(() => {
      setActiveProduct({
        product: card.product!,
        position: { x: e.clientX, y: e.clientY },
        cardId: card.id,
      })
    }, 400) // Shorter delay for product cards
  }, [])

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
  }, [])

  const handleBuyNow = useCallback((product: Product) => {
    handleAddToBag(product)
    setShowPayment(true)
  }, [handleAddToBag])

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

  const handleSavePaymentInfo = useCallback((info: PaymentInfo) => {
    setPaymentInfo(info)
    localStorage.setItem('ephemeral-payment-info', JSON.stringify(info))
  }, [])

  const handleCompletePurchase = useCallback(() => {
    setPurchaseSuccess(true)
    setBag([])
    setTimeout(() => {
      setPurchaseSuccess(false)
      setShowPayment(false)
    }, 3000)
  }, [])

  const bagTotal = bag.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const bagCount = bag.reduce((sum, item) => sum + item.quantity, 0)

  // Writing pane resize
  const handleWritingPaneResize = useCallback((deltaX: number) => {
    const containerWidth = window.innerWidth
    const deltaPercent = (deltaX / containerWidth) * 100
    setWritingPaneWidth(prev => Math.max(20, Math.min(45, prev + deltaPercent)))
  }, [])

  const handleWritingPaneResizeEnd = useCallback(() => {
    localStorage.setItem('consumer-writing-pane-width', writingPaneWidth.toString())
  }, [writingPaneWidth])

  // Scroll indicator position (0-1)
  const scrollIndicatorPos = totalHeight > 0 ? scrollOffset / Math.max(1, totalHeight - window.innerHeight) : 0

  // Filter visible cards
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const visibleCards = cards.filter(card => {
    if (card.isExpanded) return true
    const visibleY = getVisibleY(card.y)
    return visibleY > -card.height && visibleY < viewportHeight + card.height
  })

  return (
    <div className="consumer-gallery" ref={containerRef}>
      {/* Writing Pane */}
      <WritingPane
        value={userComposition}
        onChange={setUserComposition}
        width={writingPaneWidth}
        title="Your Mood"
        placeholder="Describe the vibe you're looking for..."
        accentColor="#c9a227"
        background="rgba(30, 28, 26, 0.95)"
        textColor="#e8e4d9"
        titleColor="rgba(255, 255, 255, 0.6)"
      />

      {/* Resize Divider */}
      <ResizeDivider
        onDrag={handleWritingPaneResize}
        onDragEnd={handleWritingPaneResizeEnd}
        onDoubleClick={() => setWritingPaneWidth(33.33)}
      />

      {/* Image Gallery Area */}
      <div className="gallery-container" style={{ left: `${writingPaneWidth}%` }}>
        {/* Background gradient */}
        <div className="gallery-background" />

        {/* Top fade zone */}
        <div className="fade-zone fade-zone-top" />

        {/* Bottom fade zone */}
        <div className="fade-zone fade-zone-bottom" />

        {/* Cards */}
        {visibleCards.map(card => {
          const visibleY = getVisibleY(card.y)
          const fadeOpacity = card.isExpanded ? 1 : getFadeOpacity(visibleY, card.height)
          const finalOpacity = card.opacity * fadeOpacity

          if (card.isExpanded) {
            // Expanded view - takes right 2/3 of screen
            return (
              <div
                key={card.id}
                className="expanded-card-overlay"
                onClick={() => handleCardDoubleClick(card.id)}
              >
                <div
                  className="expanded-card"
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="expanded-card-image"
                    onMouseMove={e => card.product && handleProductHover(card, e)}
                  />
                  {card.product && (
                    <div className="expanded-product-hint">
                      Hover over the product for details
                    </div>
                  )}
                  <button
                    className="expanded-close-btn"
                    onClick={() => handleCardDoubleClick(card.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div
              key={card.id}
              className={clsx(
                'gallery-card',
                card.isHovered && 'hovered',
                card.product && 'has-product'
              )}
              style={{
                left: `${card.x}%`,
                top: visibleY,
                width: card.width,
                height: card.height,
                opacity: finalOpacity,
                transform: `translate(-50%, 0) scale(${card.isHovered ? 1.02 : card.scale})`,
              }}
              onMouseEnter={() => handleCardMouseEnter(card.id)}
              onMouseLeave={() => handleCardMouseLeave(card.id)}
              onDoubleClick={() => handleCardDoubleClick(card.id)}
              onMouseMove={e => card.product && card.isHovered && handleProductHover(card, e)}
            >
              <img
                src={card.imageUrl}
                alt=""
                className="gallery-card-image"
                loading="lazy"
              />
              {card.product && (
                <div className="product-badge">{card.product.brand}</div>
              )}
            </div>
          )
        })}

        {/* Shopping Bag Button */}
        <button
          className={clsx('bag-button', bagCount > 0 && 'has-items')}
          onClick={() => setShowBag(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {bagCount > 0 && <span className="bag-badge">{bagCount}</span>}
        </button>

        {/* Scroll Position Indicator */}
        <div className="scroll-indicator">
          <div className="scroll-track">
            <div
              className="scroll-thumb"
              style={{ top: `${scrollIndicatorPos * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Product Overlay */}
      {activeProduct && (
        <ProductOverlay
          product={activeProduct.product}
          position={activeProduct.position}
          onAddToBag={() => handleAddToBag(activeProduct.product)}
          onBuyNow={() => handleBuyNow(activeProduct.product)}
          onClose={() => setActiveProduct(null)}
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

      {/* Debug mode indicator */}
      {debugMode && (
        <div className="debug-badge">
          Debug | Scroll: {Math.round(scrollOffset)} | Cards: {cards.length}
        </div>
      )}
    </div>
  )
}

export default ConsumerGallery
