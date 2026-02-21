/**
 * New Post page — /editor
 *
 * Renders a blank BlogEditor for creating a new post.
 * On publish, stays in the editor (the post is now live and editable).
 */

"use client"

import BlogEditor from '@/components/Editor/BlogEditor'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const router = useRouter()

  return (
    <div className="py-10 px-6">
      <BlogEditor
        onPublish={() => router.push('/my-posts')}
        onDraft={() => router.push('/my-posts')}
      />
    </div>
  )
}
