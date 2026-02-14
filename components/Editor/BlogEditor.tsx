/**
 * Blog post editor component.
 *
 * Combines TipTap rich-text editor with:
 * - Title input (large, clean, no border)
 * - Tags input (comma-separated)
 * - Formatting toolbar (via Menubar)
 * - Autosave to localStorage (2s debounce)
 * - Save Draft / Publish buttons
 *
 * Used in two modes:
 * - New post:  <BlogEditor /> — generates a fresh UUID, empty content
 * - Edit post: <BlogEditor postId="..." initialTitle="..." initialContent="..." initialTags={[...]} />
 */

"use client"

import { useState, useEffect, useMemo } from 'react'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import MenuBar from './Menubar'
import { useAutosave } from '@/hooks/useAutosave'
import { storage } from '@/lib/storage'
import { htmlToMarkdown } from '@/lib/markdown'
import { uniqueSlug } from '@/lib/slugify'
import { BlogPost } from '@/lib/types'

interface BlogEditorProps {
  postId?: string               // undefined = new post, string = editing existing
  initialContent?: string       // HTML to load into editor
  initialTitle?: string
  initialTags?: string[]
  onPublish?: (post: BlogPost) => void  // called after publishing
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
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '))
  const [content, setContent] = useState(initialContent)

  // Parse comma-separated tags input into an array
  const tags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

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

  // Autosave — debounces content/title and saves to localStorage every 2s
  const { status } = useAutosave({ postId: id, content, title, tags })

  /**
   * Build a complete BlogPost object from current editor state.
   * Used by both Save Draft and Publish buttons.
   */
  function buildPost(published: boolean): BlogPost {
    const allSlugs = storage
      .getAllPosts()
      .filter((p) => p.id !== id)
      .map((p) => p.slug)

    const existing = storage.getPostById(id)

    return {
      id,
      title,
      slug: uniqueSlug(title || 'untitled', allSlugs),
      content,
      markdown: htmlToMarkdown(content),
      excerpt: stripHtml(content).slice(0, 150),
      tags,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      published,
    }
  }

  /** Save as draft (published = false) */
  function handleSaveDraft() {
    const post = buildPost(false)
    storage.savePost(post)
  }

  /** Publish the post (published = true) and notify parent */
  function handlePublish() {
    const post = buildPost(true)
    storage.savePost(post)
    onPublish?.(post)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header: title + action buttons */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title..."
          className="flex-1 text-3xl font-bold bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-2 shrink-0">
          {/* Autosave status indicator */}
          <span className="text-xs text-muted-foreground">
            {status === 'saving' && 'Saving...'}
            {status === 'saved' && 'Saved'}
          </span>
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-colors"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Tags input */}
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Add tags (comma-separated): react, nextjs, tutorial..."
        className="w-full mb-4 text-sm bg-transparent outline-none border-b pb-2 placeholder:text-muted-foreground"
      />

      {/* Formatting toolbar */}
      <MenuBar editor={editor} />

      {/* TipTap editor area */}
      <div className="min-h-[400px] border rounded-md p-4 mt-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
