import { useState } from "react";
import { Menu, ArrowLeft } from "lucide-react";
import AppSidebar from "./AppSidebar";
import NotesList from "./NotesList";
import NoteEditor from "./NoteEditor";
import { useNotes } from "@/contexts/NotesContext";

type MobileView = "sidebar" | "list" | "editor";

const MobileLayout = () => {
  const [view, setView] = useState<MobileView>("list");
  const { selectedNoteId, setSelectedNoteId, setSelectedCategoryId } = useNotes();

  // Auto-switch to editor when note selected
  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setView("editor");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
        {view === "list" && (
          <button onClick={() => setView("sidebar")} className="p-1.5 rounded-md hover:bg-muted">
            <Menu size={20} className="text-foreground" />
          </button>
        )}
        {(view === "sidebar" || view === "editor") && (
          <button
            onClick={() => setView(view === "editor" ? "list" : "list")}
            className="p-1.5 rounded-md hover:bg-muted"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
        )}
        <h1 className="font-display font-bold text-foreground">
          {view === "sidebar" ? "Categorías" : view === "list" ? "Notas" : "Editor"}
        </h1>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "sidebar" && (
          <div onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button") || target.closest("nav")) {
              setTimeout(() => setView("list"), 100);
            }
          }}>
            <AppSidebar />
          </div>
        )}
        {view === "list" && <NotesList />}
        {view === "editor" && <NoteEditor />}
      </div>
    </div>
  );
};

export default MobileLayout;
