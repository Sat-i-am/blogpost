blog-platform/
│
├── app/
│   ├── page.tsx                 # Home page (blog feed)
│   ├── post/
│   │    └── [slug]/page.tsx     # View single post
│   ├── editor/
│   │    ├── page.tsx            # Create post
│   │    └── [id]/page.tsx       # Edit post
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── Editor/
│   │    ├── BlogEditor.tsx
│   │    ├── Toolbar.tsx
│   │    └── extensions.ts
│   │
│   ├── PostCard.tsx
│   ├── SearchBar.tsx
│   └── TagFilter.tsx
│
├── components/
│   └── Editor/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   │
│   ├── services/
│   │   └── post.service.ts     # All DB logic
│   │
│   ├── markdown.ts
│   ├── slugify.ts
│   └── types.ts
│
├── hooks/
├── public/
└── package.json
├── hooks/
│   ├── useAutosave.ts
│   └── useDebounce.ts
│
├── styles/
│
├── public/
│
└── package.json



The Two Ways a Post Gets Saved

  1. Autosave (Draft — happens automatically)

  User types in editor
          ↓
  content/title state updates
          ↓
  useDebounce waits 2 seconds of inactivity
          ↓
  useAutosave fires with published: false (keeps current status)
          ↓
  fetch POST /api/posts → API route → storage.savePost() → Prisma upsert → Supabase DB
          ↓
  Status indicator: "Saving..." → "Saved" → back to idle

  Every time you stop typing for 2 seconds, the post is silently saved as whatever it currently is (draft or published). The published.current ref preserves the existing status so autosave never accidentally publishes or unpublishes.

  2. Manual Save/Publish (user clicks a button)

  "Draft" button → handleSaveDraft():
  - Builds post with published: false
  - POSTs to API → saved in DB as a draft
  - Drafts are only visible in the editor, NOT on the home feed

  "Publish" button → handlePublish():
  - Builds post with published: true
  - POSTs to API → saved in DB as published
  - Calls onPublish?.(post) → parent page redirects to /post/[slug]
  - Now visible on the home feed (getPublishedPosts only returns published: true)

  The published Field Controls Visibility

  published: false (draft)     → only shows in /editor/[id]
  published: true  (published) → shows on home feed (/) and /post/[slug]

  The home page calls GET /api/posts → storage.getPublishedPosts() → Prisma query with where: { published: true }. So drafts are invisible to readers.

  The upsert Logic (Create vs Update)

  When storage.savePost(post) runs:
  Prisma checks: does a post with this ID exist?
    ├── NO  → CREATE new row with all fields
    └── YES → UPDATE existing row with new values

  This is why the same endpoint handles both new posts and edits. The id is generated client-side via crypto.randomUUID() when creating a new post, or passed from the URL when editing (/editor/[id]).

  The Full Data Flow

  BlogEditor component
    ├── buildPost(published) → constructs BlogPost object:
    │     • id (from useMemo — stable UUID)
    │     • title, content (from state)
    │     • slug (generated from title via slugify)
    │     • markdown (converted from HTML via turndown)
    │     • excerpt (first 150 chars of plain text)
    │     • tags (from tag chips)
    │     • published (true or false)
    │
    ├── handleSaveDraft() → buildPost(false) → POST /api/posts
    ├── handlePublish()   → buildPost(true)  → POST /api/posts → redirect
    └── useAutosave()     → buildPost(kept)  → POST /api/posts (every 2s)
