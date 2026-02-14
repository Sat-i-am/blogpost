import { Editor } from "@tiptap/react";
import { Heading1, Heading2, Heading3, Bold, Italic, Strikethrough, List, AlignCenter, AlignLeft, AlignRight, Highlighter, ListOrdered, AlignJustify } from "lucide-react"
import { Toggle } from "../ui/toggle";

const MenuBar = ({ editor }: { editor: Editor }) => {
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
        {
            icon: <AlignCenter className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign('center').run(),
            pressed: editor.isActive({ textAlign: 'center' })
        },
        {
            icon: <AlignLeft className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign('left').run(),
            pressed: editor.isActive({ textAlign: 'left' })

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
        {
            icon: <Highlighter className="size-4" />,
            onClick: () => editor.chain().focus().toggleHighlight().run(),
            pressed: editor.isActive('highlight')

        },
    ]

    return (
        <div className="control-group">
            <div className="border rounded-md p-1 mb-1 bg-slate-50 space-x-2 z-50">
                {
                    Options.map((option, index) => {
                        return <Toggle key={index} onClick={option.onClick} pressed={option.pressed}>{option.icon}</Toggle>
                    })
                }
            </div>
        </div>
    )
}
export default MenuBar;