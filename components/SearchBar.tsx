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
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts..."
        className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-transparent outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
