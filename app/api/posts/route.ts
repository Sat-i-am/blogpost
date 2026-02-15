/**
 * API Route: /api/posts
 *
 * PURPOSE:
 * Handles the "collection" of posts — listing and creating/updating.
 * Client components can't talk to Prisma directly (no DATABASE_URL in browser),
 * so they call these API routes instead, which run on the server.
 *
 * Two HTTP methods:
 *   GET  /api/posts              → list all published posts
 *   GET  /api/posts?search=xyz   → search published posts by title/excerpt
 *   GET  /api/posts?tag=react    → filter published posts by tag
 *   POST /api/posts              → create a new post or update an existing one
 */

import { storage } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

// Hint: import NextRequest and NextResponse from 'next/server'
// Hint: import { storage } from '@/lib/storage'

// YOUR IMPORTS HERE


/**
 * GET /api/posts
 *
 * Returns published posts as JSON array.
 * Supports optional query parameters for filtering:
 *   ?search=keyword  → search by title/excerpt (uses storage.searchPosts)
 *   ?tag=react       → filter by tag
 *   (no params)      → return all published posts
 */
export async function GET(request: NextRequest) {
//
//   Step 1: Extract search params from the request URL
//     Hint: request.nextUrl.searchParams.get('search')
//     Hint: request.nextUrl.searchParams.get('tag')
//
//   Step 2: Decide which storage method to call based on params
//     - If search exists and is not empty → storage.searchPosts(search)
//     - Else → storage.getPublishedPosts()
//       - Then if tag exists → filter the results: posts.filter(p => p.tags.includes(tag))
//
//   Step 3: Return the posts as JSON
//     Hint: return NextResponse.json(posts)
//
//   Step 4: Wrap everything in try/catch
//     - catch → return NextResponse.json({ error: '...' }, { status: 500 })
//
//   YOUR CODE HERE
    try {
        const search = request.nextUrl.searchParams.get('search');
        const tag = request.nextUrl.searchParams.get('tag');
        const username = request.nextUrl.searchParams.get('username');
        let posts = [];
        if (username) {
            posts = await storage.getPostsByUsername(username);
        } else if (search) {
            posts = await storage.searchPosts(search);
        } else {
            posts = await storage.getPublishedPosts();
        }
        if (tag) {
            posts = posts.filter(p => p.tags.includes(tag));
        }
        return NextResponse.json(posts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to get posts' }, { status: 500 });
    }
}



/**
 * POST /api/posts
 *
 * Creates a new post or updates an existing one.
 * The request body should be a JSON object with all post fields
 * (id, title, slug, content, markdown, excerpt, tags, published).
 * Uses storage.savePost() which does an upsert under the hood.
 */
export async function POST(request: NextRequest) {
//
//   Step 1: Parse the JSON body from the request
//     Hint: const post = await request.json()
//
//   Step 2: Save the post using storage
//     Hint: const saved = await storage.savePost(post)
//
//   Step 3: Return the saved post as JSON
//     Hint: return NextResponse.json(saved)
//
//   Step 4: Wrap in try/catch, return 500 on error
//
//   YOUR CODE HERE
    try {
        const post = await request.json();
        const saved = await storage.savePost(post);
        return NextResponse.json(saved);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save post' }, { status: 500 });
    }
}
