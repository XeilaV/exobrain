export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type NoteType = "text" | "checklist";

export interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  parentNoteId: string | null;
  linkedNoteIds: string[];
  checklist: ChecklistItem[];
  noteType: NoteType;
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  isCollapsed: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
