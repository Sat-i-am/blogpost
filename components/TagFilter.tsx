/**
 * Tag filter chips for the blog feed.
 *
 * Displays all unique tags as clickable badges.
 * Selected tags get a filled style, unselected tags get an outline style.
 * Clicking a tag toggles it on/off — the parent handles filtering logic.
 *
 * Used on the home/feed page alongside SearchBar.
 */

interface TagFilterProps {
  tags: string[]              // All unique tags across all posts
  selectedTags: string[]      // Currently active tag filters
  onTagToggle: (tag: string) => void  // Called when a tag is clicked
}

export default function TagFilter({ tags, selectedTags, onTagToggle }: TagFilterProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap">
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag)
        return (
          <button
            key={tag}
            onClick={() => onTagToggle(tag)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground'        // filled = active
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'  // outline = inactive
            }`}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
