"use client";

import * as React from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Underline,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Naam van het verborgen formulierveld dat de HTML bevat. */
  name: string;
  defaultValue?: string;
  id?: string;
  invalid?: boolean;
  minHeight?: number;
  onChange?: (html: string) => void;
};

/** Zet oude platte tekst om naar alinea's, zodat bestaande teksten netjes in de editor verschijnen. */
function toInitialHtml(value: string): string {
  if (!value.trim()) return "";
  if (/^\s*</.test(value)) return value;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length && lines.every((l) => /^[-•*]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li><p>${esc(l.replace(/^[-•*]\s+/, ""))}</p></li>`).join("")}</ul>`;
      }
      return `<p>${lines.map(esc).join("<br>")}</p>`;
    })
    .join("");
}

/**
 * Eenvoudige teksteditor (zoals in Word): kopjes, vet, cursief, opsommingen, citaten en links.
 * Werkt in elk gewoon formulier via een verborgen veld.
 */
export function RichTextEditor({ name, defaultValue = "", id, invalid, minHeight = 220, onChange }: Props) {
  const [html, setHtml] = React.useState(() => toInitialHtml(defaultValue));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    content: html,
    editorProps: {
      attributes: {
        class: "prose-club",
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-multiline": "true",
        ...(invalid ? { "aria-invalid": "true" } : {}),
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const next = e.isEmpty ? "" : e.getHTML();
      setHtml(next);
      onChange?.(next);
    },
  });

  return (
    <div
      className={cn(
        "rich-editor overflow-hidden rounded-md border bg-white transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
        invalid ? "border-destructive" : "border-input",
      )}
    >
      <input type="hidden" name={name} value={html} />
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      link: e?.isActive("link") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

  if (!editor || !state) return <div className="h-11 border-b border-border bg-surface" />;

  const run = (fn: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();

  function setLink() {
    if (!editor) return;
    const current = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Plak het webadres (bijv. https://www.voorbeeld.nl of mailto:info@…)", current || "https://");
    if (url === null) return;
    const clean = url.trim();
    if (!clean || clean === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:|mailto:|tel:|\/)/i.test(clean) ? clean : `https://${clean}`;
    if (editor.state.selection.empty && !state?.link) {
      editor.chain().focus().insertContent(`<a href="${href.replace(/"/g, "&quot;")}">${clean.replace(/</g, "&lt;")}</a> `).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  }

  const buttons: Array<{ icon: LucideIcon; label: string; active?: boolean; disabled?: boolean; onClick: () => void } | "sep"> = [
    { icon: Heading2, label: "Kop", active: state.h2, onClick: () => run((c) => c.toggleHeading({ level: 2 })) },
    { icon: Heading3, label: "Subkop", active: state.h3, onClick: () => run((c) => c.toggleHeading({ level: 3 })) },
    "sep",
    { icon: Bold, label: "Vet", active: state.bold, onClick: () => run((c) => c.toggleBold()) },
    { icon: Italic, label: "Cursief", active: state.italic, onClick: () => run((c) => c.toggleItalic()) },
    { icon: Underline, label: "Onderstrepen", active: state.underline, onClick: () => run((c) => c.toggleUnderline()) },
    "sep",
    { icon: List, label: "Opsomming", active: state.bullet, onClick: () => run((c) => c.toggleBulletList()) },
    { icon: ListOrdered, label: "Genummerde lijst", active: state.ordered, onClick: () => run((c) => c.toggleOrderedList()) },
    { icon: Quote, label: "Citaat", active: state.quote, onClick: () => run((c) => c.toggleBlockquote()) },
    { icon: Minus, label: "Scheidingslijn", onClick: () => run((c) => c.setHorizontalRule()) },
    "sep",
    { icon: Link2, label: state.link ? "Link aanpassen" : "Link toevoegen", active: state.link, onClick: setLink },
    ...(state.link ? [{ icon: Unlink, label: "Link verwijderen", onClick: () => run((c) => c.extendMarkRange("link").unsetLink()) }] : []),
    "sep",
    { icon: Undo2, label: "Ongedaan maken", disabled: !state.canUndo, onClick: () => run((c) => c.undo()) },
    { icon: Redo2, label: "Opnieuw", disabled: !state.canRedo, onClick: () => run((c) => c.redo()) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-1.5 py-1.5" role="toolbar" aria-label="Opmaak">
      {buttons.map((b, i) =>
        b === "sep" ? (
          <span key={`sep-${i}`} className="mx-1 h-5 w-px bg-border" aria-hidden />
        ) : (
          <button
            key={b.label}
            type="button"
            title={b.label}
            aria-label={b.label}
            aria-pressed={b.active}
            disabled={b.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.onClick}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-white hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
              b.active && "bg-white text-primary shadow-sm",
            )}
          >
            <b.icon className="size-4" />
          </button>
        ),
      )}
    </div>
  );
}
