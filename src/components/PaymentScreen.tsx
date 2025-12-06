/**
 * PaymentScreen - Full-screen checkout with pre-filled info
 *
 * Features:
 * - Order summary
 * - Payment form with saved info
 * - Shipping address
 * - Smooth purchase animation
 */

import { useState, useEffect } from 'react'
import type { BagItem, PaymentInfo } from './ConsumerCanvas'
import './PaymentScreen.css'

interface PaymentScreenProps {
  items: BagItem[]
  total: number
  savedInfo: PaymentInfo | null
  onSaveInfo: (info: PaymentInfo) => void
  onComplete: () => void
  onClose: () => void
  success: boolean
}

export function PaymentScreen({
  items,
  total,
  savedInfo,
  onSaveInfo,
  onComplete,
  onClose,
  success
}: PaymentScreenProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [saveInfo, setSaveInfo] = useState(true)

  // Form state
  const [cardNumber, setCardNumber] = useState(savedInfo?.cardNumber || '')
  const [cardHolder, setCardHolder] = useState(savedInfo?.cardHolder || '')
  const [expiry, setExpiry] = useState(savedInfo?.expiry || '')
  const [cvv, setCvv] = useState(savedInfo?.cvv || '')
  const [address, setAddress] = useState(savedInfo?.address || '')
  const [city, setCity] = useState(savedInfo?.city || '')
  const [zip, setZip] = useState(savedInfo?.zip || '')
  const [country, setCountry] = useState(savedInfo?.country || 'United States')

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  // Handle close with animation
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const groups = numbers.match(/.{1,4}/g)
    return groups ? groups.join(' ').substring(0, 19) : ''
  }

  // Format expiry
  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length >= 2) {
      return numbers.substring(0, 2) + '/' + numbers.substring(2, 4)
    }
    return numbers
  }

  // Handle purchase
  const handlePurchase = async () => {
    setIsProcessing(true)

    // Save info if checked
    if (saveInfo) {
      onSaveInfo({
        cardNumber,
        cardHolder,
        expiry,
        cvv,
        address,
        city,
        zip,
        country
      })
    }

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500))

    setIsProcessing(false)
    onComplete()
  }

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Check if form is valid
  const isFormValid = cardNumber.length >= 16 &&
    cardHolder.length > 0 &&
    expiry.length === 5 &&
    cvv.length >= 3 &&
    address.length > 0 &&
    city.length > 0 &&
    zip.length > 0

  return (
    <div className={`payment-screen ${isVisible ? 'visible' : ''}`}>
      {/* Success State */}
      {success && (
        <div className="payment-success">
          <div className="success-animation">
            <svg className="success-checkmark" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h2>Order Confirmed</h2>
          <p>Thank you for your purchase!</p>
        </div>
      )}

      {/* Main Content */}
      {!success && (
        <>
          {/* Header */}
          <div className="payment-header">
            <button className="payment-back" onClick={handleClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
            <h1>Checkout</h1>
            <div className="payment-secure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Secure
            </div>
          </div>

          <div className="payment-content">
            {/* Order Summary */}
            <div className="order-summary">
              <h2>Order Summary</h2>
              <div className="summary-items">
                {items.map(item => (
                  <div key={item.product.id} className="summary-item">
                    <img src={item.product.imageUrl} alt={item.product.name} />
                    <div className="summary-item-info">
                      <span className="summary-item-brand">{item.product.brand}</span>
                      <span className="summary-item-name">{item.product.name}</span>
                      <span className="summary-item-qty">Qty: {item.quantity}</span>
                    </div>
                    <span className="summary-item-price">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="summary-total">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="payment-form">
              <h2>Payment Details</h2>

              <div className="form-section">
                <h3>Card Information</h3>
                <div className="form-row">
                  <div className="form-field full">
                    <label>Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field full">
                    <label>Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Expiry</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div className="form-field">
                    <label>CVV</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Shipping Address</h3>
                <div className="form-row">
                  <div className="form-field full">
                    <label>Street Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                    />
                  </div>
                  <div className="form-field">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="10001"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field full">
                    <label>Country</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)}>
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>France</option>
                      <option>Germany</option>
                      <option>Australia</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save info checkbox */}
              <label className="save-info-checkbox">
                <input
                  type="checkbox"
                  checked={saveInfo}
                  onChange={(e) => setSaveInfo(e.target.checked)}
                />
                <span>Save my information for faster checkout</span>
              </label>

              {/* Purchase Button */}
              <button
                className={`purchase-btn ${isProcessing ? 'processing' : ''}`}
                onClick={handlePurchase}
                disabled={!isFormValid || isProcessing}
              >
                {isProcessing ? (
                  <span className="processing-state">
                    <span className="spinner" />
                    Processing...
                  </span>
                ) : (
                  `Pay ${formatPrice(total)}`
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
