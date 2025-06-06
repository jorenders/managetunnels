import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, PlusCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

// Lees het build‑nummer uit een Vite‑env var (stel VITE_BUILD in je CI/CD)
const BUILD = import.meta.env.VITE_BUILD ?? "dev";

/**
 * Cloudflare Tunnel Manager – front‑end die via Worker‑proxy praat.
 */
export default function CloudflareTunnelManager() {
  const [tunnelName, setTunnelName] = useState("api-tunnel");
  const [tunnelId, setTunnelId] = useState("");
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);

  const API = "https://tunnel-api.jo-renders.workers.dev";

  async function createTunnel() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tunnelName }),
      });
      const json = await res.json();
      if (json.success) {
        setTunnelId(json.result.id);
        setStatus({ ok: true, msg: `Tunnel created (id: ${json.result.id})` });
      } else {
        throw new Error(json.errors?.[0]?.message || "Unknown error");
      }
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function deleteTunnel() {
    if (!tunnelId) {
      setStatus({ ok: false, msg: "No tunnel ID set" });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/delete/${tunnelId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setStatus({ ok: true, msg: `Tunnel ${tunnelId} deleted` });
        setTunnelId("");
      } else {
        throw new Error(json.errors?.[0]?.message || "Unknown error");
      }
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-xl">
        <CardContent className="p-6 space-y-6">
          <h1 className="text-2xl font-semibold">Cloudflare Tunnel Manager</h1>

          <div className="grid gap-4">
            <Input
              placeholder="Tunnel Name"
              value={tunnelName}
              onChange={(e) => setTunnelName(e.target.value)}
            />
            <Input
              placeholder="Tunnel ID (for deletion)"
              value={tunnelId}
              onChange={(e) => setTunnelId(e.target.value.trim())}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={createTunnel} disabled={loading} className="flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <PlusCircle size={16} />} Create
            </Button>
            <Button
              onClick={deleteTunnel}
              variant="destructive"
              disabled={loading || !tunnelId}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={16} />} Delete
            </Button>
          </div>

          {status && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium ${status.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {status.ok ? <CheckCircle size={18} /> : <XCircle size={18} />} {status.msg}
            </motion.div>
          )}

          <p className="text-xs text-gray-500">
            Requests gaan via de Worker‑proxy (<code>{API}</code>). Token staat server‑side; CORS opgelost.
          </p>

          <p className="text-[10px] text-gray-400 text-center">Build: {BUILD}</p>
        </CardContent>
      </Card>
    </div>
  );
}
