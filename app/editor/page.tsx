/**
 * New Post page — /editor
 *
 * Renders a blank BlogEditor for creating a new post.
 * On publish, redirects the user to the published post's URL (/post/[slug]).
 */

"use client"

import BlogEditor from '@/components/Editor/BlogEditor'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const router = useRouter()

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <BlogEditor onPublish={(post) => router.push(`/post/${post.slug}`)} />
    </div>
  )
}
