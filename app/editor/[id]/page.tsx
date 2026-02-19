/**
 * Edit Post page — /editor/[id]
 *
 * Loads an existing post by ID and renders the BlogEditor
 * pre-filled with the post's title, content, and tags.
 * On publish, redirects to the updated post's URL.
 *
 * WHAT CHANGED (Supabase migration):
 * Before: storage.getPostById(id) — direct localStorage call
 * After:  fetch(`/api/posts/${id}`) — HTTP request to our API route
 */

"use client"

import { use, useState, useEffect } from 'react'
import BlogEditor from '@/components/Editor/BlogEditor'
import { useRouter, useSearchParams } from 'next/navigation'
import { BlogPost } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  // ?mode=view forces read-only regardless of authorship
  const viewMode = searchParams.get('mode') === 'view'

  const [post, setPost] = useState<BlogPost | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)

  useEffect(() => {
    async function loadPost() {
      // If we're in forced view mode, skip the auth check entirely
      if (viewMode) {
        const response = await fetch(`/api/posts/${id}`)
        if (!response.ok) { setNotFound(true); return }
        setPost(await response.json())
        return
      }

      // Otherwise fetch post and current user in parallel to determine authorship
      const supabase = createClient()
      const [response, { data: { user } }] = await Promise.all([
        fetch(`/api/posts/${id}`),
        supabase.auth.getUser(),
      ])

      if (!response.ok) {
        setNotFound(true)
        return
      }

      const data: BlogPost = await response.json()
      setPost(data)
      setIsAuthor(!!user?.email && user.email === data.username)
    }
    loadPost()
  }, [id, viewMode])

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-6 text-center">
        <div className="text-6xl mb-4 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent font-bold">404</div>
        <h1 className="text-2xl font-bold mb-2">Post not found</h1>
        <p className="text-muted-foreground mb-6">The post you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>
    )
  }

  // Show nothing while loading from API
  if (!post) return null

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <BlogEditor
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
        initialTags={post.tags}
        onPublish={(updated) => router.push(`/post/${updated.slug}`)}
        readOnly={viewMode || !isAuthor}
      />
    </div>
  )
}
