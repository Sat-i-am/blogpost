/**
 * API Route: /api/posts/slug/[slug]
 *
 * PURPOSE:
 * Fetches a single post by its URL slug (e.g., "my-first-post").
 * Used by the public post page: /post/[slug]
 *
 * Why a separate route from /api/posts/[id]?
 *   - The post VIEW page uses slugs in the URL (prettier, SEO-friendly)
 *   - The EDITOR page uses IDs (guaranteed unique, never changes)
 *   - So we need both lookup methods
 *
 * One HTTP method:
 *   GET /api/posts/slug/my-first-post  → fetch post by slug
 *
 * REMINDER: await params before accessing .slug (Next.js 16)
 */

import { storage } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

// Hint: same imports as the other route files

// YOUR IMPORTS HERE


/**
 * GET /api/posts/slug/[slug]
 *
 * Fetches a single post by its URL slug.
 * Returns 404 if no post with that slug exists.
 *
 * Params type hint: { params: Promise<{ slug: string }> }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
//
//   Step 1: Await params and extract the slug
//     Hint: const { slug } = await params
//
//   Step 2: Fetch the post from storage
//     Hint: const post = await storage.getPostBySlug(slug)
//
//   Step 3: If post is null/undefined → return 404
//     Hint: return NextResponse.json({ error: 'Post not found' }, { status: 404 })
//
//   Step 4: Otherwise → return the post as JSON
//     Hint: return NextResponse.json(post)
//
//   Step 5: Wrap in try/catch, return 500 on error
//
//   YOUR CODE HERE
    try {
        const { slug } = await params;
        const post = await storage.getPostBySlug(slug);
        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }
        return NextResponse.json(post);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to get post' }, { status: 500 });
    }
}
