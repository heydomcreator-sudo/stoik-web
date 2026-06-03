"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ZernioCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Připojuji účet...");

  useEffect(() => {
    const tempToken = searchParams.get("tempToken") || searchParams.get("connect_token") || searchParams.get("token");

    if (!tempToken) {
      setStatus("error");
      setMessage("Chybí token od Zernio.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/zernio-callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tempToken }),
          credentials: "include",
        });

        if (!res.ok) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Nejsi přihlášen/á jako admin.");
          throw new Error(`API error ${res.status}`);
        }

        const data = await res.json();
        setStatus("ok");
        setMessage(`Připojeno: @${data.username} (${data.platform})`);

        setTimeout(() => {
          if (window.opener) window.close();
        }, 2000);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Nepodařilo se připojit účet.");
      }
    })();
  }, [searchParams]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "24px",
    }}>
      <div style={{
        background: "#13151c",
        border: `1px solid ${status === "ok" ? "rgba(0,255,136,0.2)" : status === "error" ? "rgba(255,100,100,0.2)" : "rgba(201,168,76,0.2)"}`,
        borderRadius: "16px",
        padding: "40px 48px",
        textAlign: "center",
        maxWidth: "380px",
        width: "100%",
      }}>
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>
          {status === "loading" ? "⏳" : status === "ok" ? "✓" : "✗"}
        </div>
        <div style={{
          fontFamily: "Cinzel, serif",
          color: status === "ok" ? "#00FF88" : status === "error" ? "#ff6b6b" : "#c9a84c",
          fontSize: "14px",
          letterSpacing: "0.1em",
          marginBottom: "12px",
        }}>
          {status === "loading" ? "PŘIPOJUJI" : status === "ok" ? "PŘIPOJENO" : "CHYBA"}
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
          {message}
        </p>
        {status === "ok" && (
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", marginTop: "16px" }}>
            Okno se automaticky zavře...
          </p>
        )}
      </div>
    </div>
  );
}

export default function ZernioCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f1117" }} />}>
      <ZernioCallbackContent />
    </Suspense>
  );
}
