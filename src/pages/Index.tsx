import { NotesProvider } from "@/contexts/NotesContext";
import ChatPanel from "@/components/ChatPanel";
import GraphView from "@/components/GraphView";
import AppMenu from "@/components/AppMenu";

const Index = () => {
  return (
    <NotesProvider>
      <div className="h-screen flex overflow-hidden relative">
        <GraphView />
        <AppMenu />
        <ChatPanel />
      </div>
    </NotesProvider>
  );
};

export default Index;
