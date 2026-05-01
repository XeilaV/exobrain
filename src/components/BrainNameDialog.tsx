import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  initialName?: string;
  isFirstTime?: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}

const BrainNameDialog = ({ open, initialName = "ExoBrain", isFirstTime, onSave, onClose }: Props) => {
  const [name, setName] = useState(initialName);

  useEffect(() => { if (open) setName(initialName); }, [open, initialName]);

  const handleSave = () => {
    const trimmed = name.trim() || "ExoBrain";
    onSave(trimmed);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isFirstTime ? "Bienvenido 🌳" : "Renombra tu cerebro"}
          </DialogTitle>
          <DialogDescription className="font-body">
            {isFirstTime
              ? "¿Quieres ponerle un nombre a tu cerebro? Por defecto se llamará ExoBrain. Podrás cambiarlo cuando quieras."
              : "Elige un nuevo nombre para la raíz de tu árbol."}
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="ExoBrain"
          autoFocus
          className="font-body"
        />
        <DialogFooter>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            {isFirstTime ? "Empezar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BrainNameDialog;
