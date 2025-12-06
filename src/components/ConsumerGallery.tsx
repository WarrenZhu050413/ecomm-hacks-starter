/**
 * ConsumerGallery - Image-only scrollable gallery with mask-based product hover
 *
 * Features:
 * - Images only (no text cards) - AI-generated scenes with products placed
 * - Mask-based hover detection (only hover on product area triggers popup)
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

// Gallery item from manifest
interface GalleryItem {
  id: string
  sceneUrl: string
  maskUrl: string
  productImageUrl: string
  product: Product
}

// Load manifest data - 13 gallery items
const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "gallery-0",
    sceneUrl: "/gallery/scene_0.png",
    maskUrl: "/gallery/mask_0.png",
    productImageUrl: "/gallery/product_0.jpg",
    product: {
      id: "product-0",
      name: "Neverfull MM",
      brand: "Louis Vuitton",
      price: 2030,
      currency: "USD",
      imageUrl: "/gallery/product_0.jpg",
    }
  },
  {
    id: "gallery-1",
    sceneUrl: "/gallery/scene_1.png",
    maskUrl: "/gallery/mask_1.png",
    productImageUrl: "/gallery/product_1.jpg",
    product: {
      id: "product-1",
      name: "GG Marmont",
      brand: "Gucci",
      price: 2350,
      currency: "USD",
      imageUrl: "/gallery/product_1.jpg",
    }
  },
  {
    id: "gallery-2",
    sceneUrl: "/gallery/scene_2.png",
    maskUrl: "/gallery/mask_2.png",
    productImageUrl: "/gallery/product_2.jpg",
    product: {
      id: "product-2",
      name: "Classic Flap",
      brand: "Chanel",
      price: 8200,
      currency: "USD",
      imageUrl: "/gallery/product_2.jpg",
    }
  },
  {
    id: "gallery-3",
    sceneUrl: "/gallery/scene_3.png",
    maskUrl: "/gallery/mask_3.png",
    productImageUrl: "/gallery/product_3.jpg",
    product: {
      id: "product-3",
      name: "Galleria Saffiano",
      brand: "Prada",
      price: 3200,
      currency: "USD",
      imageUrl: "/gallery/product_3.jpg",
    }
  },
  {
    id: "gallery-4",
    sceneUrl: "/gallery/scene_4.png",
    maskUrl: "/gallery/mask_4.png",
    productImageUrl: "/gallery/product_4.jpg",
    product: {
      id: "product-4",
      name: "Loulou Medium",
      brand: "Saint Laurent",
      price: 2590,
      currency: "USD",
      imageUrl: "/gallery/product_4.jpg",
    }
  },
  {
    id: "gallery-5",
    sceneUrl: "/gallery/scene_5.png",
    maskUrl: "/gallery/mask_5.png",
    productImageUrl: "/gallery/product_5.jpg",
    product: {
      id: "product-5",
      name: "Triomphe Bag",
      brand: "Celine",
      price: 2950,
      currency: "USD",
      imageUrl: "/gallery/product_5.jpg",
    }
  },
  {
    id: "gallery-6",
    sceneUrl: "/gallery/scene_6.png",
    maskUrl: "/gallery/mask_6.png",
    productImageUrl: "/gallery/product_6.jpg",
    product: {
      id: "product-6",
      name: "Le Pliage",
      brand: "Longchamp",
      price: 145,
      currency: "USD",
      imageUrl: "/gallery/product_6.jpg",
    }
  },
  {
    id: "gallery-7",
    sceneUrl: "/gallery/scene_7.png",
    maskUrl: "/gallery/mask_7.png",
    productImageUrl: "/gallery/product_7.jpg",
    product: {
      id: "product-7",
      name: "Puzzle Bag",
      brand: "Loewe",
      price: 3650,
      currency: "USD",
      imageUrl: "/gallery/product_7.jpg",
    }
  },
  {
    id: "gallery-8",
    sceneUrl: "/gallery/scene_8.png",
    maskUrl: "/gallery/mask_8.png",
    productImageUrl: "/gallery/product_8.jpg",
    product: {
      id: "product-8",
      name: "Dionysus",
      brand: "Gucci",
      price: 2980,
      currency: "USD",
      imageUrl: "/gallery/product_8.jpg",
    }
  },
  {
    id: "gallery-9",
    sceneUrl: "/gallery/scene_9.png",
    maskUrl: "/gallery/mask_9.png",
    productImageUrl: "/gallery/product_9.jpg",
    product: {
      id: "product-9",
      name: "Peekaboo ISeeU",
      brand: "Fendi",
      price: 4200,
      currency: "USD",
      imageUrl: "/gallery/product_9.jpg",
    }
  },
  {
    id: "gallery-10",
    sceneUrl: "/gallery/scene_10.png",
    maskUrl: "/gallery/mask_10.png",
    productImageUrl: "/gallery/product_10.jpg",
    product: {
      id: "product-10",
      name: "Speedy Bandouliere",
      brand: "Louis Vuitton",
      price: 1640,
      currency: "USD",
      imageUrl: "/gallery/product_10.jpg",
    }
  },
  {
    id: "gallery-11",
    sceneUrl: "/gallery/scene_11.png",
    maskUrl: "/gallery/mask_11.png",
    productImageUrl: "/gallery/product_11.jpg",
    product: {
      id: "product-11",
      name: "Lady Dior",
      brand: "Dior",
      price: 5500,
      currency: "USD",
      imageUrl: "/gallery/product_11.jpg",
    }
  },
  {
    id: "gallery-12",
    sceneUrl: "/gallery/scene_12.png",
    maskUrl: "/gallery/mask_12.png",
    productImageUrl: "/gallery/product_12.jpg",
    product: {
      id: "product-12",
      name: "Cabas Phantom",
      brand: "Celine",
      price: 2100,
      currency: "USD",
      imageUrl: "/gallery/product_12.jpg",
    }
  },
]

interface ImageCard {
  id: string
  galleryItem: GalleryItem
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
  const [totalHeight, setTotalHeight] = useState(2500)
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
  const [productHoverCardId, setProductHoverCardId] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Drag state
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; cardX: number; cardY: number } | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const scrollOffsetRef = useRef(scrollOffset)
  const usedGalleryIds = useRef<Set<string>>(new Set())

  // Mask canvas refs for hover detection
  const maskCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const maskImageDataRefs = useRef<Map<string, ImageData>>(new Map())

  scrollOffsetRef.current = scrollOffset

  // Check if a new card would overlap with existing cards
  const wouldOverlap = useCallback((newX: number, newY: number, newHeight: number, existingCards: ImageCard[]): boolean => {
    const padding = 40
    for (const card of existingCards) {
      const horizontalDistance = Math.abs(card.x - newX)
      if (horizontalDistance < 22) {
        const verticalDistance = Math.abs(card.y - newY)
        const combinedHeight = (card.height + newHeight) / 2 + padding
        if (verticalDistance < combinedHeight) {
          return true
        }
      }
    }
    return false
  }, [])

  // Create a new card with non-overlapping placement
  const createCard = useCallback((y?: number, existingCards?: ImageCard[]): ImageCard | null => {
    // Find unused gallery item
    const available = GALLERY_ITEMS.filter(item => !usedGalleryIds.current.has(item.id))
    if (available.length === 0) {
      // All used, reset
      usedGalleryIds.current.clear()
    }

    const items = available.length > 0 ? available : GALLERY_ITEMS
    const galleryItem = items[Math.floor(Math.random() * items.length)]!
    usedGalleryIds.current.add(galleryItem.id)

    // Smaller card sizes for higher density
    const widthOptions = [200, 240, 260]
    const width = widthOptions[Math.floor(Math.random() * widthOptions.length)]!
    const heightRatio = 0.65 + Math.random() * 0.25 // 0.65 to 0.9 (landscape oriented)
    const height = Math.floor(width * heightRatio)

    // Find a non-overlapping position using columns
    let x: number
    let cardY = y ?? scrollOffsetRef.current + Math.random() * window.innerHeight
    let attempts = 0
    const maxAttempts = 20

    // Use 4 columns for higher density, with hard padding from edges
    // Columns positioned so cards stay fully visible (accounting for card width)
    const columns = [18, 38, 58, 78] // 4 columns, spaced evenly

    do {
      const columnIndex = Math.floor(Math.random() * columns.length)
      x = columns[columnIndex]! + (Math.random() - 0.5) * 8

      // Clamp to ensure cards don't get cut off at edges
      // Card is centered at x%, so need to account for half-width
      const minX = 12 // Hard left boundary
      const maxX = 88 // Hard right boundary
      x = Math.max(minX, Math.min(maxX, x))

      if (attempts > maxAttempts / 2 && existingCards) {
        cardY += 80 + Math.random() * 40
      }
      attempts++
    } while (existingCards && wouldOverlap(x, cardY, height, existingCards) && attempts < maxAttempts)

    return {
      id: `card-${++cardIdCounter}`,
      galleryItem,
      x,
      y: cardY,
      vx: (Math.random() - 0.5) * 0.01,
      vy: (Math.random() - 0.5) * 0.04,
      opacity: 0,
      scale: 1,
      spawnTime: Date.now(),
      isHovered: false,
      isExpanded: false,
      width,
      height,
    }
  }, [wouldOverlap])

  // Load mask image data for a card
  const loadMaskForCard = useCallback((cardId: string, maskUrl: string) => {
    if (maskImageDataRefs.current.has(cardId)) return

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

      maskCanvasRefs.current.set(cardId, canvas)
      maskImageDataRefs.current.set(cardId, imageData)
    }
    img.src = maskUrl
  }, [])

  // Check if mouse is over product area using mask
  const isMouseOverProductArea = useCallback((cardId: string, mouseX: number, mouseY: number, cardRect: DOMRect): boolean => {
    const imageData = maskImageDataRefs.current.get(cardId)
    const canvas = maskCanvasRefs.current.get(cardId)
    if (!imageData || !canvas) return false

    // Map mouse position to mask coordinates
    const scaleX = canvas.width / cardRect.width
    const scaleY = canvas.height / cardRect.height
    const maskX = Math.floor((mouseX - cardRect.left) * scaleX)
    const maskY = Math.floor((mouseY - cardRect.top) * scaleY)

    // Bounds check
    if (maskX < 0 || maskX >= canvas.width || maskY < 0 || maskY >= canvas.height) {
      return false
    }

    // Get pixel brightness
    const pixelIndex = (maskY * canvas.width + maskX) * 4
    const r = imageData.data[pixelIndex] ?? 0
    const g = imageData.data[pixelIndex + 1] ?? 0
    const b = imageData.data[pixelIndex + 2] ?? 0
    const brightness = (r + g + b) / 3

    return brightness > 128 // White = product area
  }, [])

  // Initialize with cards (higher density)
  useEffect(() => {
    const initialCards: ImageCard[] = []
    for (let i = 0; i < 12; i++) {
      const yBase = 40 + i * 200 // Tighter vertical spacing
      const card = createCard(yBase + Math.random() * 50, initialCards)
      if (card) {
        initialCards.push(card)
        // Load mask for hover detection
        loadMaskForCard(card.id, card.galleryItem.maskUrl)
      }
    }
    setCards(initialCards)
  }, [createCard, loadMaskForCard])

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
          if (age < 800) {
            opacity = age / 800
          } else {
            opacity = 1
          }

          // Apply velocity (very subtle drift)
          x += vx * 0.1
          y += vy * 0.1

          // Damping
          vx *= 0.999
          vy *= 0.999

          // Add tiny jiggle (mostly vertical)
          vx += (Math.random() - 0.5) * 0.002
          vy += (Math.random() - 0.5) * 0.005

          // Horizontal bounds
          if (x < 8) { x = 8; vx = Math.abs(vx) * 0.2 }
          if (x > 88) { x = 88; vx = -Math.abs(vx) * 0.2 }

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

      if (visibleBottom > totalHeight - viewportHeight) {
        setCards(prev => {
          const newCards: ImageCard[] = [...prev]
          for (let i = 0; i < 6; i++) { // Spawn more cards at once
            const yBase = totalHeight + i * 200 // Tighter spacing
            const card = createCard(yBase + Math.random() * 50, newCards)
            if (card) {
              newCards.push(card)
              loadMaskForCard(card.id, card.galleryItem.maskUrl)
            }
          }
          return newCards
        })
        setTotalHeight(prev => prev + 1400)
      }
    }
    checkSpawn()
  }, [scrollOffset, totalHeight, createCard, loadMaskForCard])

  // Handle Escape key to close expanded view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedCardId) {
        setExpandedCardId(null)
        setCards(prev => prev.map(c => ({ ...c, isExpanded: false })))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expandedCardId])

  // Handle scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const writingPaneEnd = rect.left + (rect.width * writingPaneWidth / 100)
    if (e.clientX < writingPaneEnd) return

    e.preventDefault()
    setScrollOffset(prev => Math.max(0, prev + e.deltaY * 0.8))
  }, [writingPaneWidth])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Calculate visible Y position
  const getVisibleY = (absoluteY: number) => absoluteY - scrollOffset

  // Calculate fade opacity based on position
  const getFadeOpacity = (visibleY: number, cardHeight: number) => {
    const viewportHeight = window.innerHeight
    const fadeZone = viewportHeight * 0.125

    const cardTop = visibleY
    const cardBottom = visibleY + cardHeight

    if (cardTop < fadeZone) {
      return Math.max(0, cardTop / fadeZone)
    }
    if (cardBottom > viewportHeight - fadeZone) {
      return Math.max(0, (viewportHeight - cardBottom + cardHeight) / fadeZone)
    }
    return 1
  }

  // Handle hover
  const handleCardMouseEnter = useCallback((cardId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, isHovered: true } : c))
  }, [])

  const handleCardMouseLeave = useCallback((cardId: string) => {
    setTimeout(() => {
      const overlayHovered = document.querySelector('.product-overlay:hover')
      if (!overlayHovered) {
        setActiveProduct(null)
        setProductHoverCardId(null)
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, isHovered: false } : c))
      }
    }, 150)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  // Handle mouse move over card for mask detection
  const handleCardMouseMove = useCallback((card: ImageCard, e: React.MouseEvent<HTMLDivElement>) => {
    const cardElement = e.currentTarget
    const rect = cardElement.getBoundingClientRect()

    const overProduct = isMouseOverProductArea(card.id, e.clientX, e.clientY, rect)

    // Update product hover state for visual feedback
    if (overProduct) {
      setProductHoverCardId(card.id)
    } else {
      setProductHoverCardId(null)
    }

    if (overProduct) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)

      hoverTimeoutRef.current = setTimeout(() => {
        setActiveProduct({
          product: card.galleryItem.product,
          position: { x: e.clientX, y: e.clientY },
          cardId: card.id,
        })
      }, 600) // 600ms delay before showing product card
    } else {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      // Only clear if not hovering on overlay
      setTimeout(() => {
        const overlayHovered = document.querySelector('.product-overlay:hover')
        if (!overlayHovered) {
          setActiveProduct(null)
        }
      }, 100)
    }
  }, [isMouseOverProductArea])

  // Handle double click to expand
  const handleCardDoubleClick = useCallback((cardId: string) => {
    if (draggingCardId) return // Don't expand while dragging
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
  }, [expandedCardId, draggingCardId])

  // Drag handlers
  const handleDragStart = useCallback((cardId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    setDraggingCardId(cardId)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cardX: card.x,
      cardY: card.y,
    }
  }, [cards])

  const handleDragMove = useCallback((e: MouseEvent) => {
    const dragStart = dragStartRef.current
    if (!dragStart) return

    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    const galleryWidth = containerRect.width * (1 - writingPaneWidth / 100)
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    // Convert pixel delta to percentage (relative to gallery area)
    const deltaXPercent = (deltaX / galleryWidth) * 100

    setCards(prev => prev.map(card => {
      if (card.id !== draggingCardId) return card

      let newX = dragStart.cardX + deltaXPercent
      let newY = dragStart.cardY + deltaY

      // Clamp to hard boundaries
      newX = Math.max(12, Math.min(88, newX))

      return {
        ...card,
        x: newX,
        y: newY,
        vx: 0,
        vy: 0,
      }
    }))
  }, [draggingCardId, writingPaneWidth])

  const handleDragEnd = useCallback(() => {
    setDraggingCardId(null)
    dragStartRef.current = null
  }, [])

  // Add global mouse listeners for drag
  useEffect(() => {
    if (draggingCardId) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [draggingCardId, handleDragMove, handleDragEnd])

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

  // Scroll indicator position
  const scrollIndicatorPos = totalHeight > 0 ? scrollOffset / Math.max(1, totalHeight - window.innerHeight) : 0

  // Filter visible cards
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const visibleCards = cards.filter(card => {
    if (card.isExpanded) return true
    const visibleY = getVisibleY(card.y)
    return visibleY > -card.height - 100 && visibleY < viewportHeight + 100
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
            return (
              <div
                key={card.id}
                className="expanded-card-overlay"
                onClick={() => handleCardDoubleClick(card.id)}
              >
                <div
                  className="expanded-card"
                  onClick={e => e.stopPropagation()}
                  onMouseMove={e => handleCardMouseMove(card, e)}
                  onMouseLeave={() => handleCardMouseLeave(card.id)}
                >
                  <img
                    src={card.galleryItem.sceneUrl}
                    alt=""
                    className="expanded-card-image"
                  />
                  <div className="expanded-esc-hint">esc</div>
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
                productHoverCardId === card.id && 'over-product',
                draggingCardId === card.id && 'dragging'
              )}
              style={{
                left: `${card.x}%`,
                top: visibleY,
                width: card.width,
                height: card.height,
                opacity: finalOpacity,
                transform: `translate(-50%, 0) scale(${draggingCardId === card.id ? 1.05 : card.isHovered ? 1.02 : card.scale})`,
                zIndex: draggingCardId === card.id ? 100 : undefined,
                cursor: draggingCardId === card.id ? 'grabbing' : 'grab',
              }}
              onMouseEnter={() => handleCardMouseEnter(card.id)}
              onMouseLeave={() => handleCardMouseLeave(card.id)}
              onDoubleClick={() => handleCardDoubleClick(card.id)}
              onMouseMove={e => handleCardMouseMove(card, e)}
              onMouseDown={e => handleDragStart(card.id, e)}
            >
              <img
                src={card.galleryItem.sceneUrl}
                alt=""
                className="gallery-card-image"
                loading="lazy"
                draggable={false}
              />
              <div className="product-badge">{card.galleryItem.product.brand}</div>
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
          Debug | Scroll: {Math.round(scrollOffset)} | Cards: {cards.length} | Over Product: {productHoverCardId ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  )
}

export default ConsumerGallery
