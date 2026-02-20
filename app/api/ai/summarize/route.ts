export const maxDuration = 30  // seconds — tells Vercel to allow up to 30s for this route

import { openai } from '@/lib/openai'
import { checkDailyLimit, trackUsage } from '@/lib/aiUsage'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // Auth and limit checks must happen BEFORE streaming starts —
  // once we return a ReadableStream we can no longer send JSON error responses.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await checkDailyLimit(user.email)
  } catch (error: any) {
    if (error.message === 'DAILY_LIMIT_EXCEEDED') {
      return Response.json({ error: 'Daily AI limit reached. Try again tomorrow.' }, { status: 429 })
    }
    return Response.json({ error: 'Failed to generate summary' }, { status: 500 })
  }

  const { markdown } = await request.json()
  const username = user.email

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    stream: true,
    // Asks OpenAI to include token usage in the final chunk so we can track it
    stream_options: { include_usage: true },
    messages: [
      {
        role: 'user',
        content: `Summarize this blog post in maximum 100 words summary. Focus on the key ideas and takeaways. Return plain text bullet points starting with "•".\n\nPost content:\n${markdown.slice(0, 5000)}`,
      },
    ],
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Each chunk carries a text delta — push it to the response stream immediately
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
          // The last chunk (after all text) carries usage when stream_options.include_usage is set
          if (chunk.usage) {
            await trackUsage(username, chunk.usage.total_tokens)
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
