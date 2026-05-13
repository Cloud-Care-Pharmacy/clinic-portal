"use client";

import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateType } from "@/types";

export interface TemplateBodyEditorHandle {
  /** Insert `{{path}}` at the current cursor. */
  insertVariable: (path: string) => void;
  /** Focus the editor surface. */
  focus: () => void;
}

interface TemplateBodyEditorProps {
  type: TemplateType;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Min-height in px for the textarea variant. */
  minHeight?: number;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7", active && "bg-muted")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export const TemplateBodyEditor = forwardRef<
  TemplateBodyEditorHandle,
  TemplateBodyEditorProps
>(function TemplateBodyEditor(
  { type, value, onChange, placeholder, minHeight = 160 },
  ref
) {
  if (type === "email") {
    return (
      <EmailEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        editorRef={ref}
      />
    );
  }
  return (
    <PlainEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      editorRef={ref}
      minHeight={minHeight}
    />
  );
});

// --------------------------------------------------------------------------
// Email — TipTap

function EmailEditor({
  value,
  onChange,
  placeholder,
  editorRef,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  editorRef: React.Ref<TemplateBodyEditorHandle>;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        code: false,
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? "Write your email…",
      }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] px-3 py-2 focus:outline-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1",
      },
    },
  });

  // Keep content in sync when value changes externally (e.g. switching templates).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useImperativeHandle(
    editorRef,
    () => ({
      insertVariable(path: string) {
        editor?.chain().focus().insertContent(`{{${path}}}`).run();
      },
      focus() {
        editor?.commands.focus();
      },
    }),
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading"
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

// --------------------------------------------------------------------------
// SMS / Notification — plain textarea

function PlainEditor({
  value,
  onChange,
  placeholder,
  editorRef,
  minHeight,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  editorRef: React.Ref<TemplateBodyEditorHandle>;
  minHeight: number;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(
    editorRef,
    () => ({
      insertVariable(path: string) {
        const el = taRef.current;
        const token = `{{${path}}}`;
        if (!el) {
          onChange((value ?? "") + token);
          return;
        }
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const next = value.slice(0, start) + token + value.slice(end);
        onChange(next);
        // Restore cursor after React renders.
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + token.length;
          el.setSelectionRange(pos, pos);
        });
      },
      focus() {
        taRef.current?.focus();
      },
    }),
    [onChange, value]
  );

  return (
    <textarea
      ref={taRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ minHeight }}
      className={cn(
        "flex field-sizing-content w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono transition-colors outline-none placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      )}
    />
  );
}
