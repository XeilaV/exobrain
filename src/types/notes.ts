export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
