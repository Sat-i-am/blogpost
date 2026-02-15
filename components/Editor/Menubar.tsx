/**
 * Formatting toolbar for the TipTap editor.
 *
 * 13 formatting options organized into logical groups:
 * - Headings (H1, H2, H3)
 * - Text style (Bold, Italic, Strikethrough)
 * - Alignment (Left, Center, Right, Justify)
 * - Lists (Bullet, Ordered)
 * - Highlight
 */

import { Editor } from "@tiptap/react";
import { Heading1, Heading2, Heading3, Bold, Italic, Strikethrough, List, AlignCenter, AlignLeft, AlignRight, Highlighter, ListOrdered, AlignJustify } from "lucide-react"
import { Toggle } from "../ui/toggle";

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null
    }

    const Options = [
        {
            icon: <Heading1 className="size-4" />,
            onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            pressed: editor.isActive('heading', { level: 1 })
        },
        {
            icon: <Heading2 className="size-4" />,
            onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            pressed: editor.isActive('heading', { level: 2 })
        },
        {
            icon: <Heading3 className="size-4" />,
            onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            pressed: editor.isActive('heading', { level: 3 })
        },
        'separator',
        {
            icon: <Bold className="size-4" />,
            onClick: () => editor.chain().focus().toggleBold().run(),
            pressed: editor.isActive('bold')
        },
        {
            icon: <Italic className="size-4" />,
            onClick: () => editor.chain().focus().toggleItalic().run(),
            pressed: editor.isActive('italic')
        },
        {
            icon: <Strikethrough className="size-4" />,
            onClick: () => editor.chain().focus().toggleStrike().run(),
            pressed: editor.isActive('strike')
        },
        'separator',
        {
            icon: <AlignLeft className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign('left').run(),
            pressed: editor.isActive({ textAlign: 'left' })
        },
        {
            icon: <AlignCenter className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign('center').run(),
            pressed: editor.isActive({ textAlign: 'center' })
        },
        {
            icon: <AlignRight className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign('right').run(),
            pressed: editor.isActive({ textAlign: 'right' })
        },
        {
            icon: <AlignJustify className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign('justify').run(),
            pressed: editor.isActive({ textAlign: 'justify' })
        },
        'separator',
        {
            icon: <List className="size-4" />,
            onClick: ()=> editor.chain().focus().toggleBulletList().run(),
            pressed: editor.isActive('bulletList')
        },
        {
            icon: <ListOrdered className="size-4" />,
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
            pressed: editor.isActive('orderedList')
        },
        'separator',
        {
            icon: <Highlighter className="size-4" />,
            onClick: () => editor.chain().focus().toggleHighlight().run(),
            pressed: editor.isActive('highlight')
        },
    ]

    return (
        <div className="flex items-center gap-0.5 flex-wrap">
            {Options.map((option, index) => {
                if (option === 'separator') {
                    return <div key={index} className="w-px h-6 bg-border mx-1.5" />
                }
                const opt = option as { icon: React.ReactNode; onClick: () => void; pressed: boolean }
                return (
                    <Toggle
                        key={index}
                        onClick={opt.onClick}
                        pressed={opt.pressed}
                        size="sm"
                        className="rounded-md"
                    >
                        {opt.icon}
                    </Toggle>
                )
            })}
        </div>
    )
}
export default MenuBar;
