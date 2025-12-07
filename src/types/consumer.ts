/**
 * Consumer-facing types for product discovery and shopping
 */

export interface Product {
  id: string
  name: string
  brand: string
  price: number
  currency: string
  imageUrl: string
  description?: string
}

export interface AdvertiserImageSet {
  id: string
  sceneImageUrl: string      // The integrated scene with product
  maskImageUrl: string       // White = product area for hit detection
  product: Product
  originalBackgroundUrl?: string
}

export interface BagItem {
  product: Product
  quantity: number
  addedAt: Date
}

export interface PaymentInfo {
  cardNumber: string
  cardHolder: string
  expiry: string
  cvv: string
  address: string
  city: string
  zip: string
  country: string
}
