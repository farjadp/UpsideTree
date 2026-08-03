"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, 
  List, ListOrdered, Image as ImageIcon, 
  AlignLeft, AlignCenter, AlignRight, Table as TableIcon,
  Loader2,
  Trash2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
}

export function RichTextEditor({ value, onChange, placeholder, className = '', dir = 'ltr' }: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-sm text-slate-300 leading-relaxed custom-tiptap',
        dir: dir,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products');

    try {
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.media.url;
        editor.chain().focus().setImage({ src: url }).run();
      } else {
        console.error('Failed to upload image');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!editor) return null;

  const ToolbarButton = ({ onClick, active, disabled, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
        active ? 'bg-lapis-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className={`border border-white/10 rounded-xl overflow-hidden bg-slate-950 flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10 bg-slate-900/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/10 mx-1" />
        
        {/* Table Controls */}
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={editor.isActive('table')}
        >
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>
        {editor.isActive('table') && (
          <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </ToolbarButton>
        )}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Image Upload */}
        <input 
          type="file" 
          accept="image/*"
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleImageUpload} 
        />
        <ToolbarButton 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-gold-500" /> : <ImageIcon className="w-4 h-4" />}
        </ToolbarButton>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
