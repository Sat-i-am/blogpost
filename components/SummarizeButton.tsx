"use client"

import { useState } from 'react'
import Image from 'next/image'
import { X, Loader2 } from 'lucide-react'

// ── Hook — owns all fetch + streaming state ───────────────────────────────────

export function useSummarize(markdown: string) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleOpen() {
    setOpen(true)
    if (summary) return  // already fetched, reuse it

    setLoading(true)
    setError('')
    setSummary('')

    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to generate summary')
        setLoading(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let isFirst = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (isFirst) { setLoading(false); isFirst = false }
        setSummary((prev) => prev + chunk)
      }
    } catch {
      setError('Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  return {
    open,
    handleOpen,
    handleClose: () => setOpen(false),
    summary,
    loading,
    error,
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

// ── Panel — rendered in the editor flex layout, not as a fixed overlay ────────

interface SummarizePanelProps {
  onClose: () => void
  summary: string
  loading: boolean
  error: string
}

export function SummarizePanel({ onClose, summary, loading, error }: SummarizePanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Image src="/aiIcon.png" alt="AI" width={18} height={18} />
          <h2 className="font-semibold text-base">AI Summary</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 overflow-y-auto flex-1">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Summarizing...
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {summary && (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
            {summary}
          </p>
        )}
      </div>
    </div>
  )
}
