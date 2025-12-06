/**
 * EphemeralCanvas - Unified floating card canvas with API integration
 *
 * Features:
 * - Schema-driven card rendering
 * - Background generation via generateCard API
 * - User composition influences AI generation
 * - Style chat for visual customization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'
import {
  generateCard,
  styleChat,
  ApiError,
  type CanvasConfig,
  type CardData,
  type CardTheme,
} from '@/services/api'
import { ShoppingBag } from './ShoppingBag'
import { ProductOverlay } from './ProductOverlay'
import { PaymentScreen } from './PaymentScreen'
import type { Product, BagItem, PaymentInfo } from './ConsumerCanvas'

// Sample product-placed images for demo
const SAMPLE_PRODUCT_CARDS: Array<{
  imageUrl: string
  maskUrl: string
  product: Product
}> = [
  {
    imageUrl: '/src/prototypes/product-outline-integration/integrated_scene.png',
    maskUrl: '/src/prototypes/product-outline-integration/mask.png',
    product: {
      id: 'prada-galleria',
      name: 'Galleria Saffiano Bag',
      brand: 'Prada',
      price: 3200,
      currency: 'USD',
      imageUrl: '/prototype-assets/products/prada-1.jpg',
      description: 'Iconic saffiano leather tote with gold hardware',
    },
  },
  {
    imageUrl: '/src/prototypes/product-outline-integration/integrated_scene_0.png',
    maskUrl: '/src/prototypes/product-outline-integration/mask_0.png',
    product: {
      id: 'lv-neverfull',
      name: 'Neverfull MM',
      brand: 'Louis Vuitton',
      price: 2030,
      currency: 'USD',
      imageUrl: '/prototype-assets/products/prada-2.jpg',
      description: 'Monogram canvas tote with removable pouch',
    },
  },
]
import {
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  deleteSnapshot,
  formatTimestamp,
  type CanvasState,
  type SerializedCard,
} from '@/services/persistence'
import { addSessionCost } from '@/services/sessionRegistry'
import { useErrorToast } from './ErrorToast'
import ConfigSidebar from './ConfigSidebar'
import { saveConfig } from '@/services/configRegistry'
import { WritingPane } from './WritingPane'
import { ResizeDivider } from './ResizeDivider'
import { CanvasBackground } from './backgrounds'
import './EphemeralCanvas.css'

// Chat types (moved from runtimeConfig)
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatCommand {
  name: string
  description: string
  hasArgs: boolean
}

const CHAT_COMMANDS: ChatCommand[] = [
  { name: '/generate', description: 'Create a new card', hasArgs: false },
  { name: '/clear', description: 'Clear all cards', hasArgs: false },
  { name: '/undo', description: 'Undo last style change', hasArgs: false },
  { name: '/save', description: 'Save current environment', hasArgs: false },
  { name: '/load', description: 'Load saved environment', hasArgs: false },
  {
    name: '/config',
    description: 'Open settings or change config',
    hasArgs: true,
  },
]

// Hardcoded physics constant (was configurable, now fixed)
const DAMPING = 0.995

/** Default card theme used when config.cardTheme is undefined */
const DEFAULT_CARD_THEME: CardTheme = {
  container: 'bg-black/30 backdrop-blur-md rounded-xl border border-white/10',
  primary: 'text-lg text-white leading-relaxed text-center',
  secondary: 'text-base text-white/60 italic text-center mt-2',
  meta: 'text-sm text-white/45 text-center mt-1',
  dragging: 'opacity-80 scale-105 rotate-1',
}

interface EphemeralCanvasProps {
  config: CanvasConfig
  userComposition: string
  onCompositionChange: (text: string) => void
  /** Called when loading a snapshot that has a different config */
  onConfigChange?: (config: CanvasConfig) => void
  /** Initial state to restore (from a loaded snapshot) */
  initialState?: CanvasState
  /** Session ID for URL routing */
  sessionId?: string
  /** Called when state changes (for auto-save) */
  onStateChange?: (state: CanvasState) => void
}

interface FloatingCard {
  id: string
  data: CardData
  x: number
  y: number
  vx: number
  vy: number
  opacity: number
  scale: number
  spawnTime: number
  isUserCreated: boolean
  directive?: string // The creative direction used to generate this card
  pinned?: boolean // Pinned cards don't fade or move
  // Product placement data (for shoppable image cards)
  product?: Product
  maskUrl?: string // White = product area for hit detection
}

interface DragState {
  card: FloatingCard
  offsetX: number
  offsetY: number
  currentX: number
  currentY: number
}

let cardIdCounter = 0

function createCard(data: CardData, x?: number, y?: number): FloatingCard {
  return {
    id: `c-${++cardIdCounter}`,
    data,
    x: x ?? 15 + Math.random() * 60,
    y: y ?? 10 + Math.random() * 60,
    vx: (Math.random() - 0.5) * 0.1,
    vy: (Math.random() - 0.5) * 0.1,
    opacity: 0,
    scale: 1,
    spawnTime: Date.now(),
    isUserCreated: false,
  }
}

export default function EphemeralCanvas({
  config,
  userComposition,
  onCompositionChange,
  onConfigChange,
  initialState,
  sessionId,
  onStateChange,
}: EphemeralCanvasProps) {
  // Core state
  const [cards, setCards] = useState<FloatingCard[]>([])

  // Writing pane state (draggable width, persisted to localStorage)
  const [writingPaneWidth, setWritingPaneWidth] = useState(() => {
    const saved = localStorage.getItem('ephemeral-writing-pane-width')
    return saved ? parseFloat(saved) : 33.33 // Default 1/3
  })
  const [drag, setDrag] = useState<DragState | null>(null)
  const [inputPos, setInputPos] = useState<{ x: number; y: number } | null>(
    null
  )
  const [inputValue, setInputValue] = useState('')

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [filteredCommands, setFilteredCommands] = useState<ChatCommand[]>([])
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  // Style chat state
  const [styleSessionId, setStyleSessionId] = useState<string | null>(null)
  const [configHistory, setConfigHistory] = useState<CanvasConfig[]>([])
  const [isStyleLoading, setIsStyleLoading] = useState(false)

  // Generation indicator
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerationPaused, setIsGenerationPaused] = useState(false)

  // Zoom state (1 = 100%)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Modal state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showSnapshotsBrowser, setShowSnapshotsBrowser] = useState(false)
  const [showConfigSidebar, setShowConfigSidebar] = useState(false)

  // Save dialog state
  const [saveDialogName, setSaveDialogName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Background regeneration state
  const [isRegeneratingBackground, setIsRegeneratingBackground] =
    useState(false)

  // Snapshots browser state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Shopping bag state
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
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const cardsRef = useRef<FloatingCard[]>(cards)
  const jiggleMultipliers = useRef<Map<string, number>>(new Map())
  const userCompositionRef = useRef(userComposition)
  const configRef = useRef(config)
  const { showError } = useErrorToast()

  // Mask detection refs for product hover
  const maskCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const maskImageDataRefs = useRef<Map<string, ImageData>>(new Map())
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const HOVER_DELAY = 800 // ms before showing product card

  cardsRef.current = cards
  userCompositionRef.current = userComposition
  configRef.current = config

  // Helper: Serialize cards for persistence (strip transient physics state)
  const serializeCards = useCallback(
    (floatingCards: FloatingCard[]): SerializedCard[] => {
      return floatingCards.map((card) => ({
        id: card.id,
        data: card.data,
        x: card.x,
        y: card.y,
        isUserCreated: card.isUserCreated,
      }))
    },
    []
  )

  // Helper: Deserialize cards from persistence
  const deserializeCards = useCallback(
    (serialized: SerializedCard[]): FloatingCard[] => {
      return serialized.map((card) => ({
        ...card,
        vx: 0,
        vy: 0,
        opacity: 0, // Will fade in
        scale: 1,
        spawnTime: Date.now(),
      }))
    },
    []
  )

  // Helper: Get current canvas state for saving
  const getCurrentState = useCallback((): CanvasState => {
    return {
      cards: serializeCards(cardsRef.current),
      savedCards: [], // No longer using savedCards sidebar
      userComposition,
    }
  }, [serializeCards, userComposition])

  // Notify parent of state changes (for auto-save)
  useEffect(() => {
    if (onStateChange) {
      onStateChange(getCurrentState())
    }
  }, [cards, userComposition, onStateChange, getCurrentState])

  // Load mask images for product cards (for hover detection)
  useEffect(() => {
    cards.forEach((card) => {
      if (card.maskUrl && !maskCanvasRefs.current.has(card.id)) {
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
            maskCanvasRefs.current.set(card.id, canvas)
            maskImageDataRefs.current.set(card.id, imageData)
          }
        }
        img.src = card.maskUrl
      }
    })
  }, [cards])

  // Check if mouse is over product area using mask
  const isMouseOverProduct = useCallback(
    (cardId: string, mouseX: number, mouseY: number, imageRect: DOMRect): boolean => {
      const maskData = maskImageDataRefs.current.get(cardId)
      const canvas = maskCanvasRefs.current.get(cardId)
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
    },
    []
  )

  // Shopping bag handlers
  const handleAddToBag = useCallback((product: Product) => {
    setBag((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, addedAt: new Date() }]
    })
    setActiveProduct(null)
    setHoveredCardId(null)
  }, [])

  const handleBuyNow = useCallback(
    (product: Product) => {
      handleAddToBag(product)
      setShowPayment(true)
    },
    [handleAddToBag]
  )

  const handleRemoveFromBag = useCallback((productId: string) => {
    setBag((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        handleRemoveFromBag(productId)
        return
      }
      setBag((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      )
    },
    [handleRemoveFromBag]
  )

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

  // Calculate bag totals
  const bagTotal = bag.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  const bagCount = bag.reduce((sum, item) => sum + item.quantity, 0)

  // Get random seed content
  const getRandomSeed = useCallback((): CardData => {
    const seeds = config.seedContent
    return seeds[Math.floor(Math.random() * seeds.length)]!
  }, [config.seedContent])

  // Get random directive for generation diversity
  const getRandomDirective = useCallback((): string => {
    const directives = configRef.current.directives
    return directives[Math.floor(Math.random() * directives.length)]!
  }, [])

  const addCard = useCallback(
    (
      data: CardData,
      x?: number,
      y?: number,
      isUserCreated = false,
      directive?: string
    ) => {
      const card = createCard(data, x, y)
      card.isUserCreated = isUserCreated
      card.directive = directive
      jiggleMultipliers.current.set(card.id, 3.0)
      setCards((prev) => [...prev, card])
    },
    []
  )

  // Add a product-placed image card
  const addProductCard = useCallback(
    (
      productData: (typeof SAMPLE_PRODUCT_CARDS)[0],
      x?: number,
      y?: number
    ) => {
      const cardData: CardData = {
        image_url: productData.imageUrl,
        caption: `${productData.product.brand} ${productData.product.name}`,
      }
      const card = createCard(cardData, x, y)
      card.product = productData.product
      card.maskUrl = productData.maskUrl
      jiggleMultipliers.current.set(card.id, 3.0)
      setCards((prev) => [...prev, card])
    },
    []
  )

  const togglePin = useCallback((cardId: string) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card
        // When unpinning, reset spawnTime to give a fresh timeout
        const newPinned = !card.pinned
        return {
          ...card,
          pinned: newPinned,
          spawnTime: newPinned ? card.spawnTime : Date.now(),
        }
      })
    )
  }, [])

  // Track which card shows "Copied!" feedback
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null)

  const handleCopyCard = useCallback(
    (card: FloatingCard) => {
      // Format card content based on schema field display types
      const parts: string[] = []

      // Group fields by display type
      const primaryFields: string[] = []
      const secondaryFields: string[] = []
      const metaFields: string[] = []

      config.cardSchema.fields.forEach((field) => {
        const value = card.data[field.name]
        if (!value) return

        switch (field.display) {
          case 'primary':
            primaryFields.push(String(value))
            break
          case 'secondary':
            secondaryFields.push(String(value))
            break
          case 'meta':
            metaFields.push(String(value))
            break
        }
      })

      // Build formatted text: primary, secondary, then meta with attribution dash
      if (primaryFields.length) parts.push(primaryFields.join('\n'))
      if (secondaryFields.length) parts.push(secondaryFields.join('\n'))
      if (metaFields.length) parts.push(`— ${metaFields.join(' · ')}`)

      const text = parts.join('\n\n')

      navigator.clipboard.writeText(text).then(() => {
        setCopiedCardId(card.id)
        setTimeout(() => setCopiedCardId(null), 1500)
      })
    },
    [config.cardSchema.fields]
  )

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    card: FloatingCard
  } | null>(null)

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, card: FloatingCard) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ x: e.clientX, y: e.clientY, card })
    },
    []
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Copy specific field from card
  const handleCopyField = useCallback(
    (card: FloatingCard, fieldName: string) => {
      const value = card.data[fieldName]
      if (value) {
        navigator.clipboard.writeText(String(value)).then(() => {
          setCopiedCardId(card.id)
          setTimeout(() => setCopiedCardId(null), 1500)
        })
      }
      closeContextMenu()
    },
    [closeContextMenu]
  )

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return

    const handleClick = () => closeContextMenu()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu, closeContextMenu])

  // Inline editing state
  const [editingField, setEditingField] = useState<{
    cardId: string
    fieldName: string
    value: string
  } | null>(null)

  const startEditing = useCallback((card: FloatingCard, fieldName: string) => {
    const value = card.data[fieldName]
    if (value !== undefined) {
      setEditingField({
        cardId: card.id,
        fieldName,
        value: String(value),
      })
    }
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingField) return

    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== editingField.cardId) return card
        return {
          ...card,
          data: {
            ...card.data,
            [editingField.fieldName]: editingField.value,
          },
        }
      })
    )
    setEditingField(null)
  }, [editingField])

  const cancelEdit = useCallback(() => {
    setEditingField(null)
  }, [])

  // Initialize with seed content OR restore from initialState
  useEffect(() => {
    if (initialState) {
      // Restore from snapshot
      const restoredCards = deserializeCards(initialState.cards)
      setCards(restoredCards)
      // Set jiggle multipliers for restored cards
      restoredCards.forEach((card) => {
        jiggleMultipliers.current.set(card.id, 2.0)
      })
      // Restore composition
      if (initialState.userComposition) {
        onCompositionChange(initialState.userComposition)
      }
    } else {
      // Fresh start with seed content + product cards
      const shuffled = [...config.seedContent].sort(() => Math.random() - 0.5)
      shuffled.slice(0, 2).forEach((data, i) => {
        setTimeout(() => addCard(data), i * 600)
      })
      // Also spawn product-placed cards for demo
      SAMPLE_PRODUCT_CARDS.forEach((productData, i) => {
        setTimeout(() => addProductCard(productData), (i + 2) * 600)
      })
    }
  }, [
    config.seedContent,
    addCard,
    addProductCard,
    initialState,
    deserializeCards,
    onCompositionChange,
  ])

  // Background generation - uses generateCard API with random directive!
  const isGenerationPausedRef = useRef(isGenerationPaused)
  isGenerationPausedRef.current = isGenerationPaused

  useEffect(() => {
    // Interval is 50% of configured value for faster generation
    const intervalMs = config.spawning.intervalSeconds * 500
    const interval = setInterval(async () => {
      // Skip generation if paused
      if (isGenerationPausedRef.current) return

      const cfg = configRef.current
      // Count only non-pinned cards toward minCards threshold
      const unpinnedCount = cardsRef.current.filter((c) => !c.pinned).length
      if (unpinnedCount < cfg.spawning.minCards) {
        // Pick a random directive for diversity
        const directive = getRandomDirective()
        setIsGenerating(true)
        try {
          // Convert cards to CardData array
          const existingCards = cardsRef.current.map((c) => c.data)
          // Decide if this should be an image card based on imageWeight
          const imageWeight = cfg.spawning.imageWeight ?? 0
          const shouldBeImage = Math.random() < imageWeight
          const result = await generateCard(
            cfg,
            userCompositionRef.current,
            existingCards,
            directive,
            shouldBeImage
          )
          addCard(result.card, undefined, undefined, false, directive)
          // Track cost for this session
          if (sessionId && result.cost_usd) {
            addSessionCost(sessionId, result.cost_usd)
          }
        } catch (error) {
          // Show error to user (but don't spam - only on network errors)
          if (error instanceof ApiError && error.isNetworkError) {
            showError(error.userMessage)
          }
          // Fallback to seed content silently for other errors
          addCard(getRandomSeed())
        } finally {
          setIsGenerating(false)
        }
      }
    }, intervalMs)
    return () => clearInterval(interval)
  }, [
    config.spawning.intervalSeconds,
    config.spawning.minCards,
    addCard,
    getRandomSeed,
    getRandomDirective,
    showError,
  ])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now()
      const physics = configRef.current.physics
      // Convert cardLifetime from seconds to milliseconds for fade calculation
      const fadeMs = physics.cardLifetime * 1000

      setCards((prev) =>
        prev
          .map((card) => {
            // Skip physics for dragged cards
            if (drag?.card.id === card.id) return card

            // Pinned cards don't move or fade - keep them at full opacity
            if (card.pinned) {
              return { ...card, opacity: 1, vx: 0, vy: 0 }
            }

            const { spawnTime } = card
            let { x, y, vx, vy, opacity } = card
            const age = now - spawnTime

            // Get/update jiggle multiplier
            let jiggleMult = jiggleMultipliers.current.get(card.id) ?? 1.0
            if (age < 2000) {
              jiggleMult = 1.0 + 2.0 * (1 - age / 2000)
            } else {
              jiggleMult = 1.0
            }
            jiggleMultipliers.current.set(card.id, jiggleMult)

            // Fade in/out
            if (age < 500) {
              opacity = age / 500
            } else {
              const lifeElapsed = age - 500
              opacity = Math.max(0, 1 - lifeElapsed / fadeMs)
            }

            // Drift (scaled by driftSpeed)
            x += vx * physics.driftSpeed
            y += vy * physics.driftSpeed

            // Damping (hardcoded)
            vx *= DAMPING
            vy *= DAMPING

            // Jiggle (scaled by jiggle intensity from config)
            const jiggleAmount = 0.008 * jiggleMult * physics.jiggle
            vx += (Math.random() - 0.5) * jiggleAmount
            vy += (Math.random() - 0.5) * jiggleAmount

            // Boundaries
            if (x < 8) {
              x = 8
              vx = Math.abs(vx) * physics.bounce
            }
            if (x > 88) {
              x = 88
              vx = -Math.abs(vx) * physics.bounce
            }
            if (y < 5) {
              y = 5
              vy = Math.abs(vy) * physics.bounce
            }
            if (y > 80) {
              y = 80
              vy = -Math.abs(vy) * physics.bounce
            }

            return { ...card, x, y, vx, vy, opacity }
          })
          .filter((card) => card.opacity > 0.01 || card.pinned)
      )

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [drag])

  // Drag handlers
  const handleCardMouseDown = (e: React.MouseEvent, card: FloatingCard) => {
    // Don't start drag if clicking on action buttons
    if ((e.target as HTMLElement).closest('.card-actions')) {
      return
    }
    e.preventDefault()
    e.stopPropagation()

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDrag({
      card,
      offsetX: e.clientX - rect.left - rect.width / 2,
      offsetY: e.clientY - rect.top - rect.height / 2,
      currentX: e.clientX,
      currentY: e.clientY,
    })

    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, opacity: 1, scale: 1.08 } : c
      )
    )
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag) return

    setDrag((prev) =>
      prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null
    )

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()

    // Calculate position accounting for zoom
    // With zoom, the visual center stays the same but content is scaled
    // We need to transform mouse position to unscaled coordinates
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Transform from screen coords to scaled coords
    const scaledX = centerX + (mouseX - centerX) / zoomLevel
    const scaledY = centerY + (mouseY - centerY) / zoomLevel

    const x = (scaledX / rect.width) * 100
    const y = (scaledY / rect.height) * 100

    setCards((prev) =>
      prev.map((c) =>
        c.id === drag.card.id ? { ...c, x, y, vx: 0, vy: 0 } : c
      )
    )
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drag) return

    // Give the card velocity based on drag movement
    setCards((prev) =>
      prev.map((c) =>
        c.id === drag.card.id
          ? {
              ...c,
              scale: 1,
              vx: (e.clientX - drag.currentX) * 0.002,
              vy: (e.clientY - drag.currentY) * 0.002,
            }
          : c
      )
    )

    setDrag(null)
  }

  // Double-click to create user card
  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card')) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    setInputPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setInputValue('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !inputPos || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (inputPos.x / rect.width) * 100
    const y = (inputPos.y / rect.height) * 100

    // Create card with primary field filled
    const primaryField = config.cardSchema.fields.find(
      (f) => f.display === 'primary'
    )
    if (primaryField) {
      const userData: CardData = {
        [primaryField.name]: inputValue.trim(),
      }
      // Add meta field for attribution
      const metaFields = config.cardSchema.fields.filter(
        (f) => f.display === 'meta'
      )
      if (metaFields.length > 0) {
        userData[metaFields[metaFields.length - 1]!.name] = 'You'
      }
      addCard(userData, x, y, true)
    }

    setInputPos(null)
    setInputValue('')
  }

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      handleInputSubmit({ preventDefault: () => {} } as React.FormEvent)
    } else {
      setInputPos(null)
    }
  }

  // Writing pane resize handlers (pane is on left)
  const handleWritingPaneResize = useCallback((deltaX: number) => {
    const containerWidth = window.innerWidth
    const deltaPercent = (deltaX / containerWidth) * 100
    setWritingPaneWidth((prev) =>
      Math.max(20, Math.min(60, prev + deltaPercent))
    )
  }, [])

  const handleWritingPaneResizeEnd = useCallback(() => {
    localStorage.setItem(
      'ephemeral-writing-pane-width',
      writingPaneWidth.toString()
    )
  }, [writingPaneWidth])

  const resetWritingPaneWidth = useCallback(() => {
    setWritingPaneWidth(33.33)
    localStorage.setItem('ephemeral-writing-pane-width', '33.33')
  }, [])

  // Keyboard shortcut for config sidebar (Cmd+,)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setShowConfigSidebar((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Zoom wheel handler (Ctrl/Cmd + scroll)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoomLevel((prev) => Math.max(0.25, Math.min(2, prev + delta)))
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Handle config save (persists to registry)
  const handleConfigSave = useCallback(
    (newConfig: CanvasConfig) => {
      if (onConfigChange) {
        onConfigChange(newConfig)
      }
      saveConfig(newConfig, config.slug)
      // Note: Can't call addChatMessage here as it's defined later
      // The sidebar will close after save anyway
    },
    [onConfigChange, config.slug]
  )

  // Regenerate background via style chat
  const handleRegenerateBackground = useCallback(async () => {
    if (isRegeneratingBackground) return

    setIsRegeneratingBackground(true)

    try {
      const response = await styleChat({
        message:
          'Change the background to a different Wikimedia image with a new mood. Use different CSS filters to create a fresh atmosphere.',
        currentCardTheme: config.cardTheme,
        currentCanvasTheme: config.canvasTheme,
        currentPhysics: config.physics,
        sessionId: styleSessionId ?? undefined,
      })

      setStyleSessionId(response.session_id)

      if (response.type === 'update' && response.canvas_theme) {
        const newConfig = {
          ...config,
          canvasTheme: {
            ...config.canvasTheme,
            ...Object.fromEntries(
              Object.entries(response.canvas_theme).filter(
                ([, v]) => v !== undefined && v !== null
              )
            ),
          },
        }
        if (onConfigChange) {
          onConfigChange(newConfig)
        }
      } else {
        showError('Failed to generate new background. Try again.')
      }
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'Failed to regenerate background'
      )
    } finally {
      setIsRegeneratingBackground(false)
    }
  }, [
    config,
    styleSessionId,
    onConfigChange,
    showError,
    isRegeneratingBackground,
  ])

  // Chat input handlers
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setChatInput(value)

    if (value.startsWith('/')) {
      const query = value.slice(1).toLowerCase()
      const filtered = CHAT_COMMANDS.filter((cmd) =>
        cmd.name.slice(1).toLowerCase().startsWith(query)
      )
      setFilteredCommands(filtered)
      setShowAutocomplete(filtered.length > 0)
      setSelectedCommandIndex(0)
    } else {
      setShowAutocomplete(false)
    }
  }

  const selectCommand = (cmd: ChatCommand) => {
    setChatInput(cmd.name + (cmd.hasArgs ? ' ' : ''))
    setShowAutocomplete(false)
    chatInputRef.current?.focus()
  }

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (filteredCommands[selectedCommandIndex]) {
          e.preventDefault()
          selectCommand(filteredCommands[selectedCommandIndex])
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false)
      }
    } else if (e.key === 'Enter' && chatInput.trim()) {
      e.preventDefault()
      handleChatSubmit()
    }
  }

  const addChatMessage = (
    role: 'user' | 'assistant' | 'system',
    content: string
  ) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      content,
      timestamp: Date.now(),
    }
    setChatMessages((prev) => [...prev.slice(-19), message]) // Keep last 20 messages
  }

  const handleChatSubmit = async () => {
    const input = chatInput.trim()
    if (!input) return

    setChatInput('')
    setShowAutocomplete(false)

    // Handle commands
    if (input.startsWith('/')) {
      const [command, ...args] = input.split(' ')
      const argText = args.join(' ')

      switch (command) {
        case '/config':
          addChatMessage('user', input)
          if (argText) {
            addChatMessage('system', 'Processing config change...')
            // TODO: Call /api/config/suggest endpoint
            addChatMessage(
              'assistant',
              `Config command received: "${argText}". (LLM integration coming soon)`
            )
          } else {
            addChatMessage(
              'assistant',
              'Use /config <description> to change settings, e.g. "/config make cards slower"'
            )
          }
          break

        case '/generate':
          addChatMessage('user', input)
          try {
            const directive = getRandomDirective()
            const existingCards = cardsRef.current.map((c) => c.data)
            const result = await generateCard(
              config,
              userCompositionRef.current,
              existingCards,
              directive
            )
            addCard(result.card, undefined, undefined, false, directive)
            // Track cost for this session
            if (sessionId && result.cost_usd) {
              addSessionCost(sessionId, result.cost_usd)
            }
            addChatMessage('assistant', `Generated a new card! (${directive})`)
          } catch (error) {
            const message =
              error instanceof ApiError
                ? error.userMessage
                : 'Failed to generate card'
            addChatMessage('system', `Error: ${message}`)
            showError(message)
          }
          break

        case '/clear':
          addChatMessage('user', input)
          setCards([])
          addChatMessage('system', 'Canvas cleared.')
          break

        case '/save':
          addChatMessage('user', input)
          setShowSaveDialog(true)
          break

        case '/load':
          addChatMessage('user', input)
          setShowSnapshotsBrowser(true)
          break

        case '/undo':
          addChatMessage('user', input)
          if (configHistory.length > 0) {
            const previousConfig = configHistory[configHistory.length - 1]!
            setConfigHistory((prev) => prev.slice(0, -1))
            if (onConfigChange) {
              onConfigChange(previousConfig)
            }
            addChatMessage('system', 'Reverted to previous style')
          } else {
            addChatMessage('system', 'Nothing to undo')
          }
          break

        default:
          addChatMessage('user', input)
          addChatMessage('system', `Unknown command: ${command}`)
      }
    } else {
      // Style chat - send to LLM for visual/physics changes
      addChatMessage('user', input)

      if (isStyleLoading) {
        addChatMessage('system', 'Please wait, processing previous request...')
        return
      }

      setIsStyleLoading(true)
      addChatMessage('assistant', 'Thinking about style changes...')

      try {
        const response = await styleChat({
          message: input,
          currentCardTheme: config.cardTheme,
          currentCanvasTheme: config.canvasTheme,
          currentPhysics: config.physics,
          sessionId: styleSessionId ?? undefined,
        })

        // Store session ID for conversation continuity
        setStyleSessionId(response.session_id)

        // Remove the "Thinking..." message
        setChatMessages((prev) => prev.slice(0, -1))

        if (response.type === 'question') {
          // LLM needs clarification
          addChatMessage(
            'assistant',
            response.explanation ?? 'Could you clarify?'
          )
        } else if (response.type === 'update') {
          // Apply style updates
          const newConfig = { ...config }

          // Store current config for undo (max 5 history)
          setConfigHistory((prev) => [...prev.slice(-4), config])

          // Apply partial card theme updates
          if (response.card_theme) {
            newConfig.cardTheme = {
              ...config.cardTheme,
              ...Object.fromEntries(
                Object.entries(response.card_theme).filter(
                  ([, v]) => v !== undefined && v !== null
                )
              ),
            } as typeof config.cardTheme
          }

          // Apply partial canvas theme updates
          if (response.canvas_theme) {
            newConfig.canvasTheme = {
              ...config.canvasTheme,
              ...Object.fromEntries(
                Object.entries(response.canvas_theme).filter(
                  ([, v]) => v !== undefined && v !== null
                )
              ),
            }
          }

          // Apply partial physics updates
          if (response.physics) {
            newConfig.physics = {
              ...config.physics,
              ...Object.fromEntries(
                Object.entries(response.physics).filter(
                  ([, v]) => v !== undefined && v !== null
                )
              ),
            }
          }

          // Update config
          if (onConfigChange) {
            onConfigChange(newConfig)
          }

          addChatMessage(
            'assistant',
            response.explanation ?? 'Style updated! Use /undo to revert.'
          )
        }
      } catch (error) {
        // Remove the "Thinking..." message
        setChatMessages((prev) => prev.slice(0, -1))

        const message =
          error instanceof ApiError ? error.userMessage : 'Style chat failed'
        addChatMessage('system', `Error: ${message}`)
        showError(message)
      } finally {
        setIsStyleLoading(false)
      }
    }
  }

  // Get card theme (with fallback to defaults)
  const cardTheme = config.cardTheme ?? DEFAULT_CARD_THEME

  // Render card content based on schema (or image card)
  const renderCardContent = (card: FloatingCard) => {
    // Safety check for card.data
    if (!card.data) return null

    // Check if this is an image card (has image_url field)
    if (card.data.image_url) {
      const imageUrl = card.data.thumbnail || card.data.image_url
      const caption = card.data.caption
      const attribution = card.data.attribution
      const hasProduct = !!card.product && !!card.maskUrl

      // Handle hover for product cards
      const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!hasProduct || !card.product) return
        const imageEl = e.currentTarget
        const rect = imageEl.getBoundingClientRect()
        const overProduct = isMouseOverProduct(card.id, e.clientX, e.clientY, rect)

        if (overProduct && hoveredCardId !== card.id) {
          setHoveredCardId(card.id)
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }
          hoverTimeoutRef.current = setTimeout(() => {
            setActiveProduct({
              product: card.product!,
              position: { x: e.clientX, y: e.clientY },
              cardId: card.id,
            })
          }, HOVER_DELAY)
        } else if (!overProduct && hoveredCardId === card.id) {
          setHoveredCardId(null)
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }
        }

        // Update position if active
        if (activeProduct && activeProduct.cardId === card.id) {
          setActiveProduct((prev) =>
            prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null
          )
        }
      }

      const handleImageMouseLeave = () => {
        if (!hasProduct) return
        // Longer delay to check if mouse moved to product overlay
        setTimeout(() => {
          const overlayHovered = document.querySelector('.product-overlay:hover')
          if (!overlayHovered) {
            setHoveredCardId(null)
            setActiveProduct(null)
          }
        }, 150)
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
        }
      }

      return (
        <div className={clsx('image-card-content', hasProduct && 'has-product', hoveredCardId === card.id && 'product-hovered')}>
          <img
            src={imageUrl}
            alt={caption || 'Image'}
            className="w-full h-auto rounded-lg object-cover max-h-48"
            loading="lazy"
            onMouseMove={handleImageMouseMove}
            onMouseLeave={handleImageMouseLeave}
          />
          {/* Subtle highlight when hovering over product area */}
          {hoveredCardId === card.id && hasProduct && (
            <div className="product-highlight-overlay" />
          )}
          {caption && (
            <div className={clsx(cardTheme.primary, 'mt-2 text-sm')}>
              {caption}
            </div>
          )}
          {attribution && (
            <div className={clsx(cardTheme.meta, 'mt-1 text-xs opacity-60')}>
              {attribution}
            </div>
          )}
        </div>
      )
    }

    // Regular text card - render based on schema
    return config.cardSchema.fields.map((field) => {
      const value = card.data[field.name]
      if (!value && field.type === 'string?') return null

      // Get the Tailwind classes for this display type
      const displayClass = cardTheme[field.display]

      // Check if this field is being edited
      const isEditing =
        editingField?.cardId === card.id &&
        editingField?.fieldName === field.name

      if (isEditing) {
        return (
          <div key={field.name} className={clsx(displayClass, 'editing-field')}>
            <textarea
              autoFocus
              className="card-field-input"
              value={editingField.value}
              onChange={(e) =>
                setEditingField((prev) =>
                  prev ? { ...prev, value: e.target.value } : null
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  saveEdit()
                } else if (e.key === 'Escape') {
                  cancelEdit()
                }
              }}
              onBlur={saveEdit}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        )
      }

      const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        startEditing(card, field.name)
      }

      switch (field.display) {
        case 'primary':
          return (
            <div
              key={field.name}
              className={clsx(displayClass, 'editable-field')}
              onDoubleClick={handleDoubleClick}
            >
              {value}
            </div>
          )
        case 'secondary':
          return (
            <div
              key={field.name}
              className={clsx(displayClass, 'editable-field')}
              onDoubleClick={handleDoubleClick}
            >
              {value}
            </div>
          )
        case 'meta':
          return (
            <div
              key={field.name}
              className={clsx(displayClass, 'editable-field')}
              onDoubleClick={handleDoubleClick}
            >
              {field.name === 'flag' || field.name === 'mood'
                ? value
                : `— ${value}`}
            </div>
          )
        default:
          return null
      }
    })
  }

  // Build card classes using clsx
  const getCardClasses = (isDragging: boolean) => {
    return clsx(
      'card', // Base structural class from CSS
      cardTheme.container,
      isDragging && cardTheme.dragging
    )
  }

  return (
    <div className="ephemeral-layout">
      {/* Writing Pane (left side) */}
      <WritingPane
        value={userComposition}
        onChange={onCompositionChange}
        width={writingPaneWidth}
        title={config.writingPane?.title}
        placeholder={
          config.writingPane?.placeholder ??
          "What's on your mind? This shapes the AI..."
        }
        accentColor={config.canvasTheme.accent}
        background={config.writingPane?.background}
        textColor={config.writingPane?.textColor}
        titleColor={config.writingPane?.titleColor}
        fontFamily={config.writingPane?.fontFamily}
      />

      {/* Resize Divider */}
      <ResizeDivider
        onDrag={handleWritingPaneResize}
        onDragEnd={handleWritingPaneResizeEnd}
        onDoubleClick={resetWritingPaneWidth}
      />

      {/* Canvas Area (center) */}
      <div
        className="canvas-container"
        style={
          config.canvasTheme.backgroundImage
            ? undefined
            : { background: config.canvasTheme.background }
        }
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setDrag(null)}
        onDoubleClick={handleDoubleClick}
      >
        {/* Background - auto-selects renderer based on theme config */}
        <CanvasBackground theme={config.canvasTheme} />

        {/* Canvas Action Buttons */}
        <div className="canvas-actions">
          <button
            className="canvas-action-btn"
            onClick={() => setShowConfigSidebar(true)}
            title="Settings (⌘,)"
          >
            ⚙️
          </button>
          <button
            className={clsx(
              'canvas-action-btn',
              isGenerationPaused && 'active'
            )}
            onClick={() => setIsGenerationPaused((prev) => !prev)}
            title={
              isGenerationPaused ? 'Resume generation' : 'Pause generation'
            }
          >
            {isGenerationPaused ? '▶' : '⏸'}
          </button>
          <button
            className="canvas-action-btn"
            onClick={() => setShowSaveDialog(true)}
            title="Save Environment"
          >
            💾
          </button>
          <button
            className={clsx(
              'canvas-action-btn',
              isRegeneratingBackground && 'loading'
            )}
            onClick={handleRegenerateBackground}
            disabled={isRegeneratingBackground}
            title="Regenerate background"
          >
            🎨
          </button>
          {/* Shopping bag button */}
          <button
            className={clsx('canvas-action-btn bag-btn', bagCount > 0 && 'has-items')}
            onClick={() => setShowBag(true)}
            title="Shopping bag"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {bagCount > 0 && <span className="bag-count-badge">{bagCount}</span>}
          </button>
        </div>

        {/* Label */}
        <div className="canvas-label">{config.name}</div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel((prev) => Math.max(0.25, prev - 0.1))}
            title="Zoom out"
          >
            −
          </button>
          <span
            className="zoom-level"
            onClick={() => setZoomLevel(1)}
            title="Reset zoom (click)"
          >
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel((prev) => Math.min(2, prev + 0.1))}
            title="Zoom in"
          >
            +
          </button>
        </div>

        {/* Zoomed Cards Container */}
        <div
          className="cards-container"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Floating cards */}
          {cards.map((card) => {
            const isDragging = drag?.card.id === card.id
            return (
              <div
                key={card.id}
                className={clsx(
                  getCardClasses(isDragging),
                  card.pinned && 'pinned'
                )}
                style={{
                  left: `${card.x}%`,
                  top: `${card.y}%`,
                  opacity: card.opacity,
                  transform: `translate(-50%, -50%) scale(${card.scale})`,
                  ['--accent' as string]: config.canvasTheme.accent,
                }}
                onMouseDown={(e) => handleCardMouseDown(e, card)}
                onContextMenu={(e) => handleContextMenu(e, card)}
              >
                {/* Card action buttons */}
                <div className="card-actions">
                  {/* Copy button */}
                  <button
                    className={clsx(
                      'card-action-btn card-copy-btn',
                      copiedCardId === card.id && 'copied'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyCard(card)
                    }}
                    title="Copy card content"
                  >
                    {copiedCardId === card.id ? '✓' : '⧉'}
                  </button>
                  {/* Delete button */}
                  <button
                    className="card-action-btn card-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCards((prev) => prev.filter((c) => c.id !== card.id))
                    }}
                    title="Remove card"
                  >
                    ✕
                  </button>
                  {/* Pin button */}
                  <button
                    className={clsx(
                      'card-action-btn card-pin-btn',
                      card.pinned && 'pinned'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePin(card.id)
                    }}
                    title={card.pinned ? 'Unpin card' : 'Pin card'}
                  >
                    •
                  </button>
                </div>
                {renderCardContent(card)}
                {card.directive && (
                  <div className="text-[10px] mt-2 italic truncate text-center opacity-25">
                    ✦ {card.directive}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* User input */}
        {inputPos && (
          <form
            className="card-input-form"
            style={{ left: inputPos.x, top: inputPos.y }}
            onSubmit={handleInputSubmit}
          >
            <input
              ref={inputRef}
              type="text"
              className="card-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputBlur}
              placeholder="Write something..."
            />
          </form>
        )}

        {/* Chat Bar */}
        <div className="chat-bar">
          {chatMessages.length > 0 && (
            <div className="chat-messages-mini">
              {chatMessages.slice(-2).map((msg) => (
                <span
                  key={msg.id}
                  className={`chat-message-mini chat-message-${msg.role}`}
                >
                  {msg.role === 'user' ? '> ' : ''}
                  {msg.content}
                </span>
              ))}
            </div>
          )}
          <div className="chat-input-wrapper">
            <input
              ref={chatInputRef}
              type="text"
              className="chat-input"
              value={chatInput}
              onChange={handleChatInputChange}
              onKeyDown={handleChatKeyDown}
              placeholder="Chat or type / for commands..."
            />
            {showAutocomplete && filteredCommands.length > 0 && (
              <div className="chat-autocomplete">
                {filteredCommands.map((cmd, idx) => (
                  <div
                    key={cmd.name}
                    className={`autocomplete-item ${idx === selectedCommandIndex ? 'selected' : ''}`}
                    onClick={() => selectCommand(cmd)}
                    onMouseEnter={() => setSelectedCommandIndex(idx)}
                  >
                    <span className="cmd-name">{cmd.name}</span>
                    <span className="cmd-desc">{cmd.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hint + Generation Indicator */}
        <div className="canvas-hint">
          {isGenerationPaused && (
            <span className="pause-indicator" title="Generation paused">
              ⏸ Paused
            </span>
          )}
          {isGenerating && !isGenerationPaused && (
            <span className="generation-indicator" title="Generating...">
              ✦
            </span>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div
            className="modal-overlay"
            onClick={() => {
              setShowSaveDialog(false)
              setSaveDialogName('')
              setSaveError(null)
            }}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Save Environment</h2>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowSaveDialog(false)
                    setSaveDialogName('')
                    setSaveError(null)
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
                  Save your current canvas including all cards and settings.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    try {
                      const state = getCurrentState()
                      saveSnapshot(saveDialogName || config.name, config, state)
                      setShowSaveDialog(false)
                      setSaveDialogName('')
                      setSaveError(null)
                      addChatMessage('system', 'Environment saved!')
                    } catch (err) {
                      setSaveError(
                        err instanceof Error ? err.message : 'Failed to save'
                      )
                    }
                  }}
                >
                  <input
                    type="text"
                    className="modal-input"
                    value={saveDialogName}
                    onChange={(e) => setSaveDialogName(e.target.value)}
                    placeholder={config.name}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '1rem',
                    }}
                  />
                  {saveError && (
                    <p style={{ color: '#f87171', marginBottom: '1rem' }}>
                      {saveError}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="submit"
                      className="modal-button primary"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(99, 102, 241, 0.8)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="modal-button secondary"
                      onClick={() => {
                        setShowSaveDialog(false)
                        setSaveDialogName('')
                        setSaveError(null)
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
                <p
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.85rem',
                    opacity: 0.6,
                  }}
                >
                  {cards.length} cards on canvas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Snapshots Browser */}
        {showSnapshotsBrowser && (
          <div
            className="modal-overlay"
            onClick={() => {
              setShowSnapshotsBrowser(false)
              setDeleteConfirmId(null)
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px' }}
            >
              <div className="modal-header">
                <h2>Load Environment</h2>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowSnapshotsBrowser(false)
                    setDeleteConfirmId(null)
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                {(() => {
                  // Load snapshots when modal opens
                  const snapshotList = listSnapshots()
                  if (snapshotList.length === 0) {
                    return (
                      <p style={{ opacity: 0.6, textAlign: 'center' }}>
                        No saved environments yet. Save one first!
                      </p>
                    )
                  }
                  return (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      {snapshotList.map((meta) => (
                        <div
                          key={meta.id}
                          style={{
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  marginBottom: '0.25rem',
                                }}
                              >
                                {meta.name}
                              </div>
                              <div
                                style={{ fontSize: '0.85rem', opacity: 0.6 }}
                              >
                                {formatTimestamp(meta.timestamp)} ·{' '}
                                {meta.cardCount} cards · {meta.configName}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {deleteConfirmId === meta.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      deleteSnapshot(meta.id)
                                      setDeleteConfirmId(null)
                                      addChatMessage(
                                        'system',
                                        `Deleted "${meta.name}"`
                                      )
                                    }}
                                    style={{
                                      padding: '0.4rem 0.75rem',
                                      background: 'rgba(239, 68, 68, 0.8)',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    style={{
                                      padding: '0.4rem 0.75rem',
                                      background: 'rgba(255,255,255,0.1)',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      borderRadius: '0.25rem',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      const snapshot = loadSnapshot(meta.id)
                                      if (snapshot) {
                                        // Restore cards
                                        const restoredCards = deserializeCards(
                                          snapshot.state.cards
                                        )
                                        setCards(restoredCards)
                                        // Set jiggle for restored cards
                                        restoredCards.forEach((card) => {
                                          jiggleMultipliers.current.set(
                                            card.id,
                                            2.0
                                          )
                                        })
                                        // Restore composition
                                        if (snapshot.state.userComposition) {
                                          onCompositionChange(
                                            snapshot.state.userComposition
                                          )
                                        }
                                        // Update config if different
                                        if (
                                          onConfigChange &&
                                          JSON.stringify(snapshot.config) !==
                                            JSON.stringify(config)
                                        ) {
                                          onConfigChange(snapshot.config)
                                        }
                                        setShowSnapshotsBrowser(false)
                                        addChatMessage(
                                          'system',
                                          `Loaded "${meta.name}"`
                                        )
                                      }
                                    }}
                                    style={{
                                      padding: '0.4rem 0.75rem',
                                      background: 'rgba(99, 102, 241, 0.8)',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    Load
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(meta.id)}
                                    style={{
                                      padding: '0.4rem 0.75rem',
                                      background: 'rgba(255,255,255,0.1)',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      borderRadius: '0.25rem',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                    }}
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="card-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="context-menu-item"
              onClick={() => {
                handleCopyCard(contextMenu.card)
                closeContextMenu()
              }}
            >
              <span className="context-icon">⧉</span>
              Copy All
            </button>
            {/* Copy individual fields */}
            {config.cardSchema.fields.map((field) => {
              const value = contextMenu.card.data[field.name]
              if (!value) return null
              return (
                <button
                  key={field.name}
                  className="context-menu-item"
                  onClick={() => handleCopyField(contextMenu.card, field.name)}
                >
                  <span className="context-icon">⎘</span>
                  Copy {field.name}
                </button>
              )
            })}
            <div className="context-menu-divider" />
            <button
              className="context-menu-item"
              onClick={() => {
                // Start editing the first field with content
                const firstField = config.cardSchema.fields.find(
                  (f) => contextMenu.card.data[f.name]
                )
                if (firstField) {
                  startEditing(contextMenu.card, firstField.name)
                }
                closeContextMenu()
              }}
            >
              <span className="context-icon">✎</span>
              Edit
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                togglePin(contextMenu.card.id)
                closeContextMenu()
              }}
            >
              <span className="context-icon">
                {contextMenu.card.pinned ? '○' : '•'}
              </span>
              {contextMenu.card.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className="context-menu-item context-menu-danger"
              onClick={() => {
                setCards((prev) =>
                  prev.filter((c) => c.id !== contextMenu.card.id)
                )
                closeContextMenu()
              }}
            >
              <span className="context-icon">✕</span>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Config Sidebar (slides in from right) */}
      <ConfigSidebar
        isOpen={showConfigSidebar}
        onClose={() => setShowConfigSidebar(false)}
        config={config}
        onApply={(newConfig) => {
          if (onConfigChange) {
            onConfigChange(newConfig)
          }
        }}
        onSave={handleConfigSave}
      />

      {/* Product Overlay - appears on hover over product area in image cards */}
      {activeProduct && (
        <ProductOverlay
          product={activeProduct.product}
          position={activeProduct.position}
          onAddToBag={() => handleAddToBag(activeProduct.product)}
          onBuyNow={() => handleBuyNow(activeProduct.product)}
          onClose={() => {
            setActiveProduct(null)
            setHoveredCardId(null)
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
    </div>
  )
}
