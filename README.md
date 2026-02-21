<div align="center">

# ✍️ BlogPost

**A full-stack blogging platform with real-time collaborative editing and AI-powered writing tools.**

*Write. Collaborate. Publish — all in one place.*

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=for-the-badge&logo=openai&logoColor=white)](https://platform.openai.com)
[![Yjs](https://img.shields.io/badge/Yjs-CRDTs-F0643C?style=for-the-badge)](https://yjs.dev)

<br/>

<img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,supabase,postgres,prisma" />

</div>

---

## 🚀 Features

### ✍️ Rich Text Editor
- Full formatting toolbar — headings, bold, italic, highlight, text alignment, lists, code blocks
- **Autosave** with 2-second debounce — writes continuously without manual saving
- **Draft / Publish workflow** — keep posts private or push them to the public feed
- **Tag system** — type `#tag` + space to create chips, or generate them with AI

### 👥 Real-time Collaboration
- **Live multi-user editing** — multiple users edit the same post simultaneously, powered by [Yjs](https://yjs.dev) CRDTs
- **Live cursors** — each collaborator's caret is visible with a unique color and name
- **Conflict-free merging** — Yjs handles concurrent edits without conflicts, ever
- **Persistent Yjs state** — document state is serialized to binary and stored in PostgreSQL, surviving server restarts
- **Per-post permissions** — authors choose at publish time: open collaboration or owner-only

### 🤖 AI Writing Tools
- **Post summarizer** — streams a 100–200 word summary of any post in real-time
- **AI chat** — ask questions grounded in the post; answers stream word-by-word via the OpenAI streaming API
- **AI tag generation** — suggests relevant tags from post content with one click
- **Daily usage limits** — per-user token tracking in PostgreSQL prevents abuse; resets daily

### 🔍 Feed & Discovery
- **Full-text search** — filter by title, excerpt, or tags with debounced input
- **Tag filter** — click tags to narrow the feed
- **Post cards** — excerpt, tags, and collaboration status at a glance

### 🔐 Authentication
- Email/password auth via **Supabase Auth**
- Server-side session handling with `@supabase/ssr`
- Protected routes for editor and dashboard

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4, shadcn/ui, Lucide React |
| **Editor** | TipTap v3 |
| **Real-time** | Yjs (CRDTs), Hocuspocus (WebSocket server) |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Prisma v7 |
| **Auth** | Supabase Auth (SSR) |
| **AI** | OpenAI API — streamed completions |
| **Validation** | Zod, React Hook Form |
| **Markdown** | remark, rehype-highlight, react-markdown, turndown |

---

## 🏗️ Architecture

<details>
<summary><b>Click to expand the architecture diagram</b></summary>

<br/>

```
┌─────────────────────────────────────────┐
│           Next.js App (port 3000)        │
│                                         │
│  Pages:                                 │
│  /           → Published feed           │
│  /editor     → New post                 │
│  /editor/[id]→ Edit existing post       │
│  /my-posts   → Author dashboard         │
│  /login      → Auth                     │
│  /signup     → Auth                     │
│                                         │
│  API Routes:                            │
│  /api/posts          GET / POST         │
│  /api/posts/[id]     GET / PUT / DELETE │
│  /api/ai/summarize   POST (streaming)   │
│  /api/ai/chat        POST (streaming)   │
│  /api/ai/tags        POST               │
└───────────────┬─────────────────────────┘
                │ HTTP / WebSocket
        ┌───────┴──────────┐
        │                  │
┌───────▼──────┐   ┌───────▼────────────────┐
│  Supabase    │   │  Collab Server          │
│  PostgreSQL  │   │  (Node.js, port 1234)   │
│  + Auth      │   │  Hocuspocus + pg        │
└──────────────┘   │  Loads/saves yjsState   │
                   └────────────────────────┘
```

The collab server is a standalone Node.js process. It loads saved Yjs binary state from PostgreSQL when the first client joins a room, syncs all connected clients, and persists state back when the last client disconnects — and periodically as a crash-safety net.

</details>

---

## 🗄️ Data Model

```prisma
model Post {
  id                 String   @id @default(uuid())
  title              String
  slug               String   @unique
  content            String   @db.Text       // Raw HTML from TipTap
  markdown           String   @db.Text       // Converted markdown
  excerpt            String                  // First ~150 chars of plain text
  tags               String[]
  username           String
  published          Boolean  @default(false)
  allowCollaboration Boolean  @default(false)
  yjsState           Bytes?                  // Binary Yjs document state
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model AiUsage {
  username   String
  date       String   // "YYYY-MM-DD" — one row per user per day
  tokensUsed Int      @default(0)
  @@id([username, date])
}
```

---

## ⚡ Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (PostgreSQL + Auth)
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone & install

```bash
git clone https://github.com/your-username/blogpost.git
cd blogpost
npm install
```

### 2. Environment variables

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://...          # Supabase connection string (pooler recommended)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:1234
```

Create `.env` inside `collab-server/`:

```env
DATABASE_URL=postgresql://...          # Same Supabase connection string
PORT=1234
```

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the app

```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — Collaboration WebSocket server
cd collab-server && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🔄 How Collaboration Works

```
User A opens /editor/post-uuid
        │
        ▼
HocuspocusProvider connects → joins WebSocket room "post-uuid"
        │
        ▼
Collab server: room in memory? NO → fetch yjsState from PostgreSQL
        │
        ▼
Yjs doc loaded → synced to User A

User B opens /editor/post-uuid
        │
        ▼
Room already in memory → instantly synced from in-memory Yjs doc

User A types → Yjs op broadcast → User B sees change in real-time
        │
        ▼
Last user closes tab → store() fires → yjsState saved to PostgreSQL
```

1. Every post uses its UUID as the Hocuspocus **room name**
2. `fetch()` fires once per room lifecycle — when it's first loaded into memory
3. `store()` fires when the last client disconnects and periodically while editing
4. Collaboration access is gated by `allowCollaboration` — collaborators get a read-only editor when it's `false`

---

## 🤖 AI Features

All AI routes require an active session and enforce a **per-user daily token limit** tracked in the `AiUsage` table.

| Route | Behavior |
|---|---|
| `POST /api/ai/summarize` | Streams a 100–200 word post summary |
| `POST /api/ai/chat` | Streams answers to questions grounded in the post |
| `POST /api/ai/tags` | Returns 3–5 relevant tag suggestions |

> Streaming uses the native Web Streams API (`ReadableStream`) — no extra library needed.

---

## 📁 Project Structure

<details>
<summary><b>Click to expand</b></summary>

<br/>

```
├── app/
│   ├── api/
│   │   ├── posts/              # CRUD for blog posts
│   │   │   └── [id]/           # Single post operations
│   │   └── ai/
│   │       ├── summarize/      # Streaming post summary
│   │       ├── chat/           # Streaming Q&A
│   │       └── tags/           # AI tag suggestions
│   ├── editor/
│   │   ├── page.tsx            # New post
│   │   └── [id]/page.tsx       # Edit existing post
│   ├── my-posts/page.tsx       # Author dashboard
│   ├── login/ & signup/        # Auth pages
│   └── page.tsx                # Public feed
│
├── components/
│   ├── Editor/
│   │   ├── BlogEditor.tsx      # Main editor + collab + AI panel
│   │   └── Menubar.tsx         # Formatting toolbar
│   ├── PostCard.tsx
│   ├── SearchBar.tsx
│   ├── TagFilter.tsx
│   └── SummarizeButton.tsx     # AI side panel trigger + panel
│
├── collab-server/
│   └── src/index.ts            # Hocuspocus WebSocket server
│
├── hooks/
│   ├── useAutosave.ts          # Debounced autosave hook
│   └── useDebounce.ts
│
├── lib/
│   ├── aiUsage.ts              # Daily token limit logic
│   ├── markdown.ts             # HTML → Markdown
│   ├── openai.ts               # OpenAI client
│   ├── prisma.ts               # Prisma client singleton
│   └── supabase/               # Supabase clients (browser + server)
│
└── prisma/
    └── schema.prisma
```

</details>

---

<div align="center">

Built with ❤️ using Next.js, Yjs, Supabase, and OpenAI

</div>
