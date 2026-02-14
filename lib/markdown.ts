/**
 * HTML-to-Markdown conversion using Turndown.
 *
 * This handles one direction: HTML -> Markdown.
 * Called when saving a post — converts TipTap's HTML output into markdown for storage.
 *
 * The reverse direction (Markdown -> rendered output) is handled directly in components
 * using <ReactMarkdown> with remark-gfm and rehype-highlight plugins.
 */

import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',          // Use # style headings (not underline style)
  codeBlockStyle: 'fenced',     // Use ``` for code blocks (not indentation)
  bulletListMarker: '-',        // Use - for unordered lists
})

/**
 * Convert an HTML string (from TipTap editor) to Markdown.
 * Returns empty string for empty/default editor content.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return ''
  return turndown.turndown(html)
}
