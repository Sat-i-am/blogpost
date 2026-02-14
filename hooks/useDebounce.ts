/**
 * Generic debounce hook.
 *
 * Returns a "delayed" version of the input value that only updates
 * after the specified delay (in ms) has passed with no new changes.
 *
 * Used by:
 * - useAutosave: debounce editor content before saving (2s delay)
 * - SearchBar: debounce search input before filtering posts (300ms delay)
 */

import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const timer = setTimeout(() => setDebouncedValue(value), delay)

    // If value changes before the delay expires, cancel the previous timer
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
