import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

const AppMenu = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-3 right-3 z-40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full bg-card/80 backdrop-blur border border-border shadow-sm hover:bg-muted transition-colors text-foreground"
        aria-label="Menú"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 min-w-[220px] bg-popover border border-border rounded-lg shadow-xl py-1 text-sm font-body">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">Próximamente</div>
            <div className="px-3 py-1.5 text-xs text-muted-foreground/60">Historial de la app</div>
            <div className="px-3 py-1.5 text-xs text-muted-foreground/60">Conectar Google Calendar</div>
          </div>
        </>
      )}
    </div>
  );
};

export default AppMenu;
