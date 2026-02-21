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
import { Save, Send, Loader2, Check, Hash, X, Users, Lock } from 'lucide-react'
import MenuBar from './Menubar'
import { useAutosave } from '@/hooks/useAutosave'
// REMOVED: import { storage } from '@/lib/storage'
import { htmlToMarkdown } from '@/lib/markdown'
import { uniqueSlug } from '@/lib/slugify'
import { BlogPost } from '@/lib/types'
import SummarizeButton from '@/components/SummarizeButton'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'

interface BlogEditorProps {
  postId?: string
  initialContent?: string
  initialTitle?: string
  initialTags?: string[]
  onPublish?: (post: BlogPost) => void
  readOnly?: boolean
  isOwner?: boolean                    // true = current user is the post author (can Draft/Publish)
  initialAllowCollaboration?: boolean  // existing allowCollaboration value from the post
  collaboratorName?: string            // display name for this user's caret (defaults to 'User N')
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
  readOnly = false,
  isOwner = true,
  initialAllowCollaboration = false,
  collaboratorName,
}: BlogEditorProps) {
  // Generate a stable post ID for new posts (useMemo so it doesn't change on re-render)
  const id = useMemo(() => postId || crypto.randomUUID(), [postId])

  const [title, setTitle] = useState(initialTitle)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [generatingTags, setGeneratingTags] = useState(false)
  const [tagInput, setTagInput] = useState('')   // current text being typed in the tag input
  const [content, setContent] = useState(initialContent)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [allowCollab, setAllowCollab] = useState(initialAllowCollaboration)
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

  // Create a Yjs document (the shared data structure)
  const ydoc = useMemo(() => new Y.Doc(), [])

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

  useEffect(() => {
    const p = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_COLLAB_WS_URL || "ws://localhost:1234",
      name: id,
      document: ydoc,
    })
    setProvider(p)
    return () => p.destroy()  // cleanup on unmount
  }, [id, ydoc])

  // Stable caret name — use the real user email if provided, otherwise a random label
  const caretName = useMemo(
    () => collaboratorName || ('User ' + Math.floor(Math.random() * 100)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collaboratorName]
  )

  // TipTap editor setup
  // IMPORTANT: Always initialize with editable:true so that:
  //   1. Yjs (Collaboration extension) can properly sync documents
  //   2. CollaborationCaret can render remote cursors as decorations
  // After the editor is ready we call editor.setEditable(!readOnly) below,
  // which prevents user input in view-only mode while keeping Yjs active.
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-ignore - history is a valid option but TypeScript definition might be outdated
        history: false,   // ← CRITICAL: disable built-in undo. Yjs handles it now.
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Collaboration.configure({
        document: ydoc,   // ← this is what makes it collaborative
      }),
      ...(provider ? [CollaborationCaret.configure({
        provider,
        user: {
          name: caretName,
          color: ['#f8a4a4', '#a4d4f8', '#a4f8b4', '#f8d4a4', '#d4a4f8', '#f8a4d4', '#a4f8e4', '#f8f4a4'][Math.floor(Math.random() * 8)],
        },
      })] : []),
    ],
    editable: true,            // Always start editable — see note above
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
  },[provider])

  // Apply read-only AFTER the editor is fully initialized.
  // setEditable(false) disables user input but does NOT prevent Yjs from
  // applying remote updates — those bypass the editable check entirely.
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [editor, readOnly])

  // Load existing content into the Yjs document once editor + provider are ready.
  // This only runs once: checks if the Yjs doc is empty (no prior collab session),
  // and if so, seeds it with the existing HTML from the database.
  // After this, Yjs takes over as the source of truth and syncs to all tabs.
  useEffect(() => {
    if (!editor || !provider) return

    const handleSync = () => {
      // Check if Yjs doc is empty (first time this post is opened collaboratively)
      const yXmlFragment = ydoc.getXmlFragment('default')
      if (yXmlFragment.length === 0 && initialContent) {
        editor.commands.setContent(initialContent)
      }
    }

    // 'synced' fires after the provider has synced with the server
    // If already synced, run immediately; otherwise wait for the event
    if (provider.isSynced) {
      handleSync()
    } else {
      provider.on('synced', handleSync)
    }

    return () => {
      provider.off('synced', handleSync)
    }
  }, [editor, provider])

  // Autosave — debounces content/title and saves via API every 2s
  const { status } = useAutosave({ postId: id, content, title, tags, disabled: readOnly })

  /**
   * Build a complete BlogPost object from current editor state.
   * allowCollaboration is only included when explicitly set (e.g. at publish time).
   * When undefined, Prisma skips updating the field — so autosave never changes it.
   */
  function buildPost(published: boolean, allowCollaboration?: boolean): BlogPost {
    return {
      id,
      title,
      slug: uniqueSlug(title || 'untitled', []),  // empty array — DB handles uniqueness via @unique constraint
      content,
      markdown: htmlToMarkdown(content),
      excerpt: stripHtml(content).slice(0, 150),
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      published,
      allowCollaboration,  // undefined → Prisma skips on update (only set from publish dialog)
    }
  }

  /**
   * Save as draft (published = false).
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
   * Open the publish options dialog instead of publishing immediately.
   */
  function handlePublish() {
    setPublishDialogOpen(true)
  }

  /**
   * Called from the publish dialog once the user picks an option.
   */
  async function handlePublishConfirm(collab: boolean) {
    setPublishDialogOpen(false)
    setAllowCollab(collab)
    const post = buildPost(true, collab)
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    })
    onPublish?.(post)
  }

  async function generateAiTags() {
    if (!content) return
    setGeneratingTags(true)
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: htmlToMarkdown(content) }),
      })
      const { tags: suggested } = await res.json()
      console.log("generated ai tags", suggested)
      if (Array.isArray(suggested)) {
        setTags((prev) => [...new Set([...prev, ...suggested])])
      }
    } finally {
      setGeneratingTags(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* ── Publish options dialog ─────────────────────────────────────────── */}
      {publishDialogOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setPublishDialogOpen(false)}
          />
          {/* Centered dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold mb-1">Publishing options</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose who can edit this post after publishing.
              </p>

              <div className="space-y-3 mb-6">
                {/* Allow edits option */}
                <button
                  onClick={() => handlePublishConfirm(true)}
                  className="w-full text-left p-4 border border-border rounded-xl hover:border-green-500/40 hover:bg-green-500/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <Users className="size-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Allow edits by all</div>
                      <div className="text-xs text-muted-foreground">
                        Anyone can collaborate on this post
                      </div>
                    </div>
                  </div>
                </button>

                {/* Don't allow edits option */}
                <button
                  onClick={() => handlePublishConfirm(false)}
                  className="w-full text-left p-4 border border-border rounded-xl hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Lock className="size-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Don&apos;t allow edits</div>
                      <div className="text-xs text-muted-foreground">
                        Only you can edit this post
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setPublishDialogOpen(false)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Editor card container */}
      <div className="border border-border/80 rounded-2xl bg-card shadow-sm shadow-primary/5 overflow-hidden">
        {/* Header: title + actions */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            {readOnly ? (
              <h2 className="flex-1 text-3xl font-bold leading-tight">{title}</h2>
            ) : (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className="flex-1 text-3xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 leading-tight"
              />
            )}
            {!readOnly ? (
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
                {/* Draft / Publish — only shown to the post owner */}
                {isOwner && (
                  <>
                    <button
                      onClick={handleSaveDraft}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Save className="size-3.5" />
                      Draft
                    </button>
                    <button
                      onClick={handlePublish}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30 cursor-pointer"
                    >
                      <Send className="size-3.5" />
                      Publish
                    </button>
                  </>
                )}
                <SummarizeButton markdown={htmlToMarkdown(content)} />
              </div>
            ) : (
              <div className="shrink-0 pt-1">
                <SummarizeButton markdown={htmlToMarkdown(content)} />
              </div>
            )}
          </div>

          {/* Tags — editable in edit mode, display-only in read-only mode */}
          <div
            className={`flex items-center gap-2 flex-wrap mb-4 border-b pb-3 ${!readOnly ? 'cursor-text focus-within:border-primary/30 transition-colors' : ''}`}
            onClick={() => !readOnly && tagInputRef.current?.focus()}
          >
            <Hash className="size-3.5 text-muted-foreground/50 shrink-0" />

            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border border-primary/20"
              >
                {tag}
                {!readOnly && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                    className="hover:text-destructive transition-colors cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}

            {!readOnly && (
              <>
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Type #tag and press space...' : 'Add more...'}
                className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
              />
              <button
                onClick={generateAiTags}
                disabled={generatingTags}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-primary/20 hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {generatingTags ? <Loader2 className="size-3 animate-spin" /> : null}
                {generatingTags ? 'Generating...' : 'AI tags'}
              </button>
                </>
            )}
          </div>
        </div>

        {/* Formatting toolbar — hidden in read-only mode */}
        {!readOnly && (
          <div className="px-6 py-2 border-y border-border/60 bg-gradient-to-r from-muted/40 to-primary/5">
            <MenuBar editor={editor} />
          </div>
        )}

        {/* TipTap editor area */}
        <div className="p-6 min-h-[450px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
