/**
 * Search input for filtering blog posts.
 *
 * Uses the useDebounce hook to avoid firing on every keystroke —
 * waits 300ms after the user stops typing before calling onSearch.
 *
 * Used on the home/feed page to filter posts by title, excerpt, or tags.
 */

"use client"

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchBarProps {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  // Notify parent whenever the debounced query changes
  useEffect(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  return (
    <div className="relative group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts..."
        className="w-full pl-11 pr-4 py-3 text-sm border rounded-xl bg-card outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm shadow-primary/5 transition-all placeholder:text-muted-foreground/60"
      />
    </div>
  )
}
