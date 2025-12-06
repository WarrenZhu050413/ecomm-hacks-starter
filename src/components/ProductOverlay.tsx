/**
 * ProductOverlay - Glassmorphic product card that appears on hover
 *
 * Features:
 * - Translucent/glassmorphic overlay
 * - Positioned to the right of mouse, vertically centered
 * - Add to Bag and Buy Now buttons side by side
 * - Smooth micro-animations
 * - "Suck into bag" animation when adding to bag
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

  // Format price
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price)
  }

  return (
    <div
      ref={overlayRef}
      className={`product-overlay ${isVisible ? 'visible' : ''} ${addedFeedback ? 'added' : ''}`}
      style={{ left: pos.left, top: pos.top }}
      onMouseLeave={onClose}
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
            className="overlay-btn buy-now-btn"
            onClick={onBuyNow}
          >
            Buy Now
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
  )
}
