import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportNotes, type ExportFormat } from "@/lib/exportNotes";
import { useNotes } from "@/contexts/NotesContext";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ExportDialog = ({ open, onOpenChange }: Props) => {
  const { brainName } = useNotes();
  const [format, setFormat] = useState<ExportFormat>("json");
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const res = await exportNotes(format, brainName || "ExoBrain");
      toast.success(`Descargado: ${res.notes} notas en ${res.categories} temas`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la descarga");
    } finally {
      setBusy(false);
    }
  };

  const options: { id: ExportFormat; label: string; desc: string; Icon: typeof FileJson }[] = [
    { id: "json", label: "JSON", desc: "Copia completa para respaldo o reimportar", Icon: FileJson },
    { id: "markdown", label: "Markdown", desc: "Legible: temas, notas y listas", Icon: FileText },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Descargar mis notas</DialogTitle>
          <DialogDescription className="font-body">
            Exporta todos tus temas y notas con su contenido actual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {options.map(({ id, label, desc, Icon }) => (
            <button
              key={id}
              onClick={() => setFormat(id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                format === id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <Icon size={18} className="mt-0.5 text-muted-foreground" />
              <span>
                <span className="block text-sm font-body text-foreground">{label}</span>
                <span className="block text-xs font-body text-muted-foreground">{desc}</span>
              </span>
            </button>
          ))}
        </div>

        <Button onClick={handleDownload} disabled={busy} className="w-full gap-2 font-body">
          <Download size={16} />
          {busy ? "Generando..." : "Descargar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
