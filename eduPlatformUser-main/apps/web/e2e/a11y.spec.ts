/**
 * DAY 20 — Playwright E2E Accessibility Test Suite
 *
 * Unlike __tests__/a11y.audit.test.tsx (jest-axe, jsdom, components rendered in
 * isolation with mocked data), this scans the 6 core pages in a REAL browser
 * against the REAL running dev server — real Supabase data, real client-side
 * data fetching, real CSS (so color-contrast can actually be checked, unlike
 * jsdom which can't compute rendered styles).
 *
 * Run:  pnpm exec playwright test
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const CORE_PAGES = [
  { name: "Home", path: "/" },
  { name: "Login", path: "/login" },
  { name: "Signup", path: "/signup" },
  { name: "Profile", path: "/profile" },
  { name: "Module / Topic content", path: "/modules/1" },
  { name: "Accessibility statement", path: "/accessibility" },
];

for (const page of CORE_PAGES) {
  test(`${page.name} (${page.path}) has no WCAG 2.1 AA violations`, async ({ page: browserPage }) => {
    // "networkidle" never resolves on this app — Supabase realtime subscriptions
    // (e.g. topic like-count sync) keep an open connection, so the network is
    // never truly idle. "load" is reliable instead.
    await browserPage.goto(page.path, { waitUntil: "load" });

    // Wait for the page's own h1 to actually appear before scanning — some pages
    // (e.g. topic content) render a loading skeleton first while fetching from a
    // free-tier backend that can cold-start slowly. Scanning too early would just
    // catch the skeleton, not the real page, and falsely fail page-has-heading-one.
    await browserPage.locator("h1").first().waitFor({ state: "visible", timeout: 45_000 });

    const results = await new AxeBuilder({ page: browserPage })
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      .analyze();

    if (results.violations.length > 0) {
      // Print full detail to the test log — node targets + failure summary —
      // so a failure here is actionable without re-running with a debugger.
      console.log(JSON.stringify(results.violations, null, 2));
    }

    expect(results.violations).toEqual([]);
  });
}