# Consumer UI Specification

## Overview
The consumer-facing interface for Ephemeral - a Pinterest-like platform with subtle product placement in AI-generated mood boards.

## Core Concept
- Users browse floating/drifting image cards (existing Ephemeral UI with physics)
- Images contain subtly integrated products (via Nano Banana Pro image generation)
- When hovering over a product area in an image, a translucent white outline appears
- A glassmorphic overlay with "Add to Bag" and "Buy Now" buttons appears

## Key Features

### 1. Product Integration
- Products are seamlessly integrated into AI-modified photos
- No obvious "ad" feel - products appear natural in lifestyle scenes
- Each image card can have associated product data + mask for hit detection

### 2. Hover-to-Reveal Interaction
- Subtle highlight/tooltip when mouse moves over product area
- Uses mask-based detection (white pixels = product area)
- 800ms hover delay before showing product card (prevents accidental triggers)
- Translucent white outline effect around product on hover

### 3. Glassmorphic Product Overlay
- Appears to the right of cursor, vertically centered
- Shows: Brand, Product Name, Price, Description, Image
- Two buttons side-by-side: "Add to Bag" and "Buy Now"
- Backdrop blur effect for glass-like appearance

### 4. Shopping Bag
- Icon in header/action bar with item count badge
- Slide-in sidebar showing bag contents
- Quantity controls (+/- buttons)
- Remove item option
- Total calculation
- "Checkout" button

### 5. Seamless 1-Click Checkout
- Full-screen payment form (no external redirect)
- Pre-filled payment/shipping info (saved to localStorage)
- Sections: Card details, Billing address
- "Save info for next time" checkbox
- Animated success state

### 6. Smooth Micro-Animations
- Fade-in for product overlay
- Slide-in for shopping bag
- Pulse effect on product highlight
- Checkmark animation on purchase success
- Subtle hover transitions throughout

## Technical Implementation

### Mask-Based Hover Detection
```typescript
// Load mask image into hidden canvas
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d', { willReadFrequently: true })
ctx.drawImage(maskImage, 0, 0)
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

// On mousemove, sample pixel brightness
const pixelIndex = (maskY * canvas.width + maskX) * 4
const brightness = (r + g + b) / 3
const isOverProduct = brightness > 128 // White = product
```

### FloatingCard Extension
```typescript
interface FloatingCard {
  // ... existing fields
  product?: Product      // Product data for shoppable cards
  maskUrl?: string       // Mask image URL for hit detection
}
```

### Product Data Structure
```typescript
interface Product {
  id: string
  name: string
  brand: string
  price: number
  currency: string
  imageUrl: string
  description?: string
}
```

## UI Routes
- Main Ephemeral canvas: `/:configSlug/:sessionSlug` (e.g., `/walden-space/my-session`)
- The product hover features are integrated INTO this existing canvas
- NOT a separate `/consumer` route

## Design Aesthetic
- 4pm Paris light aesthetic
- Warm amber/sepia tones
- Cream backgrounds (#FAF8F3)
- Matte paper texture feel
- Fonts: Crimson Pro (headings), DM Sans (body)
- Glassmorphic overlays with backdrop blur
