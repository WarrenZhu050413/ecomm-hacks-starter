/**
 * ProductOverlay - Glassmorphic product card that appears on hover
 *
 * Features:
 * - Translucent/glassmorphic overlay
 * - Positioned to the right of mouse, vertically centered
 * - Add to Bag and Buy Now buttons side by side
 * - Smooth micro-animations
 * - "Suck into bag" animation when adding to bag
 * - Loading animation and confirmation for Buy Now
 */

import { useEffect, useRef, useState } from 'react'
import type { Product } from './ConsumerCanvas'
import './ProductOverlay.css'

interface ProductOverlayProps {
  product: Product
  position: { x: number; y: number }
  productBounds?: { left: number; right: number; top: number; bottom: number }
  sceneImageUrl?: string  // For the flying product animation
  onAddToBag: () => void
  onBuyNow: () => void
  onClose: () => void
}

export function ProductOverlay({
  product,
  position,
  productBounds,
  sceneImageUrl: _sceneImageUrl,
  onAddToBag,
  onBuyNow,
  onClose
}: ProductOverlayProps) {
  // sceneImageUrl reserved for future use (e.g., extracting product from scene)
  void _sceneImageUrl
  const overlayRef = useRef<HTMLDivElement>(null)
  const addToBagBtnRef = useRef<HTMLButtonElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [buyNowLoading, setBuyNowLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [spinnerFrame, setSpinnerFrame] = useState(0)
  const spinnerInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const [flyingProduct, setFlyingProduct] = useState<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    endX: number
    endY: number
  } | null>(null)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  // Spinner animation for Buy Now loading
  useEffect(() => {
    if (buyNowLoading) {
      spinnerInterval.current = setInterval(() => {
        setSpinnerFrame(prev => (prev + 1) % 4)
      }, 150)
    } else {
      if (spinnerInterval.current) {
        clearInterval(spinnerInterval.current)
      }
    }
    return () => {
      if (spinnerInterval.current) {
        clearInterval(spinnerInterval.current)
      }
    }
  }, [buyNowLoading])

  // Calculate position - to the right of product, vertically centered
  const calculatePosition = () => {
    const gap = 16
    const cardWidth = 240
    const cardHeight = 260

    // If no productBounds, fall back to position-based placement
    if (!productBounds) {
      return { left: position.x + gap, top: position.y - cardHeight / 2 }
    }

    // Position to the right of the product bounds, vertically centered
    const productCenterY = (productBounds.top + productBounds.bottom) / 2
    let left = productBounds.right + gap
    let top = productCenterY - cardHeight / 2

    // Flip to left if would overflow right edge
    if (left + cardWidth > window.innerWidth - 20) {
      left = productBounds.left - cardWidth - gap
    }

    // Keep vertically in bounds
    if (top < 20) top = 20
    if (top + cardHeight > window.innerHeight - 20) {
      top = window.innerHeight - cardHeight - 20
    }

    return { left, top }
  }

  const pos = calculatePosition()

  // Handle add to bag with flying animation
  const handleAddToBag = () => {
    const btn = addToBagBtnRef.current
    if (!btn || !productBounds) {
      // Fallback without animation
      setAddedFeedback(true)
      setTimeout(() => onAddToBag(), 400)
      return
    }

    const btnRect = btn.getBoundingClientRect()

    // Calculate product center and size from bounds
    const productWidth = productBounds.right - productBounds.left
    const productHeight = productBounds.bottom - productBounds.top
    const productCenterX = (productBounds.left + productBounds.right) / 2
    const productCenterY = (productBounds.top + productBounds.bottom) / 2

    // Button center as destination
    const btnCenterX = btnRect.left + btnRect.width / 2
    const btnCenterY = btnRect.top + btnRect.height / 2

    // Start the flying animation
    setFlyingProduct({
      startX: productCenterX,
      startY: productCenterY,
      startWidth: productWidth,
      startHeight: productHeight,
      endX: btnCenterX,
      endY: btnCenterY,
    })

    // After animation duration, show feedback and complete
    setTimeout(() => {
      setFlyingProduct(null)
      setAddedFeedback(true)
      setTimeout(() => {
        onAddToBag()
      }, 300)
    }, 350) // Animation duration
  }

  // ASCII spinner frames
  const spinnerFrames = ['◐', '◓', '◑', '◒']

  // Handle buy now with loading and confirmation
  const handleBuyNow = () => {
    setBuyNowLoading(true)

    // Simulate payment processing
    setTimeout(() => {
      setBuyNowLoading(false)
      setOrderNumber('RVR-' + Math.random().toString(36).substring(2, 8).toUpperCase())
      setShowConfirmation(true)
      // Don't call onBuyNow yet - wait until confirmation is dismissed
    }, 1800)
  }

  // Handle confirmation close
  const handleConfirmationClose = () => {
    setShowConfirmation(false)
    onBuyNow() // Now notify parent to close
  }

  // Format price
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price)
  }

  return (
    <>
      {/* Order Confirmation Popup */}
      {showConfirmation && (
        <>
          <div className="overlay-confirmation-backdrop" onClick={handleConfirmationClose} />
          <div className="overlay-confirmation">
            <div className="overlay-confirmation-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3>Order Confirmed</h3>
            <p>Your payment has been processed successfully.</p>
            <div className="overlay-confirmation-details">
              <span className="overlay-confirmation-order">Order #{orderNumber}</span>
              <span className="overlay-confirmation-product">{product.brand} · {product.name}</span>
            </div>
            <button className="overlay-confirmation-btn" onClick={handleConfirmationClose}>
              Continue
            </button>
          </div>
        </>
      )}

      <div
        ref={overlayRef}
        className={`product-overlay ${isVisible ? 'visible' : ''} ${addedFeedback ? 'added' : ''} ${showConfirmation ? 'dimmed' : ''}`}
        style={{ left: pos.left, top: pos.top }}
        onMouseLeave={showConfirmation || buyNowLoading ? undefined : onClose}
      >
        {/* Product Image */}
        <div className="overlay-image-container">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="overlay-image"
          />
          <div className="overlay-brand-tag">{product.brand}</div>
        </div>

        {/* Product Info */}
        <div className="overlay-content">
          <h3 className="overlay-name">{product.name}</h3>
          <div className="overlay-price">{formatPrice(product.price, product.currency)}</div>

          {/* Action Buttons - side by side */}
          <div className="overlay-actions">
            <button
              ref={addToBagBtnRef}
              className="overlay-btn add-to-bag-btn"
              onClick={handleAddToBag}
              disabled={buyNowLoading}
            >
              {addedFeedback ? (
                <span className="btn-success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Added
                </span>
              ) : (
                'Add to Bag'
              )}
            </button>
            <button
              className={`overlay-btn buy-now-btn ${buyNowLoading ? 'loading' : ''}`}
              onClick={handleBuyNow}
              disabled={buyNowLoading}
            >
              {buyNowLoading ? (
                <span className="btn-loading">
                  <span className="loading-spinner">{spinnerFrames[spinnerFrame]}</span>
                </span>
              ) : (
                'Buy Now'
              )}
            </button>
          </div>
        </div>

        {/* Flying product animation */}
        {flyingProduct && productBounds && (
          <div
            className="flying-product-element"
            style={{
              '--start-x': `${flyingProduct.startX}px`,
              '--start-y': `${flyingProduct.startY}px`,
              '--start-width': `${flyingProduct.startWidth}px`,
              '--start-height': `${flyingProduct.startHeight}px`,
              '--end-x': `${flyingProduct.endX}px`,
              '--end-y': `${flyingProduct.endY}px`,
            } as React.CSSProperties}
          >
            <img src={product.imageUrl} alt="" />
          </div>
        )}
      </div>
    </>
  )
}
