/**
 * ShoppingBag - Slide-in sidebar showing bag contents
 *
 * Features:
 * - Glassmorphic design
 * - Quantity controls
 * - Remove items
 * - Checkout button with loading animation
 * - Order confirmation popup
 */

import { useEffect, useState, useRef } from 'react'
import type { BagItem } from '../types/consumer'
import './ShoppingBag.css'

interface ShoppingBagProps {
  items: BagItem[]
  onClose: () => void
  onRemove: (productId: string) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onCheckout: () => void
  total: number
}

// ASCII spinner frames
const spinnerFrames = ['◐', '◓', '◑', '◒']

export function ShoppingBag({
  items,
  onClose,
  onRemove,
  onUpdateQuantity,
  onCheckout,
  total
}: ShoppingBagProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [spinnerFrame, setSpinnerFrame] = useState(0)
  const spinnerInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  // Spinner animation
  useEffect(() => {
    if (isLoading) {
      spinnerInterval.current = setInterval(() => {
        setSpinnerFrame(prev => (prev + 1) % spinnerFrames.length)
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
  }, [isLoading])

  // Handle close with animation
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  // Handle checkout with loading and confirmation
  const handleCheckout = () => {
    setIsLoading(true)

    // Simulate payment processing
    setTimeout(() => {
      setIsLoading(false)
      // Generate order number once and store it
      setOrderNumber('RVR-' + Math.random().toString(36).substring(2, 8).toUpperCase())
      setShowConfirmation(true)

      // Clear the bag after successful checkout
      onCheckout()
    }, 1800)
  }

  // Handle confirmation close
  const handleConfirmationClose = () => {
    setShowConfirmation(false)
    handleClose()
  }

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`bag-backdrop ${isVisible ? 'visible' : ''}`}
        onClick={showConfirmation ? handleConfirmationClose : handleClose}
      />

      {/* Order Confirmation Popup */}
      {showConfirmation && (
        <div className="order-confirmation">
          <div className="confirmation-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Order Confirmed</h2>
          <p>Your payment has been processed successfully.</p>
          <div className="confirmation-details">
            <span className="confirmation-order">Order #{orderNumber}</span>
            <span className="confirmation-email">Confirmation sent to your email</span>
          </div>
          <button className="confirmation-btn" onClick={handleConfirmationClose}>
            Continue Shopping
          </button>
        </div>
      )}

      {/* Bag Panel */}
      <div className={`bag-panel ${isVisible ? 'visible' : ''} ${showConfirmation ? 'dimmed' : ''}`}>
        {/* Header */}
        <div className="bag-header">
          <h2>Your Bag</h2>
          <button className="bag-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="bag-items">
          {items.length === 0 ? (
            <div className="bag-empty">
              <svg className="bag-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <p>Your bag is empty</p>
              <span>Discover products by hovering over items in the feed</span>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="bag-item">
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="bag-item-image"
                />
                <div className="bag-item-details">
                  <span className="bag-item-brand">{item.product.brand}</span>
                  <span className="bag-item-name">{item.product.name}</span>
                  <span className="bag-item-price">
                    {formatPrice(item.product.price)}
                  </span>
                </div>
                <div className="bag-item-actions">
                  <div className="quantity-controls">
                    <button
                      className="quantity-btn"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="quantity-value">{item.quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => onRemove(item.product.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with total and checkout */}
        {items.length > 0 && (
          <div className="bag-footer">
            <div className="bag-total">
              <span>Total</span>
              <span className="total-amount">{formatPrice(total)}</span>
            </div>
            <button
              className={`checkout-btn ${isLoading ? 'loading' : ''}`}
              onClick={handleCheckout}
              disabled={isLoading}
            >
              <span className="btn-content">
                {isLoading ? (
                  <>
                    <span className="loading-spinner">{spinnerFrames[spinnerFrame]}</span>
                    <span>Processing...</span>
                  </>
                ) : (
                  'Checkout'
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
