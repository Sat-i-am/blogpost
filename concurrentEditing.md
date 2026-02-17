# Handling Concurrent Editing Conflicts

## Table of Contents
- [The Problem](#the-problem)
- [Solution Strategies](#solution-strategies)
- [Real-Time Collaboration Deep Dive](#real-time-collaboration-deep-dive)

---

## The Problem

When multiple users edit the same document simultaneously without proper conflict handling, several issues arise:

### 🚨 Common Problems

| Issue | Description | Impact |
|-------|-------------|--------|
| **Last-Write-Wins** | The last user to save overwrites all previous changes | Complete data loss for earlier users |
| **Lost Updates** | User A's work silently disappears when User B saves | Frustration and wasted effort |
| **Inconsistent State** | Users don't know others are editing the same document | Confusion and duplicate work |

---

## Solution Strategies

There are three main approaches to handling concurrent editing, each suited for different use cases.

---

### 1. 🔐 Optimistic Locking (Simple Versioning)

**Best for:** Admin dashboards, blog editors, low-frequency collaboration

#### How It Works

Add a `version` field to your database schema:

```json
{
  "id": 1,
  "content": "...",
  "version": 5
}
```

#### The Flow

1. **On Load:** Client receives `version: 5`
2. **On Save:** Execute conditional update:

```sql
UPDATE posts
SET content = "...", version = 6
WHERE id = 1 AND version = 5
```

3. **Conflict Detection:** If the version changed, the update fails (0 rows affected)
4. **User Notification:** Show message:

```
⚠️ This draft was updated by someone else. 
Please reload to see the latest changes before saving.
```

#### Pros & Cons

✅ **Pros:**
- Simple to implement
- No infrastructure overhead
- Works with any database

❌ **Cons:**
- Manual conflict resolution required
- Last editor must redo their work
- No real-time awareness

---

### 2. 🕒 Pessimistic Locking (Draft Locking)

**Best for:** CMS systems, publishing workflows, document management

#### How It Works

Add lock fields to your schema:

```typescript
interface Post {
  id: string
  content: string
  lockedBy: string | null
  lockedAt: Date | null
}
```

#### The Flow

1. **On Open:** Set lock when user enters editor:

```typescript
await db.post.update({
  where: { id: postId },
  data: {
    lockedBy: currentUserId,
    lockedAt: new Date()
  }
})
```

2. **For Other Users:** Display lock indicator:

```
🔒 This draft is currently being edited by John Doe.
[View Read-Only] [Request Access] [Force Unlock]
```

3. **On Close:** Release lock automatically or after timeout

#### Implementation Options

| Approach | Description | Use Case |
|----------|-------------|----------|
| **Hard Lock** | Completely prevent editing | Legal documents, contracts |
| **Soft Lock** | Allow viewing, warn on edit | Blog posts, articles |
| **Timed Lock** | Auto-release after inactivity | Prevent stale locks |
| **Force Unlock** | Admin override capability | Handle abandoned sessions |

#### Pros & Cons

✅ **Pros:**
- Clear ownership
- Prevents conflicts proactively
- Simple user experience

❌ **Cons:**
- Can block users unnecessarily
- Requires lock timeout management
- No simultaneous editing

---

### 3. ⚡ Real-Time Collaborative Editing

**Best for:** Notion-like apps, Google Docs style editing, multi-author live editing

#### Technologies

Uses one of two conflict resolution algorithms:

- **OT (Operational Transform)** - Used by Google Docs
- **CRDT (Conflict-free Replicated Data Types)** - Used by Figma, Notion

#### With TipTap

TipTap supports real-time collaboration using:

```
Yjs (CRDT engine) + Hocuspocus (WebSocket server)
```

#### Pros & Cons

✅ **Pros:**
- True simultaneous editing
- Automatic conflict resolution
- Live cursors and presence
- No data loss

❌ **Cons:**
- Complex infrastructure
- Requires WebSocket server
- Higher resource usage
- More challenging to implement

---

## Real-Time Collaboration Deep Dive

### Architecture Overview

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│   Client A      │ ←─────────────────────────→ │                  │
│  (TipTap + Yjs) │                             │   Hocuspocus     │
└─────────────────┘                             │     Server       │
                                                │   (Yjs + WS)     │
┌─────────────────┐         WebSocket          │                  │
│   Client B      │ ←─────────────────────────→ │                  │
│  (TipTap + Yjs) │                             └──────────────────┘
└─────────────────┘                                      ↓
                                                   PostgreSQL
                                              (persistence layer)
```

---

### Core Components

#### 1. **Yjs** — The Brain (CRDT Engine)

**Package:** `yjs`

**What it is:**  
A CRDT (Conflict-free Replicated Data Type) library that enables collaborative editing.

**Key Features:**
- ✅ Merges changes from multiple users automatically
- ✅ Prevents conflicts mathematically
- ✅ Ensures no data loss
- ✅ Syncs document state across clients

**How it Works:**

Instead of syncing full documents, Yjs tracks **operations**:

```javascript
// Example operations
{
  type: 'insert',
  position: 4,
  content: 'Hello'
}

{
  type: 'delete',
  position: 10,
  length: 2
}

{
  type: 'format',
  position: 0,
  length: 5,
  mark: 'bold'
}
```

These operations merge safely even when users type simultaneously.

**Creating a Shared Document:**

```javascript
import * as Y from 'yjs'

const ydoc = new Y.Doc()
```

This document exists on:
- 🌐 Every connected client
- 🖥️ The server
- 🔄 Syncs via updates

---

#### 2. **TipTap Collaboration Extension**

**Package:** `@tiptap/extension-collaboration`

**Purpose:**  
Bridges TipTap's ProseMirror document with Yjs.

```
TipTap (ProseMirror) ↔ Collaboration Extension ↔ Yjs Document
```

**Setup:**

```javascript
import { useEditor } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'

const ydoc = new Y.Doc()

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      history: false, // Disable default history (Yjs handles this)
    }),
    Collaboration.configure({
      document: ydoc,
    }),
  ],
})
```

> 💡 **Without this extension:** TipTap has no collaboration capabilities. This is the critical bridge.

---

#### 3. **Collaboration Cursor Extension**

**Package:** `@tiptap/extension-collaboration-cursor`

**Purpose:**  
Adds visual indicators for other users editing the document.

**Features:**
- 👁️ Live cursors with user names
- 🎨 Colored text selections
- 📍 Real-time position tracking

**Setup:**

```javascript
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

const editor = useEditor({
  extensions: [
    // ... other extensions
    CollaborationCursor.configure({
      provider: provider, // from Hocuspocus
      user: {
        name: 'John Doe',
        color: '#ff6b6b',
      },
    }),
  ],
})
```

---

#### 4. **Hocuspocus Server** — WebSocket Backend

**Package:** `@hocuspocus/server`

**Purpose:**  
Purpose-built WebSocket server for Yjs + TipTap collaboration.

**Responsibilities:**
- 🔌 Accepts WebSocket connections
- 🔄 Syncs Yjs updates between clients
- 🏠 Manages document "rooms"
- 🔐 Handles authentication
- 💾 Enables persistence to database

**Server Setup:**

```javascript
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,
  
  async onAuthenticate({ token }) {
    // Verify user token
    return { user: { id: 'user-123', name: 'John' } }
  },
  
  async onStoreDocument({ documentName, document }) {
    // Save to database
    await saveToPostgres(documentName, document)
  },
})

server.listen()
```

> ⚠️ **Without Hocuspocus:** You'd need to build your own WebSocket infrastructure with Yjs integration.

---

#### 5. **Hocuspocus Provider** — Frontend Connector

**Package:** `@hocuspocus/provider`

**Purpose:**  
Connects your browser to the Hocuspocus server.

**Setup:**

```javascript
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'

const ydoc = new Y.Doc()

const provider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: 'post-123', // Document room ID
  document: ydoc,
  token: authToken, // For authentication
})

// Listen to connection status
provider.on('status', event => {
  console.log(event.status) // 'connected' | 'disconnected'
})
```

**What it does:**
1. 🔗 Connects to WebSocket server
2. 🏠 Joins document room `"post-123"`
3. 🔄 Syncs Yjs document with other clients
4. 📡 Broadcasts local changes
5. 📥 Receives remote changes

---

### Complete Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend UI** | TipTap + React | Rich text editor interface |
| **Collaboration Bridge** | `@tiptap/extension-collaboration` | Connects TipTap to Yjs |
| **Cursor Sharing** | `@tiptap/extension-collaboration-cursor` | Live cursor indicators |
| **CRDT Engine** | Yjs | Conflict resolution algorithm |
| **Network Layer** | `@hocuspocus/provider` | WebSocket client |
| **Backend Server** | `@hocuspocus/server` | WebSocket server + sync |
| **Persistence** | PostgreSQL | Document storage |

---

## Choosing the Right Strategy

| Requirement | Recommended Approach |
|------------|---------------------|
| Blog / CMS with occasional edits | **Optimistic Locking** |
| Publishing workflow with clear ownership | **Pessimistic Locking** |
| Multiple users editing simultaneously | **Real-Time Collaboration** |
| Budget/time constraints | **Optimistic Locking** (simplest) |
| Premium collaborative experience | **Real-Time Collaboration** (best UX) |

---

## Next Steps

- [ ] Evaluate your use case
- [ ] Choose appropriate strategy
- [ ] Implement conflict handling
- [ ] Add user notifications
- [ ] Test with multiple concurrent users
- [ ] Monitor and iterate based on user feedback
