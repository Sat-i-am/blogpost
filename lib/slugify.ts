/**
 * URL slug utilities.
 * Converts post titles into URL-safe slugs for clean URLs like /post/my-first-blog-post
 */

/**
 * Convert a title string into a URL-safe slug.
 * - Lowercases everything
 * - Strips special characters (keeps letters, numbers, spaces, hyphens)
 * - Replaces spaces/underscores with hyphens
 * - Collapses multiple hyphens into one
 *
 * Example: "Hello World! (Part 2)" -> "hello-world-part-2"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')    // remove special chars
    .replace(/[\s_]+/g, '-')     // spaces/underscores to hyphens
    .replace(/-+/g, '-')         // collapse multiple hyphens
    .replace(/^-|-$/g, '')       // trim leading/trailing hyphens
}

/**
 * Generate a unique slug by checking against existing slugs.
 * If "hello-world" already exists, returns "hello-world-2", "hello-world-3", etc.
 */
export function uniqueSlug(title: string, existingSlugs: string[]): string {
  const base = slugify(title)
  if (!existingSlugs.includes(base)) return base

  let i = 2
  while (existingSlugs.includes(`${base}-${i}`)) i++
  return `${base}-${i}`
}
