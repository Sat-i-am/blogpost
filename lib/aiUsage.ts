/**
 * AI token usage tracking — per user, per day.
 *
 * WHY THIS EXISTS:
 * Every OpenAI API call costs tokens (input + output).
 * Without limits, a single user could burn through your entire
 * API budget in one session. This module enforces a daily cap.
 *
 * HOW IT WORKS:
 * - The AiUsage table has one row per (username, date) pair.
 * - Every AI route calls checkDailyLimit() before calling OpenAI.
 * - After OpenAI responds, the route calls trackUsage() with the
 *   actual token count from response.usage.total_tokens.
 * - The date key means limits reset automatically each day —
 *   no cron job or cleanup needed.
 *
 * USAGE IN ANY AI ROUTE:
 *   await checkDailyLimit(user.email)       // before OpenAI call
 *   const response = await openai.chat...
 *   await trackUsage(user.email, response.usage?.total_tokens ?? 0)  // after
 */

import { prisma } from '@/lib/prisma'

// Max tokens a single user can consume across ALL AI features per day.
// ~50k tokens ≈ 6 full blog improvements or ~60 tag generations with gpt-4o-mini.
const DAILY_TOKEN_LIMIT = 50_000

// Returns today's date as "YYYY-MM-DD" — used as the daily key in the DB.
// e.g. "2025-02-20". Slicing ISO string is simpler and timezone-safe enough here.
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Checks whether the user has already consumed their daily token budget.
 * Throws 'DAILY_LIMIT_EXCEEDED' if they have — the calling route catches
 * this and returns a 429 response.
 *
 * If no row exists yet for today, the user hasn't used anything → allow.
 */
export async function checkDailyLimit(username: string): Promise<void> {
  // Look up this user's row for today. Returns null if they haven't made any
  // AI requests today yet (which means they're under the limit).
  const row = await prisma.aiUsage.findUnique({
    where: { username_date: { username, date: today() } },
  })

  if (row && row.tokensUsed >= DAILY_TOKEN_LIMIT) {
    throw new Error('DAILY_LIMIT_EXCEEDED')
  }
}

/**
 * Adds the token cost of one OpenAI request to the user's daily running total.
 *
 * Uses upsert:
 * - If no row for today → create a new one with this request's token count
 * - If row exists → increment tokensUsed by this request's token count
 *
 * The `increment` operation is atomic in PostgreSQL, so concurrent requests
 * won't overwrite each other's counts.
 */
export async function trackUsage(username: string, tokens: number): Promise<void> {
  await prisma.aiUsage.upsert({
    where: { username_date: { username, date: today() } },
    create: { username, date: today(), tokensUsed: tokens },  // first request today
    update: { tokensUsed: { increment: tokens } },            // add to existing total
  })
}
