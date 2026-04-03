import { useState, useRef, useEffect } from "react";
import { useNotes } from "@/contexts/NotesContext";
import { ChatMessage } from "@/types/notes";
import { Send, X, Sparkles, Loader2, Image, Mic, MicOff, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface ChatMessageWithMedia extends ChatMessage {
  imageUrl?: string;
}

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageWithMedia[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { notes, categories } = useNotes();
  const isMobile = useIsMobile();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const buildNotesContext = () => {
    return notes.map((note) => {
      const cat = categories.find((c) => c.id === note.categoryId);
      const checklistText = note.checklist.length > 0
        ? "\nChecklist:\n" + note.checklist.map((item) => `- [${item.completed ? "x" : " "}] ${item.text}`).join("\n")
        : "";
      return {
        title: note.title,
        category: cat?.name || "Sin categoría",
        content: note.content.slice(0, 500) + checklistText,
      };
    });
  };

  const handleImageAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Send audio as a message to the AI
          sendWithMedia(input.trim() || "He enviado un audio. Transcríbelo o responde según su contenido.", undefined, base64);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Grabando audio...");
    } catch {
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const sendWithMedia = async (text: string, imageData?: string, audioData?: string) => {
    if ((!text && !imageData && !audioData) || isLoading) return;

    const displayContent = text || (imageData ? "📷 Imagen enviada" : "🎤 Audio enviado");
    const userMsg: ChatMessageWithMedia = { role: "user", content: displayContent, imageUrl: imageData };
    setInput("");
    setAttachedImage(null);
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const allMessages = [...messages, { role: "user" as const, content: text || "" }];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          notesContext: buildNotesContext(),
          image: imageData || undefined,
          audio: audioData || undefined,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error("Demasiadas solicitudes. Espera un momento.");
        } else if (resp.status === 402) {
          toast.error("Créditos agotados.");
        }
        throw new Error(`Error: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, ha ocurrido un error. Inténtalo de nuevo." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !attachedImage) return;
    await sendWithMedia(text, attachedImage || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const panelClasses = isMobile
    ? "fixed bottom-4 left-3 right-3 h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
    : "fixed bottom-6 right-6 w-96 h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50";

  const toggleClasses = isMobile
    ? "fixed bottom-28 right-4 p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity z-50"
    : "fixed bottom-8 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity z-50";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className={toggleClasses}
          >
            <Sparkles size={isMobile ? 20 : 22} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={panelClasses}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-chat shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h3 className="font-display font-semibold text-card-foreground text-sm">
                  Asistente AI
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles size={32} className="mx-auto mb-3 text-primary/40" />
                  <p className="text-sm font-body">¡Hola! Soy tu asistente.</p>
                  <p className="text-xs mt-1">
                    Puedo responder preguntas sobre tus notas, checklists e imágenes.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-body ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-chat-ai text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Imagen adjunta"
                        className="max-w-full max-h-40 rounded-lg mb-2"
                      />
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-chat-ai rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attached image preview */}
            {attachedImage && (
              <div className="px-3 pb-1 flex items-center gap-2">
                <img src={attachedImage} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-border" />
                <button onClick={() => setAttachedImage(null)} className="text-xs text-destructive hover:underline">
                  Quitar
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border bg-chat shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex gap-1 shrink-0 self-end">
                  <button
                    onClick={handleImageAttach}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Adjuntar imagen"
                  >
                    <Image size={16} />
                  </button>
                  <button
                    onClick={toggleRecording}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecording
                        ? "text-destructive bg-destructive/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={isRecording ? "Detener grabación" : "Grabar audio"}
                  >
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  className="flex-1 bg-background rounded-xl px-3.5 py-2.5 text-sm outline-none text-foreground placeholder:text-muted-foreground font-body focus:ring-1 focus:ring-ring resize-none max-h-[120px] overflow-y-auto"
                  disabled={isLoading}
                />
                <button
                  onClick={send}
                  disabled={isLoading || (!input.trim() && !attachedImage)}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatPanel;
