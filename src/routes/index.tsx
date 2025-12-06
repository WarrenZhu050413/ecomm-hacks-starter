/**
 * Route definitions for Ephemeral.
 *
 * URL patterns:
 * - / → OnboardingFlow (create/select config)
 * - /prototype → Paris Drafting Table (product placement testing)
 * - /:configSlug → NewSessionRoute (prompts for name, creates session)
 * - /:configSlug/:sessionSlug → CanvasRoute (loads and renders canvas)
 * - * → NotFound
 */

import { createBrowserRouter } from 'react-router-dom'
import OnboardingFlow from '@/components/OnboardingFlow'
import { NewSessionRoute } from './NewSessionRoute'
import { CanvasRoute } from './CanvasRoute'
import { NotFound } from './NotFound'
import DraftingTable from '@/prototypes/paris-drafting-table/DraftingTable'
import DraftingTableV2 from '@/prototypes/paris-drafting-table/DraftingTableV2'
import { ProductPlacement } from '@/console'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <OnboardingFlow />,
  },
  {
    path: '/console',
    element: <ProductPlacement />,
  },
  {
    path: '/prototype',
    element: <DraftingTable />,
  },
  {
    path: '/prototype/v2',
    element: <DraftingTableV2 />,
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
