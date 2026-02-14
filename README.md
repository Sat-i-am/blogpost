included extension in starter kit: 
Included extensions
Nodes
Blockquote
BulletList
CodeBlock
Document
HardBreak
Heading
HorizontalRule
ListItem
OrderedList
Paragraph
Text
Marks
Bold
Code
Italic
Link (New in v3)
Strike
Underline (New in v3)
Extensions
Dropcursor
Gapcursor
Undo/Redo
ListKeymap (New in v3)
TrailingNode (New in v3)





how markdowns are handled: 
  ┌──────────────────┬───────────────────┬──────────────────────────────────────────────────┐
  │     Library      │     Direction     │                     Purpose                      │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ turndown         │ HTML -> Markdown  │ Convert TipTap HTML to markdown on save          │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ @types/turndown  │ (dev)             │ TypeScript types for turndown                    │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ react-markdown   │ Markdown -> React │ Render markdown as React components on post view │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ remark-gfm       │ Plugin            │ Tables, strikethrough, task lists                │
  ├──────────────────┼───────────────────┼──────────────────────────────────────────────────┤
  │ rehype-highlight │ Plugin            │ Syntax-highlighted code blocks                   │
  └──────────────────┴───────────────────┴──────────────────────────────────────────────────┘