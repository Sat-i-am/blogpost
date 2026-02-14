# Blog Platform — Detailed Implementation Plan

## Current State

### What's Built
- **`components/Editor/BlogEditor.tsx`** — TipTap editor with StarterKit, TextAlign, Highlight. Has hardcoded demo content, logs HTML on update.
- **`components/Editor/Menubar.tsx`** — 13 formatting buttons (H1-H3, bold, italic, strike, 4 alignments, bullet/ordered list, highlight) using Radix Toggle.
- **`components/ui/toggle.tsx`** — Radix Toggle primitive with CVA variants.
- **`app/page.tsx`** — Renders `<BlogEditor>` centered on screen.
- **`app/editor/page.tsx`** — Empty stub (exports function with no return).
- **`app/layout.tsx`** — Default Next.js layout with Geist fonts.
- **`lib/utils.ts`** — `cn()` utility (clsx + tailwind-merge).
- **`app/globals.css`** — Tailwind + shadcn theme vars + `.tiptap` editor styles (headings, lists, hr).

### Tech Stack
- Next.js 16.1.6, React 19, TypeScript (strict), Tailwind CSS 4, shadcn
- TipTap 3.19 (StarterKit, TextAlign, Highlight, TextStyle)
- lucide-react icons, class-variance-authority

---

## Phase 1: Foundation — Types & Utilities

### 1.1 Create `lib/types.ts`

Define the core `BlogPost` interface used everywhere:

```ts
export interface BlogPost {
  id: string            // crypto.randomUUID()
  title: string
  slug: string          // URL-safe version of title
  content: string       // HTML from TipTap editor
  markdown: string      // Converted markdown for storage/export
  excerpt: string       // First ~150 chars of plain text for previews
  tags: string[]
  createdAt: string     // ISO 8601 date string
  updatedAt: string     // ISO 8601 date string
  published: boolean    // false = draft, true = published
}
```

### 1.2 Create `lib/slugify.ts`

Two exports:

```ts
export function slugify(title: string): string
```
- Lowercase the title
- Replace spaces and non-alphanumeric chars with hyphens
- Collapse multiple hyphens, trim leading/trailing hyphens
- Example: `"Hello World! (Part 2)"` -> `"hello-world-part-2"`

```ts
export function uniqueSlug(title: string, existingSlugs: string[]): string
```
- Call `slugify(title)` to get base slug
- If it already exists in `existingSlugs`, append `-2`, `-3`, etc.
- Return the first unique slug

### 1.3 Create `lib/markdown.ts`

Install dependencies first:
```bash
npm install turndown remark remark-html
npm install -D @types/turndown
```

Two exports:

```ts
import TurndownService from 'turndown'
import { remark } from 'remark'
import remarkHtml from 'remark-html'

export function htmlToMarkdown(html: string): string
```
- Create a TurndownService instance
- Configure headingStyle: 'atx' (# style)
- Convert HTML string to markdown
- Return markdown string

```ts
export async function markdownToHtml(markdown: string): Promise<string>
```
- Use `remark().use(remarkHtml).process(markdown)`
- Return the resulting HTML string
- This is async because remark processing returns a promise

### 1.4 Create `lib/storage.ts`

Abstract storage layer with localStorage underneath. All methods are synchronous (localStorage is sync) but the interface is designed so swapping to an async DB later is straightforward.

```ts
const STORAGE_KEY = 'blog-posts'

function getAll(): BlogPost[]
// Read from localStorage, parse JSON, return array (or [] if empty)

function saveAll(posts: BlogPost[]): void
// Stringify and write to localStorage

export const storage = {
  getAllPosts(): BlogPost[]
  // Return getAll(), optionally sorted by updatedAt desc

  getPostBySlug(slug: string): BlogPost | undefined
  // Find in array by slug

  getPostById(id: string): BlogPost | undefined
  // Find in array by id

  savePost(post: BlogPost): BlogPost
  // If post.id exists in storage, update it (replace). Otherwise push new.
  // Always update `updatedAt` to now.
  // Return the saved post.

  deletePost(id: string): void
  // Filter out the post with this id, saveAll

  searchPosts(query: string): BlogPost[]
  // Filter posts where title or content (lowercase) includes query (lowercase)
  // Only return published posts

  getPublishedPosts(): BlogPost[]
  // Filter for published === true, sorted by createdAt desc
}
```

**Key design decision:** The storage object is a plain object with methods, not a class. To swap to a DB later, just change the implementations inside these methods to API calls — the rest of the app won't change.

---

## Phase 2: Hooks

### 2.1 Create `hooks/useDebounce.ts`

```ts
export function useDebounce<T>(value: T, delay: number): T
```
- Standard debounce hook using `useState` + `useEffect`
- Returns the debounced value after `delay` ms of no changes
- Used by both autosave and search

### 2.2 Create `hooks/useAutosave.ts`

```ts
export function useAutosave(
  postId: string,
  content: string,
  title: string,
  tags: string[],
  delay?: number  // default 2000ms
): { status: 'idle' | 'saving' | 'saved' }
```

- Debounce the content/title/tags using `useDebounce`
- When debounced values change, save to storage
- Manage a status state: `'idle'` -> `'saving'` -> `'saved'`
- After saving, show `'saved'` for ~2 seconds, then back to `'idle'`
- On first render with a postId, load existing post data
- Generate excerpt from content (strip HTML tags, take first 150 chars)
- Generate slug from title, markdown from content
- Call `storage.savePost()` with the assembled BlogPost

---

## Phase 3: Editor Enhancements

### 3.1 Refactor `components/Editor/BlogEditor.tsx`

**New props interface:**
```ts
interface BlogEditorProps {
  postId?: string          // undefined = new post, string = editing existing
  initialContent?: string  // HTML content to load
  initialTitle?: string
  initialTags?: string[]
  onPublish?: (post: BlogPost) => void  // callback after publishing
}
```

**Changes to make:**
1. Remove the hardcoded demo content. Use `initialContent` prop (default to empty `<p></p>`).
2. Add a **title input** above the toolbar — large text input, placeholder "Post title...", no border, just a big clean input.
3. Add a **tags input** below the toolbar or above the editor — text input with placeholder "Add tags (comma-separated)". Parse on change into string array.
4. Add state for `title`, `tags`, `postId` (generate new UUID if no postId prop).
5. Wire up `useAutosave` hook with current title, content (from `editor.getHTML()`), tags.
6. Show autosave status indicator (small text: "Saving..." / "Saved" / "Draft") near the top.
7. Add two buttons at the top-right or bottom:
   - **"Save Draft"** — saves with `published: false`
   - **"Publish"** — saves with `published: true`, calls `onPublish` callback
8. Keep the existing MenuBar toolbar as-is.

**Layout structure:**
```
┌──────────────────────────────────────────┐
│ [Title input]              [Draft] [Pub] │
│ [Autosave status: "Saved"]               │
│ ┌──────────────────────────────────────┐ │
│ │ [Menubar toolbar buttons]            │ │
│ └──────────────────────────────────────┘ │
│ [Tags input: tag1, tag2, ...]            │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ │         TipTap Editor Area           │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 3.2 Toolbar cleanup

The toolbar lives in `Menubar.tsx`. No rename needed — it works. The empty `Toolbar.tsx` file does not exist currently, so no cleanup required. Keep `Menubar.tsx` as-is.

---

## Phase 4: Pages & Routing

### 4.1 `app/page.tsx` — Home / Blog Feed

This is a **client component** (localStorage needs browser). It will:

1. On mount, load all published posts from `storage.getPublishedPosts()`.
2. Render a header section with:
   - Blog title/branding
   - `<SearchBar>` component
   - `<TagFilter>` component
3. Render a grid/list of `<PostCard>` components.
4. Handle search: filter posts by query using `storage.searchPosts(query)`.
5. Handle tag filter: filter posts by selected tags.
6. Show "No posts yet" empty state with link to `/editor`.

**Note on SSR:** Since we're using localStorage, the feed page must be a client component. When migrating to a DB, this can become a server component with proper SSR.

### 4.2 `app/post/[slug]/page.tsx` — View Single Post

Client component that:
1. Gets `slug` from params.
2. Loads post via `storage.getPostBySlug(slug)`.
3. If not found, show 404 message.
4. Renders:
   - Post title (h1)
   - Meta info: date (formatted), reading time (words / 200 wpm), tags as badges
   - Post content as rendered HTML (using `dangerouslySetInnerHTML` with the stored HTML content, or render markdown via `markdownToHtml`)
   - "Edit" link to `/editor/[id]`
5. Back link to home.

**Reading time calculation:** `Math.ceil(plainText.split(/\s+/).length / 200)` minutes.

### 4.3 `app/editor/page.tsx` — Create New Post

Simple page that:
1. Renders `<BlogEditor>` with no initial props (new post mode).
2. On publish callback, redirect to `/post/[slug]` using `next/navigation` `useRouter`.

```tsx
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
```

### 4.4 `app/editor/[id]/page.tsx` — Edit Existing Post

Client component that:
1. Gets `id` from params.
2. Loads post via `storage.getPostById(id)`.
3. If not found, show error.
4. Renders `<BlogEditor>` with `postId`, `initialContent`, `initialTitle`, `initialTags`.
5. On publish, redirect to the post's view page.

```tsx
"use client"
import { use } from 'react'
import BlogEditor from '@/components/Editor/BlogEditor'
import { storage } from '@/lib/storage'
import { useRouter } from 'next/navigation'

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  // Load post from storage in useEffect, render editor when ready
}
```

---

## Phase 5: UI Components

### 5.1 `components/PostCard.tsx`

A card component for the blog feed:

```tsx
interface PostCardProps {
  post: BlogPost
}
```

**Renders:**
- Title as a link to `/post/[slug]`
- Excerpt (the first ~150 chars stored in `post.excerpt`)
- Tags as small badges/chips
- Date (formatted nicely, e.g. "Feb 14, 2026")
- Reading time ("3 min read")

**Styling:** Use Tailwind classes for a clean card look — border, rounded, padding, hover effect. No need to install shadcn Card component to keep it simple.

### 5.2 `components/SearchBar.tsx`

```tsx
interface SearchBarProps {
  onSearch: (query: string) => void
}
```

- Text input with search icon (from lucide-react `Search`)
- Uses `useDebounce` internally (300ms delay)
- Calls `onSearch` with debounced query value
- Placeholder: "Search posts..."

### 5.3 `components/TagFilter.tsx`

```tsx
interface TagFilterProps {
  tags: string[]              // all available tags
  selectedTags: string[]
  onTagToggle: (tag: string) => void
}
```

- Renders each tag as a clickable badge/chip
- Selected tags get a filled/active style, unselected get outline style
- Clicking a tag calls `onTagToggle` to add/remove it from selection
- Parent component handles the filtering logic

---

## Phase 6: SEO & Layout Polish

### 6.1 Update `app/layout.tsx`

**Metadata:**
```ts
export const metadata: Metadata = {
  title: {
    default: 'Blog',
    template: '%s | Blog',
  },
  description: 'A modern blog platform',
}
```

**Navigation header:** Add a simple nav bar inside `<body>`:
```tsx
<header className="border-b">
  <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
    <Link href="/" className="text-xl font-bold">Blog</Link>
    <Link href="/editor">New Post</Link>
  </nav>
</header>
```

Import `Link` from `next/link`. Since layout.tsx is a server component, the nav is fine as static HTML — no client-side code needed.

### 6.2 Post Page SEO

In `app/post/[slug]/page.tsx`, add a `generateMetadata` function:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  // Note: This won't work with localStorage since generateMetadata runs on server
  // For now, set basic metadata. When migrating to DB, this becomes fully dynamic.
  return {
    title: 'Post',  // Will be enhanced when storage moves server-side
  }
}
```

**Honest limitation:** `generateMetadata` runs on the server, but localStorage is client-only. True dynamic SEO metadata requires server-side storage (DB). For now, we set a basic title. The plan is structured so that when you swap `lib/storage.ts` to use a database, `generateMetadata` can fetch the post and set proper OG tags.

---

## Dependencies to Install

```bash
npm install turndown remark remark-html
npm install -D @types/turndown
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `lib/types.ts` | **Create** | BlogPost interface |
| `lib/slugify.ts` | **Create** | slugify() and uniqueSlug() |
| `lib/markdown.ts` | **Create** | htmlToMarkdown() and markdownToHtml() |
| `lib/storage.ts` | **Create** | localStorage abstraction layer |
| `hooks/useDebounce.ts` | **Create** | Generic debounce hook |
| `hooks/useAutosave.ts` | **Create** | Auto-save hook with status |
| `components/Editor/BlogEditor.tsx` | **Modify** | Add title, tags, save/publish, autosave |
| `components/PostCard.tsx` | **Create** | Post preview card for feed |
| `components/SearchBar.tsx` | **Create** | Search input with debounce |
| `components/TagFilter.tsx` | **Create** | Tag filter chips |
| `app/page.tsx` | **Modify** | Blog feed with search + tags |
| `app/layout.tsx` | **Modify** | Nav header + SEO metadata |
| `app/post/[slug]/page.tsx` | **Create** | Single post view |
| `app/editor/page.tsx` | **Modify** | New post editor page |
| `app/editor/[id]/page.tsx` | **Create** | Edit existing post page |
| `package.json` | **Modify** | New dependencies added by npm install |

## Implementation Order

Execute phases 1 through 6 in order. Within each phase, files can be created in parallel since they don't depend on each other within the same phase. Each subsequent phase depends on the previous one being complete.

## Verification Checklist

After implementation, test the following flow:

1. Visit `/editor` — create a new post with title, tags, and content
2. Click "Publish" — should redirect to `/post/[slug]`
3. Verify post renders correctly with title, content, meta info
4. Visit `/` (home) — verify the post appears in the feed
5. Use search bar — verify filtering works
6. Click tag chips — verify tag filtering works
7. Click "Edit" on a post — verify editor loads with existing content
8. Make changes and save — verify changes persist
9. Check autosave — type in editor, wait 2s, refresh, content should persist
10. Check page source — verify meta tags in `<head>`
