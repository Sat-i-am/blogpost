"use client"

import { useState } from 'react'
import Image from 'next/image'
import { X, Loader2 } from 'lucide-react'

interface SummarizeButtonProps {
  markdown: string
}

export default function SummarizeButton({ markdown }: SummarizeButtonProps) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleOpen() {
    setOpen(true)
    if (summary) return  // already fetched, reuse it

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate summary')
      } else {
        setSummary(data.summary)
      }
    } catch {
      setError('Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 text-primary hover:underline"
      >
        <Image src="/aiIcon.png" alt="AI" width={14} height={14} />
        Summarize
      </button>

      {/* Backdrop — clicking it closes the panel */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel from the right */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] z-50 bg-background border-l border-border shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/aiIcon.png" alt="AI" width={18} height={18} />
            <h2 className="font-semibold text-base">AI Summary</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Panel body */}
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
          {summary && !loading && (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
              {summary}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
