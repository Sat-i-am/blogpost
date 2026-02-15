/**
 * API Route: /api/posts/[id]
 *
 * PURPOSE:
 * Handles a SINGLE post by its ID.
 * Used by the editor page to load a post for editing, and to delete posts.
 *
 * The [id] in the folder name is a dynamic route segment —
 * Next.js passes it to your handler via the `params` object.
 *
 * Two HTTP methods:
 *   GET    /api/posts/abc-123  → fetch one post by ID
 *   DELETE /api/posts/abc-123  → delete a post by ID
 *
 * IMPORTANT — Next.js 16 change:
 *   `params` is now a Promise! You must `await params` before accessing .id
 *   const { id } = await params   ✅
 *   const { id } = params         ❌ (won't work in Next.js 16)
 */

import { storage } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";



/**
 * GET /api/posts/[id]
 *
 * Fetches a single post by its ID.
 * Used by /editor/[id] page to load post data into the editor.
 *
 * Params type hint: { params: Promise<{ id: string }> }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//
//   Step 1: Await params and extract the id
//     Hint: const { id } = await params
//
//   Step 2: Fetch the post from storage
//     Hint: const post = await storage.getPostById(id)
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
        const { id } = await params;
        const post = await storage.getPostById(id);
        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }
        return NextResponse.json(post);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to get post' }, { status: 500 });
    }
}


/**
 * DELETE /api/posts/[id]
 *
 * Deletes a post by its ID.
 * Called when user clicks "Delete" on a post.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//
//   Step 1: Await params and extract the id
//
//   Step 2: Delete the post
//     Hint: await storage.deletePost(id)
//
//   Step 3: Return a success response
//     Hint: return NextResponse.json({ success: true })
//
//   Step 4: Wrap in try/catch, return 500 on error
//
//   YOUR CODE HERE
    try {
        const { id } = await params;
        await storage.deletePost(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
}
