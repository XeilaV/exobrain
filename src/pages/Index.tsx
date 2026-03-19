import { NotesProvider } from "@/contexts/NotesContext";
import AppSidebar from "@/components/AppSidebar";
import NotesList from "@/components/NotesList";
import NoteEditor from "@/components/NoteEditor";
import ChatPanel from "@/components/ChatPanel";
import MobileLayout from "@/components/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";

const DesktopLayout = () => (
  <div className="h-screen flex overflow-hidden">
    <AppSidebar />
    <NotesList />
    <NoteEditor />
    <ChatPanel />
  </div>
);

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
        <DesktopLayout />
      )}
    </NotesProvider>
  );
};

export default Index;
