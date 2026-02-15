🧠 First: Architecture Overview

After Supabase integration, your system looks like this:

Browser
   ↓
Next.js (Server / API Routes)
   ↓
Supabase Client
   ↓
Postgres Database


Important:

We will NOT call Supabase directly from client for everything.

We will use server-side actions or API routes for clean architecture.

🧱 Updated Folder Structure (With Supabase)
blog-platform/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── post/
│   │   └── [slug]/
│   │       └── page.tsx
│   │
│   ├── editor/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   └── api/
│       └── posts/
│           ├── route.ts        # GET, POST
│           └── [id]/
│               └── route.ts    # PUT, DELETE
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


Now I’ll explain each important file.

📦 1️⃣ Install Supabase
npm install @supabase/supabase-js

🔐 2️⃣ Setup Environment Variables

.env.local

NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key


Important:

NEXT_PUBLIC_* → safe for browser

SERVICE_ROLE_KEY → server only

📁 lib/supabase/

We separate client and server usage.

🔹 lib/supabase/client.ts

Used in client components.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

🔹 lib/supabase/server.ts

Used in server routes / server components.

import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


Why separate?

Security.

You NEVER expose service role key to browser.

Interview talking point:

I separated client and server Supabase instances to prevent exposing privileged keys.

📁 lib/services/post.service.ts

This file handles ALL post database logic.

We never call Supabase directly from UI.

🔹 Example: post.service.ts
import { supabaseServer } from "../supabase/server";
import { Post } from "../types";

export async function getAllPosts() {
  const { data, error } = await supabaseServer
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function createPost(post: Post) {
  const { data, error } = await supabaseServer
    .from("posts")
    .insert([post]);

  if (error) throw error;

  return data;
}


This keeps DB logic centralized.

If tomorrow you change DB → only this file changes.

📁 app/api/posts/route.ts

This is Next.js API route.

Handles:

GET → fetch posts

POST → create post

Example:

import { NextResponse } from "next/server";
import { getAllPosts, createPost } from "@/lib/services/post.service";

export async function GET() {
  const posts = await getAllPosts();
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const post = await createPost(body);
  return NextResponse.json(post);
}


Now your frontend calls:

fetch("/api/posts")


Instead of talking directly to Supabase.

This is clean architecture.

📁 Database Schema (Supabase)

Create table posts:

id          uuid (primary key)
title       text
slug        text (unique)
content     text  (markdown)
tags        text[]
published   boolean
created_at  timestamp
updated_at  timestamp


Important:

content → store Markdown string

tags → Postgres array type

📁 app/page.tsx (Home Page with DB)

Instead of localStorage:

async function getPosts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/posts`, {
    cache: "no-store"
  });
  return res.json();
}


Now posts come from DB.

📁 editor/page.tsx (Save Post)

On save:

await fetch("/api/posts", {
  method: "POST",
  body: JSON.stringify(post),
});

🧠 Data Flow After Supabase
User writes post
      ↓
TipTap editor
      ↓
Markdown string
      ↓
POST /api/posts
      ↓
post.service.ts
      ↓
Supabase
      ↓
Postgres DB


Clean. Structured. Replaceable.

🚀 Why This Is Interview-Level Good

✔ Clear separation of concerns
✔ Backend abstraction
✔ Secure key handling
✔ Server vs client distinction
✔ Scalable structure

If interviewer asks:

Why use API route instead of calling Supabase directly from frontend?

You answer:

It prevents exposing privileged credentials and centralizes business logic. It also allows easier validation and future backend migration.