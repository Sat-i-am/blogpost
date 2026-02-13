blog-platform/
│
├── app/
│   ├── page.tsx                 # Home page (blog feed)
│   ├── post/
│   │    └── [slug]/page.tsx     # View single post
│   ├── editor/
│   │    ├── page.tsx            # Create post
│   │    └── [id]/page.tsx       # Edit post
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── Editor/
│   │    ├── BlogEditor.tsx
│   │    ├── Toolbar.tsx
│   │    └── extensions.ts
│   │
│   ├── PostCard.tsx
│   ├── SearchBar.tsx
│   └── TagFilter.tsx
│
├── lib/
│   ├── markdown.ts              # Markdown conversion logic
│   ├── storage.ts               # Local storage logic
│   ├── slugify.ts               # Slug generator
│   └── types.ts                 # TypeScript types
│
├── hooks/
│   ├── useAutosave.ts
│   └── useDebounce.ts
│
├── styles/
│
├── public/
│
└── package.json
