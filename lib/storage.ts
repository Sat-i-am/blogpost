/**
 * Storage abstraction layer for blog posts.
 *
 * Currently uses localStorage, but designed so swapping to a database (e.g. Prisma, Supabase)
 * only requires changing the internals of these methods — the rest of the app stays the same.
 *
 * All posts are stored as a JSON array under the "blog-posts" key in localStorage.
 */

import { BlogPost } from './types'

const STORAGE_KEY = 'blog-posts'

/** Read all posts from localStorage. Returns [] if empty or on server (SSR). */
function getAll(): BlogPost[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

/** Write the full posts array to localStorage. */
function saveAll(posts: BlogPost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export const storage = {
  /** Get all posts (drafts + published), sorted by most recently updated. */
  getAllPosts(): BlogPost[] {
    return getAll().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  /** Get only published posts, sorted by creation date (newest first). Used for the blog feed. */
  getPublishedPosts(): BlogPost[] {
    return getAll()
      .filter((p) => p.published)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  /** Find a post by its URL slug. Used by /post/[slug] route. */
  getPostBySlug(slug: string): BlogPost | undefined {
    return getAll().find((p) => p.slug === slug)
  },

  /** Find a post by its unique ID. Used by /editor/[id] route for editing. */
  getPostById(id: string): BlogPost | undefined {
    return getAll().find((p) => p.id === id)
  },

  /**
   * Save a post (create or update).
   * If a post with the same ID exists, it's replaced. Otherwise a new entry is added.
   * Always updates the `updatedAt` timestamp.
   */
  savePost(post: BlogPost): BlogPost {
    const posts = getAll()
    const index = posts.findIndex((p) => p.id === post.id)
    post.updatedAt = new Date().toISOString()

    if (index >= 0) {
      posts[index] = post
    } else {
      posts.push(post)
    }

    saveAll(posts)
    return post
  },

  /** Delete a post by ID. */
  deletePost(id: string): void {
    saveAll(getAll().filter((p) => p.id !== id))
  },

  /**
   * Search published posts by query string.
   * Matches against title, excerpt, and tags (case-insensitive).
   * Used by the SearchBar component on the feed page.
   */
  searchPosts(query: string): BlogPost[] {
    const q = query.toLowerCase()
    return getAll()
      .filter((p) => p.published)
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
  },
}
