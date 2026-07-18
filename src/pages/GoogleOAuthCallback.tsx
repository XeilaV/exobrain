import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GoogleOAuthCallback = () => {
  const [msg, setMsg] = useState("Conectando con Google...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const err = params.get("error");
    (async () => {
      if (err) { setMsg("Error: " + err); return; }
      if (!code) { setMsg("Falta el código de autorización"); return; }
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-exchange", { body: { code } });
      if (error || data?.error) {
        setMsg("No se pudo completar la conexión");
        console.error(error, data);
        return;
      }
      setMsg("Conectado. Puedes cerrar esta ventana.");
      if (window.opener) {
        window.opener.postMessage({ type: "gcal_oauth_done", email: data?.email }, window.location.origin);
        setTimeout(() => window.close(), 600);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-body p-6">
      <p>{msg}</p>
    </div>
  );
};

export default GoogleOAuthCallback;
