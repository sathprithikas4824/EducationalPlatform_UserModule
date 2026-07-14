/**
 * DAY 1 — Accessibility Audit Test Suite
 *
 * Renders each core page inside required providers, then runs axe-core WCAG 2.1 AA scan.
 * Run:  pnpm test:a11y
 */

import React from 'react'
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'

// ─── MOCK DEPENDENCIES ──────────────────────────────────────────────────────

jest.mock('../app/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
  signIn: jest.fn(),
  signUp: jest.fn(),
  signInWithOAuth: jest.fn(),
  getAccessibilityPreferences: jest.fn().mockResolvedValue(null),
  updateAccessibilityPreferences: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({ get: jest.fn() })),
}))

// Suppress jsdom canvas-not-implemented noise — we don't test color contrast here
const { error: origError } = console
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((msg, ...args) => {
    if (typeof msg === 'string' && msg.includes('HTMLCanvasElement')) return
    origError(msg, ...args)
  })
})
afterAll(() => {
  (console.error as jest.Mock).mockRestore()
})

// ─── AXE CONFIG: skip color-contrast (needs real CSS/canvas to measure) ─────

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'best-practice'] },
  rules: {
    'color-contrast': { enabled: false }, // jsdom can't compute computed styles
  },
}

async function runA11yCheck(ui: React.ReactElement) {
  const { container } = render(ui)
  return axe(container, axeOptions)
}

// ─── LOGIN PAGE ──────────────────────────────────────────────────────────────

describe('Login Page', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const { default: LoginPage } = await import('../app/login/page')
    const { AccessibilityProvider } = await import('../app/context/AccessibilityContext')
    const results = await runA11yCheck(
      <AccessibilityProvider>
        <LoginPage />
      </AccessibilityProvider>
    )
    expect(results).toHaveNoViolations()
  })

  it('all text inputs have associated labels (htmlFor + id)', async () => {
    const { default: LoginPage } = await import('../app/login/page')
    const { AccessibilityProvider } = await import('../app/context/AccessibilityContext')
    const { container } = render(
      <AccessibilityProvider>
        <LoginPage />
      </AccessibilityProvider>
    )
    const unlinkedLabels = Array.from(container.querySelectorAll('label')).filter(
      label => !label.htmlFor && !label.getAttribute('aria-label')
    )
    // All labels are now correctly linked via htmlFor/id — hard assertion.
    expect(unlinkedLabels.length).toBe(0)
  })

  it('submit button has accessible name', async () => {
    const { default: LoginPage } = await import('../app/login/page')
    const { AccessibilityProvider } = await import('../app/context/AccessibilityContext')
    const { getByRole } = render(
      <AccessibilityProvider>
        <LoginPage />
      </AccessibilityProvider>
    )
    // Exact match — "Sign in" (submit) vs "Sign in with Google" (OAuth) both
    // matched the old loose /sign in/i regex once the Google button gained a
    // real aria-label; getByRole throws if not found — acts as assertion.
    getByRole('button', { name: 'Sign in' })
  })
})

// ─── SIGNUP PAGE ─────────────────────────────────────────────────────────────

describe('Signup Page', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const { default: SignupPage } = await import('../app/signup/page')
    const { AccessibilityProvider } = await import('../app/context/AccessibilityContext')
    const results = await runA11yCheck(
      <AccessibilityProvider>
        <SignupPage />
      </AccessibilityProvider>
    )
    expect(results).toHaveNoViolations()
  })
})

// ─── HOME / DASHBOARD ────────────────────────────────────────────────────────

describe('Home Page', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const { default: HomePage } = await import('../app/page')
    const { OfflineProvider } = await import('../app/components/common/OfflineContext')
    const { AnnotationProvider } = await import('../app/components/common/AnnotationProvider')
    const { AccessibilityProvider } = await import('../app/context/AccessibilityContext')
    const results = await runA11yCheck(
      <AccessibilityProvider>
        <OfflineProvider>
          <AnnotationProvider>
            <HomePage />
          </AnnotationProvider>
        </OfflineProvider>
      </AccessibilityProvider>
    )
    expect(results).toHaveNoViolations()
  })
})

// ─── PROFILE PAGE ────────────────────────────────────────────────────────────

describe('Profile Page', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const { default: ProfilePage } = await import('../app/profile/page')
    const { AnnotationProvider } = await import('../app/components/common/AnnotationProvider')
    const { OfflineProvider } = await import('../app/components/common/OfflineContext')
    const results = await runA11yCheck(
      <OfflineProvider>
        <AnnotationProvider>
          <ProfilePage />
        </AnnotationProvider>
      </OfflineProvider>
    )
    expect(results).toHaveNoViolations()
  })
})

// ─── OFFLINE PAGE ────────────────────────────────────────────────────────────

describe('Offline Page', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const { default: OfflinePage } = await import('../app/offline/page')
    const results = await runA11yCheck(<OfflinePage />)
    expect(results).toHaveNoViolations()
  })
})
