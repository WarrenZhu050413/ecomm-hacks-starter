/**
 * End-to-end tests for session cost tracking.
 */

import { test, expect } from '@playwright/test'

// Test fixtures for localStorage
const TEST_CONFIG_SLUG = 'test-config'
const TEST_SESSION_SLUG = 'test-session'
const TEST_SESSION_ID = 's-1733186400000-abc123'

const testConfig = {
  slug: TEST_CONFIG_SLUG,
  config: {
    name: 'Test Config',
    slug: TEST_CONFIG_SLUG,
    hintText: 'Test hint',
    cardSchema: {
      fields: [{ name: 'content', type: 'text' }],
    },
    cardTheme: {
      container: 'bg-gray-800 rounded-lg p-4',
      primary: 'text-white text-lg font-bold',
      secondary: 'text-gray-300',
      meta: 'text-gray-500 text-xs',
      dragging: null,
    },
    canvasTheme: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      accent: '#6366f1',
    },
    generationContext: 'Test context',
    directives: ['test directive'],
    seedContent: [],
    physics: {
      cardLifetime: 30,
      driftSpeed: 1,
      jiggle: 0.5,
      bounce: 0.5,
    },
    models: {
      generation: 'haiku',
      chat: 'haiku',
      onboarding: 'haiku',
    },
    spawning: {
      intervalSeconds: 10,
      minCards: 3,
    },
    writingPane: {
      title: 'Your thoughts',
      placeholder: 'Write here...',
    },
  },
  createdAt: 1733186400000,
}

function createTestSession(totalCostUsd: number, generationCount: number) {
  return {
    id: TEST_SESSION_ID,
    slug: TEST_SESSION_SLUG,
    name: 'Test Session',
    configSlug: TEST_CONFIG_SLUG,
    timestamp: 1733186400000,
    state: {
      cards: [],
      savedCards: [],
      userComposition: 'Test composition',
    },
    totalCostUsd,
    generationCount,
  }
}

test.describe('Session Cost Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and set up test data
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('displays cost badge when session has cost data', async ({ page }) => {
    // Set up localStorage with config and session that has cost
    await page.evaluate(
      ({ config, session }) => {
        localStorage.setItem(
          'ephemeral_configs_v2',
          JSON.stringify({ [config.slug]: config })
        )
        localStorage.setItem(
          'ephemeral_sessions_v2',
          JSON.stringify({ [session.id]: session })
        )
      },
      {
        config: testConfig,
        session: createTestSession(0.0048, 4),
      }
    )

    // Navigate to the session
    await page.goto(`/${TEST_CONFIG_SLUG}/${TEST_SESSION_SLUG}`)

    // Wait for canvas to load
    await page.waitForSelector('[data-testid="session-cost-badge"]', {
      timeout: 10000,
    })

    // Verify cost badge is visible with correct values
    const badge = page.locator('[data-testid="session-cost-badge"]')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('$0.0048')
    await expect(badge).toContainText('4 gen')
  })

  test('does not display cost badge when cost is zero', async ({ page }) => {
    // Set up localStorage with session that has zero cost
    await page.evaluate(
      ({ config, session }) => {
        localStorage.setItem(
          'ephemeral_configs_v2',
          JSON.stringify({ [config.slug]: config })
        )
        localStorage.setItem(
          'ephemeral_sessions_v2',
          JSON.stringify({ [session.id]: session })
        )
      },
      {
        config: testConfig,
        session: createTestSession(0, 0),
      }
    )

    await page.goto(`/${TEST_CONFIG_SLUG}/${TEST_SESSION_SLUG}`)

    // Wait for page to load (wait for canvas container)
    await page.waitForSelector('.relative.h-screen', { timeout: 10000 })

    // Badge should not be visible when cost is zero
    const badge = page.locator('[data-testid="session-cost-badge"]')
    // The wrapper div exists but SessionCostBadge returns null
    await expect(badge.locator('span')).toHaveCount(0)
  })

  test('cost accumulates correctly in localStorage', async ({ page }) => {
    // Set up localStorage with session that has initial cost
    await page.evaluate(
      ({ config, session }) => {
        localStorage.setItem(
          'ephemeral_configs_v2',
          JSON.stringify({ [config.slug]: config })
        )
        localStorage.setItem(
          'ephemeral_sessions_v2',
          JSON.stringify({ [session.id]: session })
        )
      },
      {
        config: testConfig,
        session: createTestSession(0.001, 1),
      }
    )

    await page.goto(`/${TEST_CONFIG_SLUG}/${TEST_SESSION_SLUG}`)

    // Wait for canvas to load
    await page.waitForSelector('.relative.h-screen', { timeout: 10000 })

    // Simulate adding cost directly via addSessionCost (tests the integration)
    await page.evaluate((sessionId: string) => {
      // Load sessions, add cost, save back (mimics what addSessionCost does)
      const data = localStorage.getItem('ephemeral_sessions_v2')
      if (data) {
        const sessions = JSON.parse(data)
        if (sessions[sessionId]) {
          sessions[sessionId].totalCostUsd += 0.0012
          sessions[sessionId].generationCount += 1
          localStorage.setItem(
            'ephemeral_sessions_v2',
            JSON.stringify(sessions)
          )
        }
      }
    }, TEST_SESSION_ID)

    // Reload to verify persistence and badge update
    await page.reload()

    // Wait for badge
    await page.waitForSelector('[data-testid="session-cost-badge"]', {
      timeout: 10000,
    })

    // Verify accumulated cost is displayed
    const badge = page.locator('[data-testid="session-cost-badge"]')
    await expect(badge).toContainText('$0.0022') // 0.001 + 0.0012
    await expect(badge).toContainText('2 gen') // 1 + 1
  })

  test('cost persists across page reloads', async ({ page }) => {
    const initialCost = 0.0036
    const initialCount = 3

    // Set up localStorage with session that has cost
    await page.evaluate(
      ({ config, session }) => {
        localStorage.setItem(
          'ephemeral_configs_v2',
          JSON.stringify({ [config.slug]: config })
        )
        localStorage.setItem(
          'ephemeral_sessions_v2',
          JSON.stringify({ [session.id]: session })
        )
      },
      {
        config: testConfig,
        session: createTestSession(initialCost, initialCount),
      }
    )

    // Navigate to session
    await page.goto(`/${TEST_CONFIG_SLUG}/${TEST_SESSION_SLUG}`)

    // Wait for badge to appear
    await page.waitForSelector('[data-testid="session-cost-badge"]', {
      timeout: 10000,
    })

    // Verify initial values
    const badge = page.locator('[data-testid="session-cost-badge"]')
    await expect(badge).toContainText('$0.0036')

    // Reload page
    await page.reload()

    // Wait for badge again
    await page.waitForSelector('[data-testid="session-cost-badge"]', {
      timeout: 10000,
    })

    // Verify values persisted
    await expect(badge).toContainText('$0.0036')
    await expect(badge).toContainText('3 gen')
  })
})
