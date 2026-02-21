/**
 * Edit Post page — /editor/[id]
 *
 * Loads an existing post by ID and renders the BlogEditor
 * pre-filled with the post's title, content, and tags.
 * On publish, redirects to the updated post's URL.
 */

"use client"

import { use, useState, useEffect } from 'react'
import BlogEditor from '@/components/Editor/BlogEditor'
import { useRouter, useSearchParams } from 'next/navigation'
import { BlogPost } from '@/lib/types'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  // ?mode=view forces read-only regardless of authorship
  const viewMode = searchParams.get('mode') === 'view'

  const [post, setPost] = useState<BlogPost | null>(null)
  const [fetchWarning, setFetchWarning] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)
  const [currentUser, setCurrentUser] = useState('')

  useEffect(() => {
    async function loadPost() {
      try {
        const supabase = createClient()
        const [response, { data: { user } }] = await Promise.all([
          fetch(`/api/posts/${id}`),
          supabase.auth.getUser(),
        ])

        // Any non-2xx (404, 5xx, etc.) — show warning + editor instead of a dead end
        if (!response.ok) {
          setFetchWarning(true)
          return
        }

        const data: BlogPost = await response.json()
        setPost(data)

        if (user?.email) {
          setCurrentUser(user.email)
          if (!viewMode) {
            setIsAuthor(user.email === data.username)
          }
        }
      } catch {
        // Network failure (fetch itself threw — no response at all)
        setFetchWarning(true)
      }
    }
    loadPost()
  }, [id, viewMode])

  // ── Still loading (no post yet and no error) ──────────────────────────────
  if (!post && !fetchWarning) return null

  // ── Determine access level ────────────────────────────────────────────────
  // When the fetch failed we can't verify authorship — give full edit access
  // so the user isn't locked out, but the warning banner makes the risk clear.
  const allowCollaboration = post?.allowCollaboration ?? false
  const readOnly = fetchWarning
    ? viewMode                                         // fetch error: only viewMode restricts
    : viewMode || (!isAuthor && !allowCollaboration)   // normal: full auth check

  return (
    <div className="py-10 px-6">

      {/* Warning banner — shown when the post content could not be fetched */}
      {fetchWarning && (
        <div className="max-w-4xl mx-auto mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-500">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <p>
            <strong>Content could not be fetched.</strong>{' '}
            Modifying and saving this post will overwrite your original content.
          </p>
        </div>
      )}

      <BlogEditor
        postId={id}
        initialTitle={post?.title ?? ''}
        initialContent={post?.content ?? ''}
        initialTags={post?.tags ?? []}
        initialAllowCollaboration={allowCollaboration}
        onPublish={() => router.push('/my-posts')}
        onDraft={() => router.push('/my-posts')}
        readOnly={readOnly}
        isOwner={fetchWarning ? true : isAuthor}
        collaboratorName={currentUser}
      />
    </div>
  )
}
