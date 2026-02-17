

import { Hocuspocus } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { Pool } from 'pg'
import 'dotenv/config'

// Connect to the same Supabase PostgreSQL database your Next.js app uses
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // Required for Supabase
})

const server = new Hocuspocus({
  port: parseInt(process.env.PORT || '1234'),

  extensions: [
    new Database({

      // Called when the FIRST client connects to a room (room name = post ID)
      // Loads the saved Yjs binary state from PostgreSQL
      async fetch({ documentName }) {
        const postId = documentName
        console.log(`[fetch] Loading Yjs state for post: ${postId}`)

        const result = await pool.query(
          'SELECT "yjsState" FROM "Post" WHERE id = $1',
          [postId]
        )

        if (result.rows[0]?.yjsState) {
          console.log(`[fetch] Found saved Yjs state for post: ${postId}`)
          return new Uint8Array(result.rows[0].yjsState)
        }

        console.log(`[fetch] No Yjs state found for post: ${postId} (first collab session)`)
        return null
      },

      // Called periodically + when the LAST client disconnects from a room
      // Saves the Yjs binary state to PostgreSQL
      async store({ documentName, state }) {
        const postId = documentName
        console.log(`[store] Saving Yjs state for post: ${postId} (${state.byteLength} bytes)`)

        await pool.query(
          'UPDATE "Post" SET "yjsState" = $1, "updatedAt" = NOW() WHERE id = $2',
          [Buffer.from(state), postId]
        )

        console.log(`[store] Saved successfully for post: ${postId}`)
      },

    }),
  ],
})

server.listen()
console.log(`Collab server running on port ${process.env.PORT || 1234}`)









// These are callback functions — you define them, but Hocuspocus calls them at specific moments. You never call fetch() or store() yourself.

// When fetch() is called

// Trigger: The first client connects to a room that isn't in server memory.

// Tab A opens /editor/abc-123
//     ↓
// HocuspocusProvider connects → joins room "abc-123"
//     ↓
// Hocuspocus checks: is "abc-123" in memory? NO
//     ↓
// Hocuspocus calls YOUR fetch({ documentName: "abc-123" })
//     ↓
// Your code queries PostgreSQL → returns yjsState (or null)
//     ↓
// Hocuspocus loads it into the Yjs doc → syncs to Tab A

// When it does NOT fire:
// Tab B opens the SAME post /editor/abc-123 (while Tab A is still open)
//     ↓
// Hocuspocus checks: is "abc-123" in memory? YES (Tab A already loaded it)
//     ↓
// fetch() does NOT fire — just syncs the in-memory doc to Tab B

// In short: fetch() fires once per room lifecycle — when the room is created in memory.

// ---
// When store() is called

// Two triggers:

// Trigger 1: Last client disconnects

// Tab A is open, Tab B is open (both on /editor/abc-123)
//     ↓
// Tab A closes → 1 client left → store() does NOT fire
//     ↓
// Tab B closes → 0 clients left → store() FIRES
//     ↓
// Your code saves yjsState to PostgreSQL
//     ↓
// Hocuspocus removes room from memory (safe, it's in DB now)

// Trigger 2: Periodically (while clients are connected)

// Tab A is open, actively editing
//     ↓
// Every few seconds (configurable), Hocuspocus calls store()
//     ↓
// Your code saves yjsState to PostgreSQL
//     ↓
// This is a safety net — if the server crashes, you don't lose everything


