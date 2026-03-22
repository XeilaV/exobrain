import { useState, useEffect, useRef } from "react";
import { Menu, ArrowLeft, Network } from "lucide-react";
import AppSidebar from "./AppSidebar";
import NotesList from "./NotesList";
import NoteEditor from "./NoteEditor";
import GraphView from "./GraphView";
import { useNotes } from "@/contexts/NotesContext";

type MobileView = "sidebar" | "list" | "editor" | "graph";

const MobileLayout = () => {
  const [view, setView] = useState<MobileView>("list");
  const { selectedNoteId, setSelectedNoteId, setSelectedCategoryId, activeView, setActiveView } = useNotes();
  const prevNoteId = useRef(selectedNoteId);

  useEffect(() => {
    if (selectedNoteId && selectedNoteId !== prevNoteId.current) {
      setView("editor");
    }
    prevNoteId.current = selectedNoteId;
  }, [selectedNoteId]);

  useEffect(() => {
    if (activeView === "graph" && view !== "graph") {
      setView("graph");
    }
  }, [activeView]);

  const handleBack = () => {
    if (view === "editor" || view === "graph") {
      setSelectedNoteId(null);
      setView("list");
      if (activeView === "graph") setActiveView("notes");
    } else if (view === "sidebar") {
      setView("list");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile header - always visible */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card shrink-0">
        {view === "list" ? (
          <button onClick={() => setView("sidebar")} className="p-1.5 rounded-md hover:bg-muted">
            <Menu size={20} className="text-foreground" />
          </button>
        ) : (
          <button onClick={handleBack} className="p-1.5 rounded-md hover:bg-muted">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
        )}

        <h1 className="font-display font-bold text-foreground flex-1">
          {view === "sidebar" ? "Categorías" : view === "graph" ? "Mapa" : view === "editor" ? "Editor" : "Notas"}
        </h1>

        {/* Map icon always visible top-right */}
        <button
          onClick={() => {
            if (view === "graph") {
              setActiveView("notes");
              setView("list");
            } else {
              setActiveView("graph");
              setView("graph");
            }
          }}
          className={`p-1.5 rounded-md hover:bg-muted ${view === "graph" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
        >
          <Network size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "sidebar" && (
          <div className="flex-1 overflow-hidden" onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button[data-category-select]") || target.closest("[data-all-notes]")) {
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
