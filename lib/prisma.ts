/**
 * Singleton Prisma client for the entire app.
 *
 * PURPOSE:
 * This file creates and exports a single PrismaClient instance (`prisma`)
 * that every other file in the app imports to talk to the database.
 *
 * Instead of each file creating its own connection like:
 *   const prisma = new PrismaClient()  // BAD — creates a new connection every time
 *
 * Every file does:
 *   import { prisma } from '@/lib/prisma'  // GOOD — reuses one shared connection
 *
 * WHY THE globalThis TRICK:
 * - In development, Next.js hot-reloads modules on every file save
 * - Each reload re-runs this file, which would create a NEW PrismaClient
 * - After enough reloads, you run out of database connections and crash
 * - `globalThis` is a special object that survives hot-reloads
 * - So we store our PrismaClient there: if it already exists, reuse it
 *
 * USAGE IN OTHER FILES:
 *   import { prisma } from '@/lib/prisma'
 *   const posts = await prisma.post.findMany()
 */

// Step 1: Import PrismaClient from the generated client
import { PrismaClient } from "@/lib/generated/prisma/client";

// Step 2: Tell TypeScript that globalThis might have a `prisma` property
// Without this, TypeScript would error on `globalThis.prisma`
// Hint: cast globalThis to a type that has { prisma: PrismaClient }
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Step 3: Either reuse the existing client from globalThis, or create a new one
// Hint: use the || (or) operator — if left side exists use it, otherwise create new
export const prisma = globalForPrisma.prisma || new PrismaClient()

// Step 4: In development, save the client to globalThis so it survives hot-reloads
// Hint: check process.env.NODE_ENV !== 'production'
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
