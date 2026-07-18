import { NotesProvider } from "@/contexts/NotesContext";
import ChatPanel from "@/components/ChatPanel";
import GraphView from "@/components/GraphView";

const Index = () => {
  return (
    <NotesProvider>
      <div className="h-screen flex overflow-hidden relative">
        <GraphView />
        <ChatPanel />
      </div>
    </NotesProvider>
  );
};

export default Index;
