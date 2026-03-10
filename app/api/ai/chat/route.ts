export const maxDuration = 30

import { openai } from '@/lib/openai'
import { checkDailyLimit, trackUsage } from '@/lib/aiUsage'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    //first checking the daily limit
    await checkDailyLimit(user.email)
  } catch (error: any) {
    if (error.message === 'DAILY_LIMIT_EXCEEDED') {
      return Response.json({ error: 'Daily AI limit reached. Try again tomorrow.' }, { status: 429 })
    }
    return Response.json({ error: 'Failed to get response' }, { status: 500 })
  }

  const { markdown, messages } = await request.json()
  const username = user.email

  const stream = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    max_completion_tokens: 800, //max_tokens: 500 — 100 words answer=> 800 tokens is a safe ceiling.
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant answering questions about a blog post, try to keep it in brief in max 500-600 words. Always try to make the answer more accurate by adding something from general aspect and try to use blog references as examples, if you think you can add something to make the answer more comprehensive and better then feel free to add it.\n\nBlog content:\n${markdown.slice(0, 5000)}`, //only giving first 5000 words if the content is very large
      },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ],
  })
  //now this stream is async iterable and we can use for await loop to consume it
  // An Async Iterable is something that produces values over time asynchronously.
  // Examples:
  // 1. AI tokens
  // 2. File download chunks
  // 3. Video frames
  // 4. Websocket messages
  // Instead of giving all data at once, it yields values gradually.

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) { //The loop pauses until the next value arrives.
          // Each chunk carries a text delta — push it to the response stream immediately
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

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
