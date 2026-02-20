import { openai } from '@/lib/openai'
import { checkDailyLimit, trackUsage } from '@/lib/aiUsage'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await checkDailyLimit(user.email)

    const { markdown } = await request.json()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Summarize this blog post in maximum 100 words summary. Focus on the key ideas and takeaways. Return plain text bullet points starting with "•".\n\nPost content:\n${markdown.slice(0, 5000)}`,
        },
      ],
    })
    console.log("this is summary response",response)
    await trackUsage(user.email, response.usage?.total_tokens ?? 0)

    const summary = response.choices[0].message.content ?? ''
    console.log("this is summary",summary)
    return NextResponse.json({ summary })
  } catch (error: any) {
    if (error.message === 'DAILY_LIMIT_EXCEEDED') {
      return NextResponse.json({ error: 'Daily AI limit reached. Try again tomorrow.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
