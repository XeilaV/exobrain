import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface NameInputDialogProps {
  open: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const NameInputDialog = ({
  open, title, placeholder, initialValue = "",
  submitLabel = "Crear", onSubmit, onCancel,
}: NameInputDialogProps) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl shadow-2xl p-4 w-full max-w-sm space-y-3"
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); submit(); }
            if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          }}
          placeholder={placeholder}
          className="w-full bg-muted rounded-md text-sm px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring font-body"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs font-body text-muted-foreground hover:bg-muted"
          >Cancelar</button>
          <button
            onClick={submit}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
          >{submitLabel}</button>
        </div>
      </motion.div>
    </div>
  );
};

export default NameInputDialog;
