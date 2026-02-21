# AI in BlogPost — What You Can Build with Claude

This is a TypeScript / Next.js project, so everything uses `@anthropic-ai/sdk`.

---

## Features You Can Add

| # | Feature | Where it lives | API type |
|---|---------|----------------|----------|
| 1 | **AI Writing Assistant** | Inside the editor — generate or continue content | Streaming |
| 2 | **Auto-generate Tags** | Editor toolbar — suggest tags from content | Single call |
| 3 | **Auto-generate Excerpt** | On save/publish — smarter than first 150 chars | Single call |
| 4 | **Title Suggestions** | Editor — suggest titles based on what you've written | Single call |
| 5 | **Improve Writing** | Editor — fix grammar, improve clarity, change tone | Streaming |
| 6 | **Post Summary for Readers** | Post view page — "TL;DR" button | Streaming |

---

## Step 1 — Install the SDK

```bash
npm install @anthropic-ai/sdk
```

---

## Step 2 — Add API Key

Add to your `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your key from: https://console.anthropic.com/settings/keys

> The SDK automatically reads `ANTHROPIC_API_KEY` from the environment — no manual passing needed.

---

## Step 3 — Create a shared Anthropic client

Create `lib/anthropic.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic()
// Reads ANTHROPIC_API_KEY from env automatically
```

---

## Feature 1 — AI Writing Assistant (streaming)

**What it does:** User clicks "Write with AI", types a prompt like "write an intro about React hooks", and text streams directly into the editor.

**Where:** Add a button to `BlogEditor.tsx` toolbar → calls `/api/ai/write`

### API route — `app/api/ai/write/route.ts`

```ts
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  const { prompt, existingContent } = await request.json()

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a blog writing assistant. Write content for a blog post.
${existingContent ? `Existing content so far:\n${existingContent}\n\n` : ''}
User request: ${prompt}

Write only the blog content — no explanations, no preamble. Use markdown formatting.`,
      },
    ],
  })

  // Return a streaming response that the browser can read incrementally
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

### Client call — in `BlogEditor.tsx`

```ts
async function handleAIWrite(prompt: string) {
  const response = await fetch('/api/ai/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, existingContent: content }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let aiText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    aiText += decoder.decode(value)
    // Insert text into TipTap editor as it streams in
    editor?.commands.insertContent(decoder.decode(value))
  }
}
```

---

## Feature 2 — Auto-generate Tags (single call)

**What it does:** User clicks "Suggest Tags" → Claude reads the post content → returns 3–5 relevant tags.

**Where:** Button in the tags row of `BlogEditor.tsx` → calls `/api/ai/tags`

### API route — `app/api/ai/tags/route.ts`

```ts
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { title, content } = await request.json()

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 128,
    messages: [
      {
        role: 'user',
        content: `Given this blog post, suggest 3-5 short, relevant tags.
Return ONLY a JSON array of lowercase strings, nothing else.
Example: ["react", "hooks", "typescript"]

Title: ${title}
Content (plain text): ${content.replace(/<[^>]*>/g, '').slice(0, 1000)}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const tags = JSON.parse(text)

  return NextResponse.json({ tags })
}
```

### Client call — in `BlogEditor.tsx`

```ts
async function handleSuggestTags() {
  const res = await fetch('/api/ai/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  })
  const { tags } = await res.json()
  // tags = ["react", "hooks", "typescript"]
  setTags((prev) => [...new Set([...prev, ...tags])])
}
```

---

## Feature 3 — Auto-generate Excerpt (single call)

**What it does:** Instead of blindly slicing the first 150 characters, Claude writes a proper 1–2 sentence summary of the whole post.

**Where:** Call this in `buildPost()` inside `BlogEditor.tsx` before saving, OR in the `/api/posts` POST handler.

### API route — `app/api/ai/excerpt/route.ts`

```ts
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { title, content } = await request.json()

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Write a 1-2 sentence excerpt (max 150 characters) for this blog post.
Return ONLY the excerpt text, nothing else.

Title: ${title}
Content: ${content.replace(/<[^>]*>/g, '').slice(0, 2000)}`,
      },
    ],
  })

  const excerpt = response.content[0].type === 'text'
    ? response.content[0].text.slice(0, 150)
    : ''

  return NextResponse.json({ excerpt })
}
```

---

## Feature 4 — Title Suggestions (single call)

**What it does:** User has written their post but hasn't titled it yet. Claude reads the content and suggests 3 catchy titles.

**Where:** Button next to the title input in `BlogEditor.tsx` → calls `/api/ai/titles`

### API route — `app/api/ai/titles/route.ts`

```ts
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { content } = await request.json()

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Suggest 3 blog post titles for the following content.
Return ONLY a JSON array of strings, nothing else.
Example: ["Title One", "Title Two", "Title Three"]

Content: ${content.replace(/<[^>]*>/g, '').slice(0, 1500)}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const titles = JSON.parse(text)

  return NextResponse.json({ titles })
}
```

---

## Feature 5 — Improve Writing (streaming)

**What it does:** User selects a block of text → chooses "Improve clarity" / "Fix grammar" / "Make it shorter" → Claude rewrites it and streams it back.

**Where:** Context menu or toolbar button in `BlogEditor.tsx` → calls `/api/ai/improve`

### API route — `app/api/ai/improve/route.ts`

```ts
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  const { text, instruction } = await request.json()
  // instruction = "improve clarity" | "fix grammar" | "make it shorter" | "make it more formal"

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${instruction} for the following blog post text.
Return ONLY the rewritten text — no explanations.

Text: ${text}`,
      },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

---

## Feature 6 — TL;DR for Readers (streaming)

**What it does:** On the post view page (`/post/[slug]`), a "TL;DR" button streams a bullet-point summary of the full post for readers who want the gist quickly.

**Where:** Add button to `app/post/[slug]/page.tsx` — needs a `"use client"` wrapper component since the page is a server component.

### API route — `app/api/ai/summarize/route.ts`

```ts
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  const { markdown } = await request.json()

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Summarize this blog post as 3-5 concise bullet points (TL;DR style).
Start each bullet with "• ".
Return ONLY the bullet points, nothing else.

Post content:
${markdown.slice(0, 4000)}`,
      },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

### Client component — `components/PostSummary.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

export default function PostSummary({ markdown }: { markdown: string }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)

  async function handleSummarize() {
    setShown(true)
    setLoading(true)
    setSummary('')

    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    setLoading(false)

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      setSummary((prev) => prev + decoder.decode(value))
    }
  }

  return (
    <div className="mb-8">
      {!shown ? (
        <button
          onClick={handleSummarize}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
        >
          <Sparkles className="size-4" />
          TL;DR — Summarize this post
        </button>
      ) : (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-sm font-medium text-primary mb-3">
            <Sparkles className="size-4" />
            TL;DR
          </div>
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {summary}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

Then drop `<PostSummary markdown={post.markdown} />` into `app/post/[slug]/page.tsx` just above the post content.

---

## Which feature to build first?

Start with **Feature 2 (Tags)** — it's the simplest, no streaming, immediate value.
Then **Feature 6 (TL;DR)** — visible to all readers, no editor changes needed.
Then **Feature 1 (Writing Assistant)** — biggest impact for authors.

---

## Cost (rough estimates)

| Feature | Tokens per use | Cost (Opus 4.6) |
|---------|---------------|-----------------|
| Tags | ~500 in + 50 out | ~$0.003 |
| Excerpt | ~800 in + 50 out | ~$0.005 |
| Titles | ~800 in + 100 out | ~$0.006 |
| TL;DR | ~2000 in + 200 out | ~$0.015 |
| Writing assist | ~500 in + 500 out | ~$0.015 |
| Improve writing | ~300 in + 300 out | ~$0.010 |

All cheap enough to offer free to users. If you want to save cost, swap `claude-opus-4-6` with `claude-haiku-4-5` for the quick single-call features (tags, excerpt, titles) — same quality for these simple tasks at 5x lower cost.
