/**
 * Storage layer for blog posts — powered by Prisma + Supabase PostgreSQL.
 *
 * PURPOSE:
 * This file is the ONLY place in the app that talks to the database.
 * Every other file calls these methods instead of writing Prisma queries directly.
 * This keeps database logic in one place — easy to maintain and debug.
 *
 * IMPORTANT — ALL METHODS ARE NOW ASYNC:
 * localStorage was synchronous (instant, in-memory).
 * Prisma queries go over the network to Supabase, so they return Promises.
 * Every method must be `async` and callers must `await` them.
 *
 * PRISMA CHEAT SHEET (methods you'll need):
 *   prisma.post.findMany({ where: {...}, orderBy: {...} })  — get multiple posts
 *   prisma.post.findUnique({ where: { id } })               — get one post by unique field
 *   prisma.post.upsert({ where, create, update })           — create if new, update if exists
 *   prisma.post.delete({ where: { id } })                   — delete a post
 *
 *   where filters:    { published: true }, { slug: "my-post" }
 *   orderBy:          { createdAt: 'desc' }  — newest first
 *   contains:         { title: { contains: query, mode: 'insensitive' } }  — case-insensitive search
 *   OR:               { OR: [ {title: {...}}, {excerpt: {...}} ] }  — match any condition
 *   has (array):      { tags: { has: "react" } }  — check if array contains value
 */

import { prisma } from "./prisma"

// Hint: import prisma from the file you just created (lib/prisma.ts)

// YOUR CODE HERE

export const storage = {
  /**
   * Get all posts (drafts + published), sorted by most recently updated.
   *
   * Hint: prisma.post.findMany({ orderBy: { ??? } })
   * Return type: Promise<Post[]>
   */
  async getAllPosts() {
    // YOUR CODE HERE
   return prisma.post.findMany({orderBy:{updatedAt:'desc'}})
  },

  /**
   * Get only published posts, sorted by creation date (newest first).
   * Used by the blog feed on the home page.
   *
   * Hint: prisma.post.findMany({ where: { ??? }, orderBy: { ??? } })
   */
  async getPublishedPosts() {
    // YOUR CODE HERE
    return prisma.post.findMany({where:{published:true},orderBy:{createdAt:'desc'}})
  },

  /**
   * Find a single post by its ID. Used by /editor/[id] route.
   *
   * Hint: prisma.post.findUnique({ where: { ??? } })
   */
  async getPostById(id: string) {
    // YOUR CODE HERE
    return prisma.post.findUnique({where:{id}})
  },

  /**
   * Create a new post or update an existing one.
   *
   * Hint: prisma.post.upsert({
   *   where: { id: post.id },           — look for existing post with this ID
   *   create: { ...all fields },         — if NOT found, create with these values
   *   update: { ...fields to update },   — if found, update with these values
   * })
   *
   * The `post` parameter has: id, title, slug, content, markdown, excerpt, tags, published
   * You DON'T need to pass createdAt/updatedAt — Prisma handles those automatically
   *   (@default(now()) for createdAt, @updatedAt for updatedAt)
   */
  async savePost(post: {
    id: string
    title: string
    slug: string
    content: string
    markdown: string
    excerpt: string
    tags: string[]
    username: string
    published: boolean
    allowCollaboration?: boolean
  }) {
    // YOUR CODE HERE
    return prisma.post.upsert({
      where:{id:post.id},
      create:{
        id:post.id,
        title:post.title,
        slug:post.slug,
        content:post.content,
        markdown:post.markdown,
        excerpt:post.excerpt,
        tags:post.tags,
        username:post.username,
        published:post.published,
        allowCollaboration: post.allowCollaboration ?? false,
      },
      update:{
        title:post.title,
        // slug intentionally omitted — set once at creation, never changed (stable URLs)
        content:post.content,
        markdown:post.markdown,
        excerpt:post.excerpt,
        tags:post.tags,
        // username intentionally omitted — post author never changes on update
        published:post.published,
        // undefined → Prisma skips the field (only set by explicit publish action)
        allowCollaboration: post.allowCollaboration,
      },
    })
  },

  /**
   * Get all posts (drafts + published) by a specific username.
   * Used by the "My Posts" page.
   */
  async getPostsByUsername(username: string) {
    return prisma.post.findMany({
      where: { username },
      orderBy: { updatedAt: 'desc' },
    })
  },

  /**
   * Delete a post by its ID.
   *
   * Hint: prisma.post.delete({ where: { ??? } })
   */
  async deletePost(id: string) {
    // YOUR CODE HERE
     return prisma.post.delete({where:{id}})  // FIX: return instead of await (so caller gets the result)
  },

  /**
   * Search published posts by a query string.
   * Should match against title OR excerpt (case-insensitive).
   * Only return published posts.
   *
   * Hint: prisma.post.findMany({
   *   where: {
   *     published: true,
   *     OR: [
   *       { title: { contains: query, mode: 'insensitive' } },
   *       { excerpt: { contains: ???, mode: ??? } },
   *     ]
   *   }
   * })
   */
  async searchPosts(query: string) {
    // FIX: OR must be inside where, each condition needs { contains, mode }
    return prisma.post.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
        ],
      },
    })
  },
}
