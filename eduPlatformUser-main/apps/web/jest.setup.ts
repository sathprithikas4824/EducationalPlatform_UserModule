import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// jsdom doesn't implement matchMedia — needed by AccessibilityContext to read
// prefers-reduced-motion / prefers-color-scheme. Standard test-environment polyfill.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},    // deprecated, kept for older libs
    removeListener: () => {}, // deprecated, kept for older libs
    dispatchEvent: () => false,
  }),
})
