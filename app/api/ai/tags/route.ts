import { openai } from '@/lib/openai'
import { checkDailyLimit, trackUsage } from '@/lib/aiUsage'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Auth — we need the username to track usage
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reject if user has hit today's token limit
    await checkDailyLimit(user.email)

    const { content } = await request.json()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 100, //max_tokens: 100 — ["react","hooks","performance","nextjs","typescript"] is ~20 tokens. 100 is a safe ceiling.
      messages: [
        {
          role: 'user',
          content: `Extract 3–5 relevant tags from this blog post. Return them as a JSON array of lowercase strings, no hashtags. Example: ["react", "hooks", "performance"]. Return ONLY the JSON array, nothing else.\n\nPost content:\n${content.slice(0, 3000)}`,
        },
      ],
    })

    // Track actual tokens consumed by this request
    await trackUsage(user.email, response.usage?.total_tokens ?? 0)

    const text = response.choices[0].message.content ?? '[]'
    const tags = JSON.parse(text)
    console.log("response from ai",response)
    return NextResponse.json({ tags })
  } catch (error: any) {
    console.log("error from ai",error)
    if (error.message === 'DAILY_LIMIT_EXCEEDED') {
      return NextResponse.json({ error: 'Daily AI limit reached. Try again tomorrow.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Failed to generate tags' }, { status: 500 })
  }
}
