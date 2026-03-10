"use client"

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SummarizePanelProps {
  onClose: () => void
  messages: Message[]
  streaming: boolean
  error: string
  onSend: (question: string) => void
}

export default function SummarizePanel({ onClose, messages, streaming, error, onSend }: SummarizePanelProps) {
  const [input, setInput] = useState('')
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

      {/* Messages */}
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
