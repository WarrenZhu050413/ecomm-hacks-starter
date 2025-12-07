/**
 * UserProfile - Minimal profile modal for shipping/payment info
 *
 * Features:
 * - Login icon in top right
 * - Minimal modal for entering user info
 * - Saves to localStorage for 1-click checkout
 */

import { useState, useEffect } from 'react'
import type { PaymentInfo } from '../types/consumer'
import './UserProfile.css'

interface UserProfileProps {
  savedInfo: PaymentInfo | null
  onSaveInfo: (info: PaymentInfo) => void
  isOpen: boolean
  onClose: () => void
}

export function UserProfile({ savedInfo, onSaveInfo, isOpen, onClose }: UserProfileProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Form state
  const [cardNumber, setCardNumber] = useState(savedInfo?.cardNumber || '')
  const [cardHolder, setCardHolder] = useState(savedInfo?.cardHolder || '')
  const [expiry, setExpiry] = useState(savedInfo?.expiry || '')
  const [cvv, setCvv] = useState(savedInfo?.cvv || '')
  const [address, setAddress] = useState(savedInfo?.address || '')
  const [city, setCity] = useState(savedInfo?.city || '')
  const [zip, setZip] = useState(savedInfo?.zip || '')
  const [country, setCountry] = useState(savedInfo?.country || 'United States')

  // Animate in when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    }
  }, [isOpen])

  // Update form when savedInfo changes
  useEffect(() => {
    if (savedInfo) {
      setCardNumber(savedInfo.cardNumber || '')
      setCardHolder(savedInfo.cardHolder || '')
      setExpiry(savedInfo.expiry || '')
      setCvv(savedInfo.cvv || '')
      setAddress(savedInfo.address || '')
      setCity(savedInfo.city || '')
      setZip(savedInfo.zip || '')
      setCountry(savedInfo.country || 'United States')
    }
  }, [savedInfo])

  // Handle close with animation
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
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

  // Handle save
  const handleSave = () => {
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
    handleClose()
  }

  // Check if form has any data
  const hasData = cardNumber || cardHolder || address

  if (!isOpen) return null

  return (
    <div className={`profile-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-header">
          <h2>Your Info</h2>
          <button className="profile-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="profile-subtitle">
          Save your info for 1-click checkout
        </p>

        <div className="profile-form">
          {/* Payment Section */}
          <div className="profile-section">
            <h3>Payment</h3>
            <div className="profile-field">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="Card number"
                maxLength={19}
              />
            </div>
            <div className="profile-field">
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Name on card"
              />
            </div>
            <div className="profile-row">
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
              />
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                placeholder="CVV"
                maxLength={4}
              />
            </div>
          </div>

          {/* Shipping Section */}
          <div className="profile-section">
            <h3>Shipping</h3>
            <div className="profile-field">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="profile-row">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP"
              />
            </div>
            <div className="profile-field">
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

        <button className="profile-save" onClick={handleSave}>
          {hasData ? 'Save Info' : 'Skip for Now'}
        </button>

        {savedInfo && (
          <p className="profile-saved-hint">
            Your info is saved for 1-click checkout
          </p>
        )}
      </div>
    </div>
  )
}
