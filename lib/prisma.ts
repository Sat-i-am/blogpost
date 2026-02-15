/**
 * Singleton Prisma client for the entire app.
 *
 * PURPOSE:
 * This file creates and exports a single PrismaClient instance (`prisma`)
 * that every other file in the app imports to talk to the database.
 *
 * PRISMA 7 CHANGE — Driver Adapters:
 * In Prisma 6, the database URL was in schema.prisma: url = env("DATABASE_URL")
 * In Prisma 7, the URL is removed from the schema. Instead, you:
 *   1. Install a "driver adapter" (@prisma/adapter-pg for PostgreSQL)
 *   2. Create the adapter with your connection string
 *   3. Pass the adapter to PrismaClient constructor
 *
 * This is Prisma 7's new "Rust-free" architecture — it uses the Node.js `pg`
 * driver directly instead of the old Rust query engine.
 *
 * WHY THE globalThis TRICK:
 * In development, Next.js hot-reloads modules on every file save.
 * Each reload would create a NEW PrismaClient + database connection.
 * Storing on globalThis prevents this — the same client survives hot-reloads.
 *
 * USAGE IN OTHER FILES:
 *   import { prisma } from '@/lib/prisma'
 *   const posts = await prisma.post.findMany()
 */

// Step 1: Import PrismaClient and the PostgreSQL adapter
import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Step 2: Tell TypeScript that globalThis might have a `prisma` property
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Step 3: Create the adapter with our Supabase connection string
// The adapter connects PrismaClient to PostgreSQL using the Node.js `pg` driver
const adapter = new PrismaPg({ connectionString: process.env.NEXT_PUBLIC_SUPABASE_URL })

// Step 4: Either reuse the existing client from globalThis, or create a new one
// Pass the adapter so PrismaClient knows how to talk to our Supabase database
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

// Step 5: In development, save the client to globalThis so it survives hot-reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
