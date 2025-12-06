/**
 * ConsumerRoute - Demo consumer interface using ConsumerGallery
 *
 * Features:
 * - Image-only scrollable gallery
 * - Luxury brand product placements
 * - Hover to pause, double-click to expand
 * - Infinite scroll with fade zones
 */

import ConsumerGallery from '@/components/ConsumerGallery'

interface ConsumerRouteProps {
  debugMode?: boolean
}

export function ConsumerRoute({ debugMode = false }: ConsumerRouteProps) {
  return <ConsumerGallery debugMode={debugMode} />
}

export default ConsumerRoute
