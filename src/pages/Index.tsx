import { NotesProvider } from "@/contexts/NotesContext";
import AppSidebar from "@/components/AppSidebar";
import NotesList from "@/components/NotesList";
import NoteEditor from "@/components/NoteEditor";
import ChatPanel from "@/components/ChatPanel";
import GraphView from "@/components/GraphView";
import MobileLayout from "@/components/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotes } from "@/contexts/NotesContext";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const DesktopContent = () => {
  const { activeView } = useNotes();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Hamburger menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-3 left-3 z-40 p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="absolute inset-0 z-30 flex">
          <div className="relative z-40">
            <AppSidebar />
          </div>
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content - always show graph unless explicitly viewing notes */}
      {activeView === "notes" ? (
        <>
          <NotesList />
          <NoteEditor />
        </>
      ) : (
        <GraphView />
      )}
      <ChatPanel />
    </div>
  );
};

const Index = () => {
  const isMobile = useIsMobile();

  return (
    <NotesProvider>
      {isMobile ? (
        <>
          <MobileLayout />
          <ChatPanel />
        </>
      ) : (
        <DesktopContent />
      )}
    </NotesProvider>
  );
};

export default Index;
