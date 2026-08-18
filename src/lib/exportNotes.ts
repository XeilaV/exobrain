import { supabase } from "@/integrations/supabase/client";

export type ExportFormat = "json" | "markdown";

interface ChecklistItemLike {
  id?: string;
  text?: string;
  completed?: boolean;
  style?: string;
  notes?: string;
  dueAt?: string | null;
  hasTime?: boolean;
  remindAt?: string | null;
  parentId?: string | null;
}

const slug = (s: string) =>
  (s || "exobrain")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "exobrain";

const stripHtml = (html: string) =>
  (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderChecklist(items: ChecklistItemLike[], parentId: string | null = null, depth = 0): string[] {
  const lines: string[] = [];
  items
    .filter((i) => (i.parentId ?? null) === parentId)
    .forEach((item) => {
      const indent = "  ".repeat(depth);
      const marker = item.style === "bullet" ? "-" : item.completed ? "- [x]" : "- [ ]";
      let line = `${indent}${marker} ${item.text ?? ""}`.trimEnd();
      if (item.dueAt) line += ` _(${new Date(item.dueAt).toLocaleString()})_`;
      lines.push(line);
      if (item.notes) lines.push(`${indent}  > ${item.notes.replace(/\n/g, `\n${indent}  > `)}`);
      lines.push(...renderChecklist(items, item.id ?? null, depth + 1));
    });
  return lines;
}

export async function exportNotes(format: ExportFormat, brainName: string) {
  const [catsRes, notesRes] = await Promise.all([
    supabase.from("categories").select("*").order("created_at"),
    supabase.from("notes").select("*").order("created_at"),
  ]);

  if (catsRes.error) throw catsRes.error;
  if (notesRes.error) throw notesRes.error;

  const categories = catsRes.data ?? [];
  const notes = notesRes.data ?? [];
  const date = new Date().toISOString().slice(0, 10);
  const base = `exobrain-${slug(brainName)}-${date}`;
  const noteById = new Map(notes.map((n) => [n.id, n]));

  if (format === "json") {
    const payload = {
      brainName,
      exportedAt: new Date().toISOString(),
      version: 1,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        createdAt: c.created_at,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        icon: n.icon,
        noteType: n.note_type,
        categoryId: n.category_id,
        parentNoteId: n.parent_note_id,
        linkedNoteIds: n.linked_note_ids,
        content: n.content,
        checklist: n.checklist,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      })),
    };
    download(`${base}.json`, JSON.stringify(payload, null, 2), "application/json");
    return { categories: categories.length, notes: notes.length };
  }

  const lines: string[] = [`# ${brainName || "ExoBrain"}`, "", `_Exportado el ${new Date().toLocaleString()}_`, ""];

  const renderNote = (note: (typeof notes)[number], depth: number) => {
    const heading = "#".repeat(Math.min(6, depth + 3));
    lines.push(`${heading} ${note.icon ? `${note.icon} ` : ""}${note.title}`);
    lines.push("");
    if (note.note_type === "checklist") {
      const items = (Array.isArray(note.checklist) ? note.checklist : []) as ChecklistItemLike[];
      if (items.length) lines.push(...renderChecklist(items));
      else lines.push("_(lista vacía)_");
    } else {
      const text = stripHtml(String(note.content ?? ""));
      lines.push(text || "_(sin contenido)_");
    }
    const links = (note.linked_note_ids ?? [])
      .map((id: string) => noteById.get(id)?.title)
      .filter(Boolean);
    if (links.length) {
      lines.push("");
      lines.push(`Enlaces: ${links.join(", ")}`);
    }
    lines.push("");
    notes.filter((c) => c.parent_note_id === note.id).forEach((child) => renderNote(child, depth + 1));
  };

  categories.forEach((cat) => {
    lines.push(`## ${cat.icon ? `${cat.icon} ` : ""}${cat.name}`);
    lines.push("");
    const roots = notes.filter((n) => n.category_id === cat.id && !n.parent_note_id);
    if (!roots.length) lines.push("_(sin notas)_\n");
    roots.forEach((n) => renderNote(n, 0));
  });

  download(`${base}.md`, lines.join("\n"), "text/markdown");
  return { categories: categories.length, notes: notes.length };
}
