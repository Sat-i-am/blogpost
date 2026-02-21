# How Streaming Responses Work

This doc explains how streaming works in `app/api/ai/summarize/route.ts` and the client in `components/SummarizeButton.tsx` — each method, object, and the reasons behind the choices.

---

## Full flow: from “Summarize” to streamed text

High-level view of what happens when the user clicks **Summarize** and how data moves through the system.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  USER CLICKS "Summarize"                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  BROWSER (SummarizeButton.tsx)                                                           │
│  • setOpen(true) → panel slides in                                                       │
│  • setLoading(true), setSummary('') → spinner shows, summary area empty                  │
│  • fetch('/api/ai/summarize', { body: JSON.stringify({ markdown }) })                    │
│    → HTTP request sent with blog content                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  SERVER (route.ts)                                                                       │
│  • Auth + rate limit check → if fail: return JSON error (401/429), flow stops            │
│  • openai.chat.completions.create({ stream: true }) → get async iterable, no full reply  │
│  • new ReadableStream({ start(controller) { for await (chunk of stream) { ... } } })      │
│  • return new Response(readable) → response headers sent, body = stream                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
          ┌─────────────────────────────┴─────────────────────────────┐
          │  CONNECTION STAYS OPEN — chunks flow as OpenAI produces them  │
          └─────────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  BROWSER (SummarizeButton.tsx)                                                           │
│  • res.body.getReader() → lock stream, get reader                                        │
│  • while (true) { read() → decode chunk → setSummary(prev => prev + chunk) }              │
│  • Each chunk → React re-renders → user sees text appear word by word                    │
│  • When done: reader.read() returns { done: true } → loop exits, setLoading(false)       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## What the user sees over time (timeline)

Same request, from the user’s perspective: what’s on screen at each moment.

```
  TIME        USER SEES IN THE PANEL
  ─────────────────────────────────────────────────────────────────────
  0.0s        [ Spinner ] "Summarizing..."
              (panel just opened, request sent)

  0.3s        [ Spinner ] "Summarizing..."
              (server passed auth/limits, OpenAI stream started)

  0.5s        "• "                    ← first chunk arrived, spinner can hide
  0.6s        "• This post covers "
  0.8s        "• This post covers React hooks and state management."
  1.0s        "• This post covers React hooks and state management.
               • Key topics include useState..."
  ...
  2.5s        Full summary visible, no spinner
              (stream ended, done=true, loading=false)
  ─────────────────────────────────────────────────────────────────────
```

So: **spinner** until the first chunk; then **text growing** until the stream ends.

---

## Data shape at each step

What the data looks like as it moves from click to UI.

```
  WHERE              DATA FORM
  ─────────────────────────────────────────────────────────────────────
  User input         markdown: string (full blog post)

  fetch() body       JSON: { markdown: "..." }

  route.ts           markdown from request.json()

  OpenAI request     messages: [{ role: 'user', content: "Summarize this..." }]

  OpenAI stream      chunk: { choices: [{ delta: { content: "• " } }] }
  (each chunk)       chunk: { choices: [{ delta: { content: " React" } }] }
                     ... then last chunk: { usage: { total_tokens: 42 } }

  Our stream         bytes: Uint8Array (encoder.encode("• ")), etc.

  HTTP response      Same bytes, sent in chunks (transfer-encoding: chunked)

  Browser reader     value: Uint8Array (same bytes)

  After decode       chunk: "• ", " React", ...

  React state        summary: string, built by prev => prev + chunk

  UI                 <p>{summary}</p>  → visible text
  ─────────────────────────────────────────────────────────────────────
```

---

## Three common questions

### 1. Why do I need a ReadableStream? What if I send the response directly?

**"Sending the response directly"** would mean something like: wait for the full summary, then `return Response.json({ summary: fullText })`. But then you **must wait** for OpenAI to finish the entire reply before you can return anything. The HTTP contract is: you return **one** response (headers + body). The body can be either:

- **A complete body** — e.g. one big string or one JSON payload. You have to have the whole thing before you can send it.
- **A stream (ReadableStream)** — the body is "whatever you push over time." You don't need the full summary; you can push chunk₁, then chunk₂, then chunk₃, and the runtime sends each chunk as it's ready.

So: to send data **as it arrives** (streaming), the Web API only gives you one option — the response body must be a **ReadableStream**. You can't "send the response directly" in chunks without that; there is no other built-in way to say "here's a second piece of the body" after the first. The stream is the abstraction that means "body = sequence of chunks."

```
  Without stream:     return Response.json({ summary })   →  need full summary first →  no streaming
  With stream:        return new Response(readable)       →  body = chunks you push   →  streaming
```

---

### 2. So the client and server HTTP connection stays open? How?

**Yes.** One HTTP request, one TCP connection, and it stays open until the response body is finished.

- **Browser** sends `POST /api/ai/summarize` and keeps the connection open waiting for the response.
- **Server** returns immediately with **headers** (e.g. 200, `Content-Type: text/plain`) and a **body** that is a stream. It does **not** send a `Content-Length` (because we don't know the total size yet). Instead the response uses **chunked transfer encoding**: the protocol says "I'll send the body in chunks; each chunk has a size, then data; the end is marked by a zero-length chunk."
- **Connection stays open** because the server hasn't sent "end of body" yet — it keeps pushing chunks. When we call `controller.enqueue(bytes)`, that chunk goes over the same connection. When we call `controller.close()`, we signal "no more chunks," the server sends the final 0-length chunk, and the connection can close (or be reused).

So "how?" = **chunked transfer encoding**: one long-lived response, body sent in pieces. No special second connection; it's the same request/response, with the body streamed.

```
  Browser                    Server
     |                          |
     |------- POST ------------>|   connection open
     |<------ 200 + headers -----|   (no Content-Length)
     |<------ chunk 1 ----------|   still open
     |<------ chunk 2 ----------|   still open
     |<------ chunk 3 ----------|   still open
     |<------ chunk 4 ----------|   still open
     |<------ 0 (end body) -----|   now connection can close
```

---

### 3. Why encode it? (Why TextEncoder?)

**HTTP bodies are bytes.** Over the wire you don't send JavaScript strings; you send a sequence of bytes. So the Web Streams API says: **ReadableStream carries bytes** (`Uint8Array`), not strings.

- **Server:** We have a string (e.g. `"• React"`). To put it in the stream we must turn it into bytes: `encoder.encode("• React")` → `Uint8Array`. That's what `controller.enqueue()` expects.
- **Client:** We receive bytes and turn them back into a string: `decoder.decode(value)`.

**Why not send strings?** The stream API is generic (files, binary, text from any source). The universal format for "data on the wire" is bytes. So the API uses bytes; for text we encode (server) and decode (client). For UTF-8 text, `TextEncoder`/`TextDecoder` do that.

```
  In JavaScript (server):    "• React"   (string)
  In the stream / on wire:   [ 0xE2, 0x80, 0xA2, 0x20, 0x52, ... ]   (bytes, UTF-8)
  In JavaScript (client):    "• React"   (string again, after decode)
```

---

## The Problem with Normal API Calls

In a normal (non-streaming) API call, the full lifecycle looks like this:

```
Browser          Your Server         OpenAI
  |                   |                 |
  |--- POST /api ---->|                 |
  |                   |--- API call --->|
  |                   |                 |
  |                   |  (waiting...)   |  ← OpenAI generates ALL tokens
  |                   |                 |
  |                   |<-- full text ---|
  |<-- JSON response -|                 |
```

The user sees a blank/spinner for the entire generation time. For 300 tokens on gpt-4o-mini that's ~2–3 seconds of nothing.

---

## How Streaming Changes This

OpenAI generates text **one token at a time** internally. With streaming enabled, it sends each token to you as soon as it’s ready instead of buffering the whole reply.

```
Browser          Your Server         OpenAI
  |                   |                 |
  |--- POST /api ---->|                 |
  |                   |--- stream:true->|
  |                   |                 |
  |                   |<-- "•" ---------|  token 1 arrives
  |<-- chunk "•" -----|                 |  server forwards immediately
  |                   |<-- " React" ----|  token 2 arrives
  |<-- chunk " React" |                 |  server forwards immediately
  |        ...        |       ...       |
  |                   |<-- [DONE] ------|  stream ends
  |<-- stream end ----|                 |
```

The HTTP connection stays open the whole time. Text appears incrementally in the browser.

---

## Route.ts — Method-by-Method Breakdown

### 1. Why do auth and limit checks **before** starting the stream?

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user?.email) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
await checkDailyLimit(user.email)
```

**Why:** Once you return a `Response` whose body is a `ReadableStream`, you can only send that stream. You cannot later send a different status code or a JSON error body. So any validation (auth, rate limit) must run first and return a normal `Response.json()` on failure. If you started the stream and then discovered the user was over limit, you’d have no clean way to send a 429 JSON error.

---

### 2. `openai.chat.completions.create({ ..., stream: true })`

```ts
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  max_tokens: 300,
  stream: true,
  stream_options: { include_usage: true },
  messages: [...]
})
```

- **What it does:** Calls the OpenAI API. With `stream: true`, it does **not** wait for the full reply. It returns as soon as the stream is set up.
- **What `stream` actually is:** An **async iterable**. You consume it with `for await (const chunk of stream)`. Each `chunk` is a small piece of the response (often 1–3 tokens).
- **Why `stream: true`:** So we get chunks as they’re generated and can forward them to the browser immediately instead of waiting for the entire summary.

**Why `stream_options: { include_usage: true }`?**  
In non-streaming mode, the API returns `response.usage` (e.g. `total_tokens`) in the final JSON. In streaming mode, the final payload is a sequence of chunks, so there is no single “final JSON”. With `include_usage: true`, OpenAI sends one extra chunk at the end that contains the `usage` object. We use that to call `trackUsage(username, chunk.usage.total_tokens)` accurately instead of guessing (e.g. `content.length / 4`).

---

### 3. `new TextEncoder()`

```ts
const encoder = new TextEncoder()
```

- **What it does:** `TextEncoder` is a Web API that turns a JavaScript string into **bytes** (`Uint8Array`).
- **Why we need it:** A `ReadableStream` carries **bytes**, not strings. So we must encode each text chunk before pushing it: `encoder.encode(text)`.

---

### 4. `new ReadableStream({ async start(controller) { ... } })`

```ts
const readable = new ReadableStream({
  async start(controller) {
    try {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          controller.enqueue(encoder.encode(text))
        }
        if (chunk.usage) {
          await trackUsage(username, chunk.usage.total_tokens)
        }
      }
    } finally {
      controller.close()
    }
  },
})
```

- **What `ReadableStream` is:** A Web Standard for a stream of data that someone can read from (e.g. the browser reading the response body). It works in Node, Edge, and the browser.
- **What `start(controller)` does:** This callback runs when the stream is first used. It’s the place where we **produce** the data. We’re not required to push all data inside `start`; we could use `pull(controller)` for demand-driven flow. For our case, “push every OpenAI chunk as it arrives” fits an async `start` + `for await` loop.
- **Why `start` is async:** We need to `for await` over the OpenAI stream and optionally `await trackUsage(...)`. Async keeps the event loop free while we wait for the next chunk.

**What each part does:**

| Piece | Role |
|-------|------|
| `for await (const chunk of stream)` | Consumes the OpenAI async iterable; each `chunk` is one SSE-style chunk from the API. |
| `chunk.choices[0]?.delta?.content` | OpenAI sends content in `choices[0].delta.content`. Most chunks have a small string here (e.g. `" React"`); the last chunk may have `usage` and no new content. |
| `controller.enqueue(encoder.encode(text))` | Pushes the **encoded** chunk into our `ReadableStream`. The browser (or whoever reads this stream) will see these bytes as they’re enqueued. |
| `controller.close()` | Marks the stream as finished. No more data will be sent. Must be called so the client’s `reader.read()` eventually gets `done: true`. We do it in `finally` so we close even if an error occurs. |

**Why we use `ReadableStream` at all:** The HTTP response body in the Web API is specified as a `ReadableStream`. By creating one and passing it to `new Response(readable, ...)`, we plug our data source (OpenAI chunks) directly into the response. The runtime then sends each enqueued chunk over the wire as it’s ready — no need to buffer the full response.

---

### 5. `return new Response(readable, { headers: { ... } })`

```ts
return new Response(readable, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
})
```

- **What it does:** Builds an HTTP response whose **body** is our `readable` stream. The server will send response headers immediately, then send the body in chunks as we call `controller.enqueue()`.
- **Why `new Response()` and not `NextResponse.json()`?**  
  `NextResponse.json()` would serialize the whole body to one JSON string and send it in one go — i.e. it would buffer the entire response. That would defeat streaming. `new Response(readableStream)` is the raw Web API: the body is the stream itself, so data goes out chunk by chunk without buffering the full summary. Next.js App Router supports this.
- **Why `Content-Type: text/plain; charset=utf-8`?**  
  We’re sending plain text (the summary), not JSON. Telling the client it’s UTF-8 text ensures correct decoding and avoids any JSON parsing on the client for the streamed body.

---

## Client Side — SummarizeButton.tsx

### 6. `res.body` and `res.body.getReader()`

```ts
const reader = res.body!.getReader()
```

- **What `res.body` is:** The response body on the client is also a `ReadableStream` — it’s the other end of the same logical pipe. What the server enqueues, the client reads here.
- **What `getReader()` does:** It “locks” the stream to a single reader and returns a **reader** object. You then use `reader.read()` to get the next chunk. Only one reader can read at a time.

---

### 7. `reader.read()` loop

```ts
while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value, { stream: true })
  setSummary((prev) => prev + chunk)
}
```

- **What `reader.read()` does:** Returns a Promise that resolves when the next chunk is available (or when the stream is closed). `value` is a `Uint8Array` of bytes; `done` is `true` when the server called `controller.close()` and there’s no more data.
- **Why a loop:** So we keep reading until the stream ends. Each chunk is decoded and appended to React state, so the UI updates as data arrives.
- **Why `decoder.decode(value, { stream: true })`?**  
  `TextDecoder` turns bytes back into a string. `stream: true` means “this might not be the last chunk.” That matters for multi-byte characters (e.g. emoji, or non-ASCII) that can be split across two chunks; with `stream: true` the decoder doesn’t assume the buffer is complete and can handle split bytes correctly.

---

## End-to-End Flow

```
OpenAI                 Your Server (route.ts)              Browser (SummarizeButton.tsx)
  |                            |                                    |
  |  Async iterable             |  ReadableStream                    |  res.body (ReadableStream)
  |  (for await loop)           |  (controller.enqueue)              |  (reader.read loop)
  |                            |                                    |
  |-- "• React" -------------->| enqueue(encode("• React")) -------->| decode → setSummary("• React")
  |-- " is" ------------------->| enqueue(encode(" is")) ----------->| decode → setSummary("• React is")
  |-- " fast" ----------------->| enqueue(encode(" fast")) --------->| decode → setSummary("• React is fast")
  |-- [usage chunk] ----------->| trackUsage(tokens)                 |
  |-- [DONE] ------------------>| controller.close() --------------->| done=true, loop ends
```

---

## Pipeline view: one chunk’s journey

Follow a single piece of text (e.g. `" hooks"`) from OpenAI to the screen.

```
  ┌──────────────┐      ┌──────────────────────────────────────┐      ┌─────────────────────┐
  │   OPENAI     │      │         YOUR SERVER (route.ts)        │      │   BROWSER (React)   │
  └──────┬───────┘      └─────────────────┬────────────────────┘      └──────────┬──────────┘
         │                                │                                      │
         │  chunk = { choices: [          │                                      │
         │    { delta: { content:         │                                      │
         │        " hooks" } } ] }         │                                      │
         │                                │                                      │
         │  for await (chunk of stream)   │                                      │
         │ ──────────────────────────────>│                                      │
         │                                │  text = " hooks"                     │
         │                                │  controller.enqueue(                  │
         │                                │    encoder.encode(" hooks")           │
         │                                │  )  →  bytes on the wire              │
         │                                │ ─────────────────────────────────────>│
         │                                │                                      │  reader.read()
         │                                │                                      │  → { value: Uint8Array }
         │                                │                                      │  decoder.decode(value)
         │                                │                                      │  → " hooks"
         │                                │                                      │  setSummary(prev => prev + " hooks")
         │                                │                                      │  → UI shows "...React hooks"
         │                                │                                      │
  ┌──────┴───────┐      ┌─────────────────┴────────────────────┐      ┌──────────┴──────────┘
  │  Next chunk  │      │  Loop continues for next chunk       │      │  User sees new text  │
  │  arrives     │      │  until stream ends                    │      │  immediately         │
  └──────────────┘      └──────────────────────────────────────┘      └─────────────────────┘
```

So: **OpenAI** emits an object with `delta.content` → **server** turns that into bytes and enqueues them → **browser** reads bytes, decodes to string, appends to state → **UI** re-renders with the new text.

---

## Quick Reference: Why We Use Each Piece

| Piece | Why |
|-------|-----|
| Auth/limits before stream | Once the stream response is returned, we can’t send a different status or JSON error. |
| `stream: true` | Get tokens as they’re generated instead of one big response. |
| `stream_options: { include_usage: true }` | Get accurate token count in the last chunk for usage tracking. |
| `TextEncoder` | Streams carry bytes; we need to turn strings into `Uint8Array`. |
| `ReadableStream` + `controller` | Web Standard way to produce a stream that becomes the response body. |
| `controller.enqueue()` | Push each chunk to the response so it’s sent immediately. |
| `controller.close()` | Signal end of stream so the client’s `reader.read()` gets `done: true`. |
| `new Response(readable)` | Send the body as a stream; no buffering of the full summary. |
| `res.body.getReader()` | Get a reader for the response stream on the client. |
| `decoder.decode(value, { stream: true })` | Correctly decode UTF-8 when chunks might split multi-byte characters. |
