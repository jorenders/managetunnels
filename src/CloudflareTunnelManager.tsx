import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, PlusCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Cloudflare Tunnel Manager
 * A lightweight client‑side page to create or delete Cloudflare Tunnels via the REST API.
 *
 * ▶︎  Paste your Account ID and an API‑token scoped to:
 *     • Account → Cloudflare Tunnel → Edit
 *     • Zone    → DNS              → Edit  (only needed if you script DNS later)
 *
 * ⚠︎  All requests happen client‑side → the token never leaves the browser.
 */
export default function CloudflareTunnelManager() {
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [tunnelName, setTunnelName] = useState("api-tunnel");
  const [tunnelId, setTunnelId] = useState("");
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);

  const base = "https://api.cloudflare.com/client/v4";

  async function createTunnel() {
    if (!accountId || !apiToken) {
      setStatus({ ok: false, msg: "Account ID en token zijn verplicht" });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${base}/accounts/${accountId}/cfd_tunnel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ name: tunnelName, config_src: "cloudflare" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      const res = await fetch(`${base}/accounts/${accountId}/cfd_tunnel/${tunnelId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
          <div className="grid grid-cols-1 gap-4">
            <Input
              placeholder="Account ID"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value.trim())}
            />
            <Input
              placeholder="API Token (edit‑scoped)"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value.trim())}
            />
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
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <PlusCircle size={16} />}
              Create
            </Button>
            <Button
              onClick={deleteTunnel}
              variant="destructive"
              disabled={loading || !tunnelId}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={16} />}
              Delete
            </Button>
          </div>

          {status && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium \${status.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {status.ok ? <CheckCircle size={18} /> : <XCircle size={18} />}
              {status.msg}
            </motion.div>
          )}

          <p className="text-xs text-gray-500">
            All API calls are executed in your browser using the token you provide. For production use,
            consider proxying requests via a backend so your token isn’t exposed client‑side.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
