/**
 * Core data types for the blog platform.
 * All blog post data flows through this interface — storage, editor, feed, and SEO.
 */

export interface BlogPost {
  id: string            // Unique identifier (crypto.randomUUID)
  title: string         // Post title entered by the user
  slug: string          // URL-safe version of title, used in /post/[slug] routes
  content: string       // Raw HTML from TipTap editor (used for editing)
  markdown: string      // Converted markdown via turndown (used for rendering with react-markdown)
  excerpt: string       // First ~150 chars of plain text, shown in post cards & SEO descriptions
  tags: string[]        // User-defined tags for categorization and filtering
  createdAt: string     // ISO 8601 timestamp — set once on first save
  updatedAt: string     // ISO 8601 timestamp — updated on every save
  username: string      // Author username
  published: boolean    // false = draft (only visible in editor), true = visible on feed
}
