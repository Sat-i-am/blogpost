"use client"

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, Send } from 'lucide-react'

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
      if (done) break
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

// ── Panel — rendered in the editor flex layout ────────────────────────────────

interface SummarizePanelProps {
  onClose: () => void
  messages: Message[]
  streaming: boolean
  error: string
  onSend: (question: string) => void
}

export function SummarizePanel({ onClose, messages, streaming, error, onSend }: SummarizePanelProps) {
  const [input, setInput] = useState('')
  // Ref on the scrollable container itself — lets us scroll only that element,
  // not the whole page (scrollIntoView would scroll every ancestor).
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  function handleSend() {
    const q = input.trim()
    if (!q || streaming) return
    onSend(q)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-primary/5 via-background to-background">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-gradient-to-r from-primary/15 to-indigo-500/10 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Image src="/aiIcon.png" alt="AI" width={16} height={16} />
          <h2 className="font-semibold text-sm bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            AI Assistant
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-primary/10 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages — compact scroll area */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-tr-sm shadow-sm shadow-primary/20'
                  : 'bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/15 text-foreground rounded-tl-sm'
              }`}
            >
              {msg.content ? (
                <span className="whitespace-pre-line">{msg.content}</span>
              ) : (
                <Image src="/aiIcon.png" alt="AI" width={14} height={14} className="animate-bounce" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-xs text-destructive text-center pt-1">{error}</p>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 shrink-0 border-t border-primary/15 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask about this post..."
            disabled={streaming}
            className="flex-1 text-xs bg-background border border-border/60 rounded-xl px-3 py-2 outline-none focus:border-primary/50 placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="shrink-0 p-2 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed shadow-sm shadow-primary/20"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>

    </div>
  )
}
