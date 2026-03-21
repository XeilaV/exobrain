import { useState, useEffect, useRef } from "react";
import { Menu, ArrowLeft, Map } from "lucide-react";
import AppSidebar from "./AppSidebar";
import NotesList from "./NotesList";
import NoteEditor from "./NoteEditor";
import GraphView from "./GraphView";
import { useNotes } from "@/contexts/NotesContext";

type MobileView = "sidebar" | "list" | "editor" | "graph";

const MobileLayout = () => {
  const [view, setView] = useState<MobileView>("list");
  const { selectedNoteId, setSelectedCategoryId, activeView, setActiveView } = useNotes();
  const prevNoteId = useRef(selectedNoteId);

  // Auto-switch to editor when a note is selected (from list, chat, or graph)
  useEffect(() => {
    if (selectedNoteId && selectedNoteId !== prevNoteId.current) {
      setView("editor");
    }
    prevNoteId.current = selectedNoteId;
  }, [selectedNoteId]);

  // Sync graph view toggle
  useEffect(() => {
    if (activeView === "graph" && view !== "graph") {
      setView("graph");
    }
  }, [activeView]);

  const handleBack = () => {
    if (view === "editor" || view === "graph") {
      setView("list");
      if (activeView === "graph") setActiveView("notes");
    } else if (view === "sidebar") {
      setView("list");
    }
  };

  const titles: Record<MobileView, string> = {
    sidebar: "Categorías",
    list: "Notas",
    editor: "Editor",
    graph: "Mapa",
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
        {view === "list" ? (
          <>
            <button onClick={() => setView("sidebar")} className="p-1.5 rounded-md hover:bg-muted">
              <Menu size={20} className="text-foreground" />
            </button>
            <h1 className="font-display font-bold text-foreground flex-1">{titles[view]}</h1>
            <button
              onClick={() => { setActiveView("graph"); setView("graph"); }}
              className="p-1.5 rounded-md hover:bg-muted"
            >
              <Map size={18} className="text-muted-foreground" />
            </button>
          </>
        ) : (
          <>
            <button onClick={handleBack} className="p-1.5 rounded-md hover:bg-muted">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="font-display font-bold text-foreground">{titles[view]}</h1>
          </>
        )}
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
        {view === "graph" && <GraphView />}
      </div>
    </div>
  );
};

export default MobileLayout;
