included extension in starter kit: 
Included extensions
Nodes
Blockquote
BulletList
CodeBlock
Document
HardBreak
Heading
HorizontalRule
ListItem
OrderedList
Paragraph
Text
Marks
Bold
Code
Italic
Link (New in v3)
Strike
Underline (New in v3)
Extensions
Dropcursor
Gapcursor
Undo/Redo
ListKeymap (New in v3)
TrailingNode (New in v3)





how markdowns are handled: 
  ┌──────────────────┬───────────────────┬──────────────────────────────────────────────────┐
  │     Library      │     Direction     │                     Purpose                      │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ turndown         │ HTML -> Markdown  │ Convert TipTap HTML to markdown on save          │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ @types/turndown  │ (dev)             │ TypeScript types for turndown                    │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ react-markdown   │ Markdown -> React │ Render markdown as React components on post view │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ remark-gfm       │ Plugin            │ Tables, strikethrough, task lists                │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ rehype-highlight │ Plugin            │ Syntax-highlighted code blocks                   │
  └──────────────────┴───────────────────┴──────────────────────────────────────────────────┘



  NOTE:  we are storing html also in db cause html to markdown using turndown is causing some formatting losses(as you can see in post/slag page). so we will be displaying using html instead of markdown




---

## Why Store Yjs State in DB Instead of HTML?

### "I'm already autosaving HTML to DB, so why would data be lost?"

The `useAutosave` hook saves `content` (HTML) to the Post table every 2 seconds. So the HTML column is always up to date — **for a single user**.

But HTML and the Yjs document are **two fundamentally different things**:

| | Yjs Document (binary) | HTML String |
|---|---|---|
| **Contains** | Every character typed, position of each edit, who typed what, full undo/redo history, cursor positions, merge conflict resolution | Just the final rendered result: `<p>Hello world</p>` |
| **Used for** | Collaborative editing (syncing between clients) | Viewing/reading published posts |

When Tab B connects, the server sends it the **Yjs document** — not the HTML. Yjs doesn't understand HTML. It has its own binary format that tracks operations.

### The Race Condition Problem

When two tabs autosave HTML simultaneously:

```
Tab A and Tab B are both editing simultaneously:

  Tab A types "Hello" at position 0
  Tab B types "World" at position 0

  Yjs merges them correctly: "HelloWorld" (CRDT magic, no conflict)

  But autosave from Tab A sends its LOCAL HTML: "<p>Hello</p>"
  Autosave from Tab B sends its LOCAL HTML: "<p>World</p>"

  Last write wins → database has "<p>World</p>" → Tab A's edit is LOST
```

This is the classic **Last-Write-Wins** problem. Saving the Yjs binary avoids this entirely because it contains **both users' edits already merged**.

### Without Yjs Persistence (Server Restart Scenario)

```
Tab A types "Hello world"
  → Autosave writes HTML to PostgreSQL     (content column updated)
  → Yjs document lives in server RAM ONLY  (yjsState column = empty)

Server restarts → all Yjs rooms wiped from memory

Tab A reconnects
  → Server has no Yjs state → sends empty doc
  → Editor falls back to HTML from database
  → Works for single user, but loses collaborative merge history
```








### Two Columns, Two Purposes

You still need **both** columns — they serve different roles:

| Column | Source of truth for | Used by |
|--------|-------------------|---------|
| `yjsState` (binary) | **Editing** | `/editor/[id]` — loaded via Hocuspocus `fetch()` into Yjs, rendered by TipTap |
| `content` (HTML) | **Reading/Viewing** | `/post/[slug]`, home feed, search, excerpts — rendered with `react-markdown` |

### Data Flow

```
Editing:
  Open editor → Hocuspocus fetch() loads yjsState from DB → Yjs doc → TipTap renders
  User types  → Yjs captures it → Hocuspocus store() saves yjsState to DB

Publishing:
  User clicks "Publish" → editor.getHTML() → POST /api/posts → updates content (HTML) column
  View pages read from content column as before
```