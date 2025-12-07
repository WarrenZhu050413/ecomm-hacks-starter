/**
 * Route definitions for Reverie.
 *
 * URL patterns:
 * - /console → Product placement console
 * - /gallery → AI-generated scroll-triggered gallery
 */

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { GenerativeGalleryRoute } from './GenerativeGalleryRoute'
import { Console } from '@/console'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/gallery" replace />,
  },
  {
    path: '/console',
    element: <Console />,
  },
  {
    path: '/gallery',
    element: <GenerativeGalleryRoute />,
  },
  {
    path: '/gallery/debug',
    element: <GenerativeGalleryRoute debugMode />,
  },
  {
    path: '*',
    element: <Navigate to="/gallery" replace />,
  },
])
