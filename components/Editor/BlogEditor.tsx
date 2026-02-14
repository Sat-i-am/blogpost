"use client"

// import { TextStyleKit } from '@tiptap/extension-text-style'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
//starterkit gives us collection of all the popular extensions 

export default function BlogEditor(){
    const editor = useEditor({
        extensions: [StarterKit],
        content: `
            <p>This isn’t bold.</p>
            <p><strong>This is bold.</strong></p>
            <p><b>And this.</b></p>
            <p style="font-weight: bold">This as well.</p>
            <p style="font-weight: bolder">Oh, and this!</p>
            <p style="font-weight: 500">Cool, isn’t it!?</p>
            <p style="font-weight: 999">Up to font weight 999!!!</p>
          `,
        shouldRerenderOnTransaction: true,
        immediatelyRender: true,
      })

    return (
        <div>
            <h1>Blog Editor</h1>
            <EditorContent editor={editor} />
        </div>
    )
}
