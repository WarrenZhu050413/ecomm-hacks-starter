/**
 * SessionCostBadge - Displays accumulated cost for a session.
 */

import { getSessionCost } from '@/services/sessionRegistry'

interface SessionCostBadgeProps {
  sessionId: string
}

/**
 * Displays session cost in a compact badge format.
 * Returns null if session has no cost (0) or doesn't exist.
 */
export function SessionCostBadge({ sessionId }: SessionCostBadgeProps) {
  const cost = getSessionCost(sessionId)

  // Don't render if no cost data or zero cost
  if (!cost || cost.totalCostUsd === 0) {
    return null
  }

  const formattedCost = cost.totalCostUsd.toFixed(4)
  const genText = `${cost.generationCount} gen`

  return (
    <div className="flex items-center gap-1 text-xs text-white/50">
      <span>${formattedCost}</span>
      <span className="text-white/30">({genText})</span>
    </div>
  )
}
