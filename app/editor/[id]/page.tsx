/**
 * Edit Post page — /editor/[id]
 *
 * Loads an existing post by ID from localStorage and renders the BlogEditor
 * pre-filled with the post's title, content, and tags.
 * On publish, redirects to the updated post's URL.
 */

"use client"

import { use, useState, useEffect } from 'react'
import BlogEditor from '@/components/Editor/BlogEditor'
import { storage } from '@/lib/storage'
import { useRouter } from 'next/navigation'
import { BlogPost } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Load the post from localStorage on mount
  useEffect(() => {
    const existing = storage.getPostById(id)
    if (existing) {
      setPost(existing)
    } else {
      setNotFound(true)
    }
  }, [id])

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

  // Show nothing while loading from localStorage
  if (!post) return null

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <BlogEditor
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
        initialTags={post.tags}
        onPublish={(updated) => router.push(`/post/${updated.slug}`)}
      />
    </div>
  )
}
