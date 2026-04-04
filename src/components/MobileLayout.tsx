import { useState, useEffect, useRef } from "react";
import { Menu, ArrowLeft, Network } from "lucide-react";
import AppSidebar from "./AppSidebar";
import NotesList from "./NotesList";
import GraphView from "./GraphView";
import { useNotes } from "@/contexts/NotesContext";

type MobileView = "sidebar" | "list" | "graph";

const MobileLayout = () => {
  const [view, setView] = useState<MobileView>("graph");
  const { selectedCategoryId, setSelectedNoteId, setSelectedCategoryId, activeView, setActiveView } = useNotes();

  useEffect(() => {
    if (activeView === "graph" && view !== "graph") setView("graph");
    if (activeView === "notes" && view === "graph") setView("list");
  }, [activeView]);

  const handleBack = () => {
    if (view === "list") {
      setSelectedNoteId(null);
      setView("graph");
      setActiveView("graph");
    } else if (view === "sidebar") {
      setView(activeView === "graph" ? "graph" : "list");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card shrink-0">
        {view === "graph" ? (
          <button onClick={() => setView("sidebar")} className="p-1.5 rounded-md hover:bg-muted">
            <Menu size={20} className="text-foreground" />
          </button>
        ) : (
          <button onClick={handleBack} className="p-1.5 rounded-md hover:bg-muted">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
        )}

        <h1 className="font-display font-bold text-foreground flex-1">
          {view === "sidebar" ? "Categorías" : view === "list" ? "Notas" : "Mapa"}
        </h1>

        {view !== "graph" && (
          <button
            onClick={() => { setActiveView("graph"); setView("graph"); }}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <Network size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "sidebar" && (
          <div className="flex-1 overflow-hidden" onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button[data-category-select]") || target.closest("[data-all-notes]")) {
              setTimeout(() => { setActiveView("notes"); setView("list"); }, 100);
            }
          }}>
            <AppSidebar />
          </div>
        )}
        {view === "list" && <NotesList />}
        {view === "graph" && <GraphView />}
      </div>
    </div>
  );
};

export default MobileLayout;
