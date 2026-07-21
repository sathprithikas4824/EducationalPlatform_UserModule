import Link from "next/link";

export const metadata = {
  title: "Accessibility Statement — EduPlatform",
  description: "EduPlatform's accessibility conformance status, supported features, and how to report an issue.",
};

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8" style={{ boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)", border: "1px solid rgba(140, 140, 170, 0.2)" }}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Accessibility Statement</h1>
          <p className="text-gray-500 text-sm mb-8">Last reviewed: 2026-07-21</p>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Conformance status</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              EduPlatform targets <strong>WCAG 2.1 Level AA</strong>. We&apos;ve run automated audits
              (axe-core, both in component tests and full-browser end-to-end tests) across every core
              page and manually tested the core flows with keyboard-only navigation and the NVDA screen
              reader. This is an ongoing effort, not a one-time checkbox — see &ldquo;Known limitations&rdquo;
              below for what we haven&apos;t fully verified yet.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">What&apos;s supported</h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
              <li>Full keyboard navigation — every interactive element is reachable and operable via Tab, Enter, Space, and Escape</li>
              <li>Screen reader support — tested with NVDA on Windows; pages announce navigation, form errors, and live status updates (e.g. AI summary generation, bookmarking, liking)</li>
              <li>Visible focus indicators on every focusable element</li>
              <li>Skip-to-content link (first Tab press on any page)</li>
              <li>Adjustable text size and a high-contrast mode, available from Profile → Accessibility</li>
              <li>Respects your system&apos;s reduced-motion preference, with an in-app override</li>
              <li>Accessible modals — focus is trapped inside while open, and returns to the triggering element on close</li>
              <li>Keyboard shortcuts reference — press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600">?</kbd> anywhere in the app</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Known limitations</h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
              <li>VoiceOver (macOS/iOS Safari) has not yet been verified on real Apple hardware — the code has been adjusted for known Safari-specific accessibility differences, but this needs a live device pass to fully confirm</li>
              <li>Color contrast has been checked in real-browser automated scans, but hasn&apos;t had a full manual design review against every color combination in the app</li>
              <li>Some third-party embedded content (e.g. topic videos) relies on the source platform&apos;s own accessibility support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Reporting an issue</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
              If you run into an accessibility barrier anywhere on EduPlatform, please let us know — include
              the page URL, what you were trying to do, and what assistive technology (if any) you were using.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Email:{" "}
              <a href="mailto:accessibility@eduplatform.example" className="font-semibold hover:underline" style={{ color: "#7a12fa" }}>
                accessibility@eduplatform.example
              </a>
              <span className="text-gray-600 dark:text-gray-400"> (replace with your real support address)</span>
            </p>
          </section>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/" className="font-semibold hover:underline" style={{ color: "#7a12fa" }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}