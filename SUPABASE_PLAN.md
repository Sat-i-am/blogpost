# Supabase + Prisma Integration Plan

## What We're Doing

Replacing localStorage with a real PostgreSQL database hosted on Supabase.
We'll use **Prisma** as the ORM (Object-Relational Mapper) — it generates
type-safe database queries from a schema file, so we never write raw SQL.

## Why Prisma?

- We define our database schema in one file (`prisma/schema.prisma`)
- Prisma auto-generates TypeScript types that match our database tables
- Queries look like `prisma.post.findMany()` instead of raw SQL
- Switching databases later = changing one line in the schema file

## Why Supabase?

- Free hosted PostgreSQL database (500MB on free tier)
- Gives us a connection string we plug into Prisma
- Has a dashboard to view/edit data visually
- Can add auth, file storage, real-time later if needed

---

## Step 1: Set Up Supabase Project (You Do This)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project" — pick a name, set a database password, choose a region
3. Once created, go to **Settings > Database > Connection string**
4. Copy the **URI** connection string (starts with `postgresql://...`)
5. You'll paste this into our `.env` file in the next step

---

## Step 2: Install Prisma (We Do This)

```bash
npm install prisma @prisma/client
npx prisma init
```

**What this does:**
- `prisma` — the CLI tool for migrations, generating client, etc.
- `@prisma/client` — the library we import in our code to query the database
- `npx prisma init` — creates two files:
  - `prisma/schema.prisma` — where we define our database tables
  - `.env` — where the database connection string goes

---

## Step 3: Configure the Connection — `.env`

```env
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"
```

**What's happening:** This tells Prisma where our database lives.
The URL contains the username, password, host, port, and database name.

**Important:** `.env` should already be in `.gitignore` — never commit passwords.

---

## Step 4: Define the Schema — `prisma/schema.prisma`

```prisma
// This file tells Prisma what tables to create in the database.
// It also generates TypeScript types we use in our code.

generator client {
  provider = "prisma-client-js"   // Generates the @prisma/client library
}

datasource db {
  provider = "postgresql"          // We're using PostgreSQL (Supabase)
  url      = env("DATABASE_URL")   // Reads the connection string from .env
}

// This model becomes a "Post" table in the database.
// Each field becomes a column.
model Post {
  id        String   @id @default(uuid())   // Primary key, auto-generated UUID
  title     String                           // Post title
  slug      String   @unique                 // URL slug, must be unique
  content   String   @db.Text                // HTML from TipTap (Text = unlimited length)
  markdown  String   @db.Text                // Converted markdown
  excerpt   String                           // First 150 chars for previews
  tags      String[]                         // PostgreSQL native array of strings
  published Boolean  @default(false)         // Draft by default
  createdAt DateTime @default(now())         // Auto-set on creation
  updatedAt DateTime @updatedAt              // Auto-updated on every save
}
```

**What each annotation means:**
- `@id` — this is the primary key (unique identifier for each row)
- `@default(uuid())` — auto-generate a UUID when creating a new post
- `@unique` — no two posts can have the same slug
- `@db.Text` — use PostgreSQL's TEXT type (unlimited length, vs VARCHAR's 255 limit)
- `String[]` — PostgreSQL supports native arrays, perfect for tags
- `@default(now())` — set to current timestamp when row is created
- `@updatedAt` — Prisma automatically updates this on every save

---

## Step 5: Push Schema to Database

```bash
npx prisma db push
```

**What this does:** Reads `schema.prisma` and creates the actual `Post` table
in our Supabase PostgreSQL database. After this, you can go to the Supabase
dashboard > Table Editor and see the `Post` table with all its columns.

```bash
npx prisma generate
```

**What this does:** Generates the TypeScript client code inside `node_modules/@prisma/client`.
This is what gives us type-safe queries like `prisma.post.findMany()`.

---

## Step 6: Create Prisma Client — `lib/prisma.ts`

```ts
// This file creates a single Prisma client instance for the entire app.
// In development, Next.js hot-reloads modules which would create a new
// database connection on every reload. We store the client on `globalThis`
// to reuse the same connection across reloads.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Why the globalThis trick?**
Every time you save a file in dev mode, Next.js hot-reloads your code.
Each reload would normally create a NEW database connection, eventually
exhausting the connection pool. Storing on `globalThis` prevents this —
the same client survives across reloads.

---

## Step 7: Update Storage Layer — `lib/storage.ts`

This is the key file. We replace the localStorage calls with Prisma queries.
Since Prisma queries are **async** (they go over the network to Supabase),
all methods become `async` functions.

**Before (localStorage):**
```ts
getAllPosts(): BlogPost[] {
  return getAll().sort(...)
}
```

**After (Prisma):**
```ts
async getAllPosts(): Promise<BlogPost[]> {
  return prisma.post.findMany({
    orderBy: { updatedAt: 'desc' }
  })
}
```

**Full method mapping:**

| Method | localStorage | Prisma |
|--------|-------------|--------|
| `getAllPosts()` | `JSON.parse(localStorage.getItem(...))` | `prisma.post.findMany({ orderBy: { updatedAt: 'desc' } })` |
| `getPublishedPosts()` | `getAll().filter(p => p.published)` | `prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } })` |
| `getPostBySlug(slug)` | `getAll().find(p => p.slug === slug)` | `prisma.post.findUnique({ where: { slug } })` |
| `getPostById(id)` | `getAll().find(p => p.id === id)` | `prisma.post.findUnique({ where: { id } })` |
| `savePost(post)` | `posts[index] = post; localStorage.setItem(...)` | `prisma.post.upsert({ where: { id }, create: {...}, update: {...} })` |
| `deletePost(id)` | `posts.filter(p => p.id !== id)` | `prisma.post.delete({ where: { id } })` |
| `searchPosts(query)` | `getAll().filter(...)` | `prisma.post.findMany({ where: { OR: [{ title: { contains: query } }, ...] } })` |

---

## Step 8: Create API Routes — `app/api/posts/`

Since Prisma runs on the **server** (it needs the database connection string),
and our pages are client components (they use useState, useEffect, etc.),
we need API routes as the bridge.

**Why can't we call Prisma directly from client components?**
- Client components run in the browser
- The browser doesn't have `DATABASE_URL` (and shouldn't — it's a secret)
- Prisma requires Node.js (it uses native bindings)
- So: client components → fetch API route → Prisma → database

### Routes to create:

**`app/api/posts/route.ts`** — handles the collection
- `GET /api/posts` — list all published posts (with optional `?search=` and `?tag=` query params)
- `POST /api/posts` — create or update a post (used by the editor's save/publish)

**`app/api/posts/[id]/route.ts`** — handles a single post
- `GET /api/posts/[id]` — get a post by ID (used by the editor when loading)
- `DELETE /api/posts/[id]` — delete a post

**`app/api/posts/slug/[slug]/route.ts`** — get by slug
- `GET /api/posts/slug/[slug]` — get a post by its URL slug (used by the post view page)

---

## Step 9: Update Components to Use API Routes

All the components that currently call `storage.xxx()` directly need to
switch to `fetch('/api/posts/...')` calls instead.

### Files to update:

| File | What changes |
|------|-------------|
| `app/page.tsx` (feed) | `storage.getPublishedPosts()` → `fetch('/api/posts')` |
| `app/post/[slug]/page.tsx` | `storage.getPostBySlug(slug)` → `fetch('/api/posts/slug/${slug}')` |
| `app/editor/[id]/page.tsx` | `storage.getPostById(id)` → `fetch('/api/posts/${id}')` |
| `hooks/useAutosave.ts` | `storage.savePost(post)` → `fetch('/api/posts', { method: 'POST', body: ... })` |
| `components/Editor/BlogEditor.tsx` | `storage.savePost(post)` → `fetch('/api/posts', { method: 'POST', body: ... })` |

### What the fetch calls look like:

```ts
// Before (localStorage):
const posts = storage.getPublishedPosts()

// After (API route):
const res = await fetch('/api/posts')
const posts = await res.json()
```

```ts
// Before (localStorage):
storage.savePost(post)

// After (API route):
await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(post),
})
```

---

## Step 10: Update Types — `lib/types.ts`

Minor change: `createdAt` and `updatedAt` change from `string` (ISO) to `Date`
since Prisma returns JavaScript Date objects. Or we can keep them as strings
and convert in the API routes — either works.

We'll keep the existing `BlogPost` interface and serialize dates to strings
in the API response so the frontend doesn't need changes.

---

## Step 11: SEO Upgrade (Bonus)

Now that data lives on the server, we can make the post view page a
**server component** with proper `generateMetadata`:

```ts
// app/post/[slug]/page.tsx can now be a server component
// because we can query the DB directly (no localStorage)

export async function generateMetadata({ params }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } })
  return {
    title: post?.title,
    description: post?.excerpt,
    openGraph: {
      title: post?.title,
      description: post?.excerpt,
    },
  }
}
```

This means search engines and social media previews will see real
post titles and descriptions — proper SEO at last.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `.env` | Create | Database connection string |
| `prisma/schema.prisma` | Create | Database table definition |
| `lib/prisma.ts` | Create | Singleton Prisma client |
| `lib/storage.ts` | Modify | Replace localStorage with Prisma queries |
| `app/api/posts/route.ts` | Create | GET (list) + POST (create/update) API |
| `app/api/posts/[id]/route.ts` | Create | GET (by id) + DELETE API |
| `app/api/posts/slug/[slug]/route.ts` | Create | GET (by slug) API |
| `app/page.tsx` | Modify | Fetch from API instead of localStorage |
| `app/post/[slug]/page.tsx` | Modify | Fetch from API, add generateMetadata |
| `app/editor/[id]/page.tsx` | Modify | Fetch from API instead of localStorage |
| `hooks/useAutosave.ts` | Modify | POST to API instead of localStorage |
| `components/Editor/BlogEditor.tsx` | Modify | POST to API instead of localStorage |
| `lib/types.ts` | Keep | No changes needed (dates serialized as strings) |

## Implementation Order

1. You: Create Supabase project, get connection string
2. Install Prisma, init, configure `.env`
3. Define schema, push to database
4. Create `lib/prisma.ts` client
5. Create API routes (`app/api/posts/...`)
6. Update `lib/storage.ts` (or replace with direct API calls)
7. Update all components to use `fetch()` instead of `storage.xxx()`
8. SEO upgrade on post pages
9. Test full flow: create → view → edit → search
10. Deploy
