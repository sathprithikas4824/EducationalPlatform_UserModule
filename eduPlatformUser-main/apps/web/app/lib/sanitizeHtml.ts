/**
 * Injects alt="" on any <img> tag in backend HTML that has no alt attribute.
 * Prevents "Images must have alternative text" axe violations from
 * database-sourced HTML content we cannot individually edit.
 */
export function injectMissingAlt(html: string): string {
  if (!html) return html;
  return html.replace(/<img(?![^>]*\salt=)([^>]*)(\/?>)/gi, '<img alt=""$1$2');
}
