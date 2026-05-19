"use client"

import { useState } from 'react'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ── Hook — owns all AI state and streaming logic ───────────────────────────────

export function useSummarize(markdown: string) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  /** Stream a response into the message at `index`, chunk by chunk. */
  async function streamInto(index: number, res: Response) {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break    //done is recieved when all chunks are sent and the stream is closed
      const chunk = decoder.decode(value, { stream: true })
      setMessages(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], content: updated[index].content + chunk }
        return updated
      })
    }
  }

  /** Open panel and fetch the initial summary (once). */
  async function handleOpen() {
    setOpen(true)
    if (messages.length > 0) return  // already have content, reuse it

    if (!markdown.trim()) {
      setError('Nothing to summarize yet — add some content to the blog first.')
      return
    }

    setStreaming(true)
    setError('')
    setMessages([{ role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to generate summary')
        setMessages([])
        return
      }
      await streamInto(0, res)
    } catch {
      setError('Failed to generate summary')
      setMessages([])
    } finally {
      setStreaming(false)
    }
  }

  /** Send a follow-up question and stream the answer. */
  async function sendQuestion(question: string) {
    if (!question.trim() || streaming) return

    if (!markdown.trim()) {
      setError('The blog has no content — there is nothing to discuss yet.')
      return
    }

    const userMsg: Message = { role: 'user', content: question }
    const aiPlaceholder: Message = { role: 'assistant', content: '' }
    // Capture current length before the state update — that's where aiPlaceholder lands
    const aiIndex = messages.length + 1

    setMessages(prev => [...prev, userMsg, aiPlaceholder])
    setStreaming(true)
    setError('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown,
          messages: [...messages, userMsg],
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to get response')
        setMessages(prev => prev.slice(0, -1))  // drop empty placeholder
        return
      }
      await streamInto(aiIndex, res)
    } catch {
      setError('Failed to get response')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
    }
  }

  return {
    open,
    handleOpen,
    handleClose: () => setOpen(false),
    messages,
    streaming,
    error,
    sendQuestion,
  }
}

// ── Trigger button ────────────────────────────────────────────────────────────

interface SummarizeButtonProps {
  onClick: () => void
}

export default function SummarizeButton({ onClick }: SummarizeButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center text-primary cursor-pointer animate-bounce hover-text-red-500"
    >
      <Image src="/aiIcon.png" alt="AI" width={16} height={16} />
      <p className='hover-bg-red-500'>Summarize</p>
    </button>
  )
}

