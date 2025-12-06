/**
 * ProductOverlay - Glassmorphic product card that appears on hover
 *
 * Features:
 * - Translucent/glassmorphic overlay
 * - Positioned to the right of mouse, vertically centered
 * - Add to Bag and Buy Now buttons side by side
 * - Smooth micro-animations
 */

import { useEffect, useRef, useState } from 'react'
import type { Product } from './ConsumerCanvas'
import './ProductOverlay.css'

interface ProductOverlayProps {
  product: Product
  position: { x: number; y: number }
  onAddToBag: () => void
  onBuyNow: () => void
  onClose: () => void
}

export function ProductOverlay({
  product,
  position,
  onAddToBag,
  onBuyNow,
  onClose
}: ProductOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [addedFeedback, setAddedFeedback] = useState(false)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  // Calculate position - to the right of cursor, vertically centered
  const calculatePosition = () => {
    const gap = 24
    const cardWidth = 240
    const cardHeight = 260

    let left = position.x + gap
    let top = position.y - cardHeight / 2

    // Flip to left if would overflow right edge
    if (left + cardWidth > window.innerWidth - 20) {
      left = position.x - cardWidth - gap
    }

    // Keep vertically in bounds
    if (top < 20) top = 20
    if (top + cardHeight > window.innerHeight - 20) {
      top = window.innerHeight - cardHeight - 20
    }

    return { left, top }
  }

  const pos = calculatePosition()

  // Handle add to bag with feedback
  const handleAddToBag = () => {
    setAddedFeedback(true)
    setTimeout(() => {
      onAddToBag()
    }, 400)
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
    </div>
  )
}
