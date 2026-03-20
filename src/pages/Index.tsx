import { NotesProvider } from "@/contexts/NotesContext";
import AppSidebar from "@/components/AppSidebar";
import NotesList from "@/components/NotesList";
import NoteEditor from "@/components/NoteEditor";
import ChatPanel from "@/components/ChatPanel";
import GraphView from "@/components/GraphView";
import MobileLayout from "@/components/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotes } from "@/contexts/NotesContext";

const DesktopContent = () => {
  const { activeView } = useNotes();
  return (
    <div className="h-screen flex overflow-hidden">
      <AppSidebar />
      {activeView === "graph" ? (
        <GraphView />
      ) : (
        <>
          <NotesList />
          <NoteEditor />
        </>
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
