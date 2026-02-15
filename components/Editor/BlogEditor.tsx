/**
 * Blog post editor component.
 *
 * Combines TipTap rich-text editor with:
 * - Title input (large, clean, no border)
 * - Tags input (#hashtag + space to create chips)
 * - Formatting toolbar (via Menubar)
 * - Autosave to database (2s debounce via API)
 * - Save Draft / Publish buttons
 *
 * WHAT CHANGED (Supabase migration):
 * Before: storage.savePost(post) and storage.getAllPosts() — direct localStorage
 * After:  fetch('/api/posts', { method: 'POST', body: ... }) — async HTTP
 *
 * The storage import is REMOVED. All saves go through the API now.
 */

"use client"

import { useState, useEffect, useMemo, useRef, KeyboardEvent } from 'react'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Save, Send, Loader2, Check, Hash, X } from 'lucide-react'
import MenuBar from './Menubar'
import { useAutosave } from '@/hooks/useAutosave'
// REMOVED: import { storage } from '@/lib/storage'
import { htmlToMarkdown } from '@/lib/markdown'
import { uniqueSlug } from '@/lib/slugify'
import { BlogPost } from '@/lib/types'

interface BlogEditorProps {
  postId?: string
  initialContent?: string
  initialTitle?: string
  initialTags?: string[]
  onPublish?: (post: BlogPost) => void
}

/**
 * Strip HTML tags to get plain text. Used for generating excerpts.
 * Uses regex instead of DOM to avoid "document is not defined" errors during SSR.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export default function BlogEditor({
  postId,
  initialContent = '',
  initialTitle = '',
  initialTags = [],
  onPublish,
}: BlogEditorProps) {
  // Generate a stable post ID for new posts (useMemo so it doesn't change on re-render)
  const id = useMemo(() => postId || crypto.randomUUID(), [postId])

  const [title, setTitle] = useState(initialTitle)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [tagInput, setTagInput] = useState('')   // current text being typed in the tag input
  const [content, setContent] = useState(initialContent)
  const tagInputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle tag input changes.
   * When user types "#word " (hash + word + space), extract the tag and add it as a chip.
   */
  function handleTagInputChange(value: string) {
    const match = value.match(/#(\w+)\s$/)
    if (match) {
      const newTag = match[1].toLowerCase()
      if (!tags.includes(newTag)) {
        setTags((prev) => [...prev, newTag])
      }
      setTagInput('')
    } else {
      setTagInput(value)
    }
  }

  /**
   * Handle special keys in the tag input:
   * - Enter: add the current text as a tag (with or without #)
   * - Backspace on empty input: remove the last tag
   */
  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const raw = tagInput.replace(/^#/, '').trim().toLowerCase()
      if (raw && !tags.includes(raw)) {
        setTags((prev) => [...prev, raw])
      }
      setTagInput('')
    }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  /** Remove a tag by clicking the X on its chip */
  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  // TipTap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
  })

  // Autosave — debounces content/title and saves via API every 2s
  const { status } = useAutosave({ postId: id, content, title, tags })

  /**
   * Build a complete BlogPost object from current editor state.
   * Used by both Save Draft and Publish buttons.
   *
   * WHAT CHANGED:
   * Before: storage.getAllPosts() to get existing slugs, storage.getPostById() for createdAt
   * After:  We skip slug duplicate checking (DB handles it with @unique constraint)
   *         We don't need to fetch createdAt — Prisma handles it automatically
   *
   * Hint: The post object is simpler now:
   *   {
   *     id,
   *     title,
   *     slug: uniqueSlug(title || 'untitled', []),   ← empty array, DB handles uniqueness
   *     content,
   *     markdown: htmlToMarkdown(content),
   *     excerpt: stripHtml(content).slice(0, 150),
   *     tags,
   *     createdAt: new Date().toISOString(),          ← Prisma ignores this on update (uses @updatedAt)
   *     updatedAt: new Date().toISOString(),
   *     published,
   *   }
   */
  function buildPost(published: boolean): BlogPost {
    return {
      id,
      title,
      slug: uniqueSlug(title || 'untitled', []),  // empty array — DB handles uniqueness via @unique constraint
      content,
      markdown: htmlToMarkdown(content),
      excerpt: stripHtml(content).slice(0, 150),
      tags,
      createdAt: new Date().toISOString(),   // Prisma ignores this on update (uses @default(now()) for create)
      updatedAt: new Date().toISOString(),   // Prisma auto-updates this via @updatedAt
      username: "satyam",
      published,
    }
  }

  /**
   * Save as draft (published = false).
   *
   * BEFORE: storage.savePost(post)  — synchronous
   * AFTER:  fetch('/api/posts', { method: 'POST', ... })  — async
   *
   * Hint: Make this function async:
   *   async function handleSaveDraft() {
   *     const post = buildPost(false)
   *     await fetch('/api/posts', {
   *       method: 'POST',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify(post),
   *     })
   *   }
   */
  async function handleSaveDraft() {
    const post = buildPost(false)
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    })
  }

  /**
   * Publish the post (published = true) and notify parent.
   *
   * BEFORE: storage.savePost(post)  — synchronous
   * AFTER:  fetch('/api/posts', { method: 'POST', ... })  — async
   *
   * Hint: Same as draft but with published = true, and call onPublish after:
   *   async function handlePublish() {
   *     const post = buildPost(true)
   *     await fetch('/api/posts', {
   *       method: 'POST',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify(post),
   *     })
   *     onPublish?.(post)
   *   }
   */
  async function handlePublish() {
    const post = buildPost(true)
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    })
    onPublish?.(post)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Editor card container */}
      <div className="border border-border/80 rounded-2xl bg-card shadow-sm shadow-primary/5 overflow-hidden">
        {/* Header: title + actions */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title..."
              className="flex-1 text-3xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 leading-tight"
            />
            <div className="flex items-center gap-2 shrink-0 pt-1">
              {/* Autosave status indicator */}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                {status === 'saving' && (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Saving...
                  </>
                )}
                {status === 'saved' && (
                  <>
                    <Check className="size-3 text-green-500" />
                    Saved
                  </>
                )}
              </span>
              <button
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
              >
                <Save className="size-3.5" />
                Draft
              </button>
              <button
                onClick={handlePublish}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                <Send className="size-3.5" />
                Publish
              </button>
            </div>
          </div>

          {/* Tags input — type #tagname + space to create a chip */}
          <div
            className="flex items-center gap-2 flex-wrap mb-4 border-b pb-3 cursor-text focus-within:border-primary/30 transition-colors"
            onClick={() => tagInputRef.current?.focus()}
          >
            <Hash className="size-3.5 text-muted-foreground/50 shrink-0" />

            {/* Rendered tag chips */}
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border border-primary/20"
              >
                {tag}
                <button
                  onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}

            {/* Text input for typing new tags */}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => handleTagInputChange(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? 'Type #tag and press space...' : 'Add more...'}
              className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* Formatting toolbar */}
        <div className="px-6 py-2 border-y border-border/60 bg-gradient-to-r from-muted/40 to-primary/5">
          <MenuBar editor={editor} />
        </div>

        {/* TipTap editor area */}
        <div className="p-6 min-h-[450px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
