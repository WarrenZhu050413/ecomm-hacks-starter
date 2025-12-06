/**
 * Route definitions for Ephemeral.
 *
 * URL patterns:
 * - / → OnboardingFlow (create/select config)
 * - /:configSlug → NewSessionRoute (prompts for name, creates session)
 * - /:configSlug/:sessionSlug → CanvasRoute (loads and renders canvas)
 * - * → NotFound
 */

import { createBrowserRouter } from 'react-router-dom'
import OnboardingFlow from '@/components/OnboardingFlow'
import { NewSessionRoute } from './NewSessionRoute'
import { CanvasRoute } from './CanvasRoute'
import { NotFound } from './NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <OnboardingFlow />,
  },
  {
    path: '/:configSlug',
    element: <NewSessionRoute />,
  },
  {
    path: '/:configSlug/:sessionSlug',
    element: <CanvasRoute />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
])
