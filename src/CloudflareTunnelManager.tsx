import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CheckCircle,
  XCircle,
  PlusCircle,
  Trash2,
  Copy,
  Globe2,
} from "lucide-react";
import { motion } from "framer-motion";

const BUILD = import.meta.env.VITE_BUILD ?? "dev";

export default function CloudflareTunnelManager() {
  // ─── state ────────────────────────────────────────────────────────────
  const [tunnelName, setTunnelName] = useState("api-tunnel");
  const [tunnelId, setTunnelId] = useState("");
  const [tunnelToken, setTunnelToken] = useState("");
  const [publicHostname, setPublicHostname] = useState<string | null>(null);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);

  // ─── constants ────────────────────────────────────────────────────────
  const API = "https://tunnel-api.jo-renders.workers.dev";
  const FIXED_DOMAIN = "house-iq.cc";
  const FIXED_SERVICE = "http://homeassistant:8123";

  // ─── helpers ──────────────────────────────────────────────────────────
  function show(ok: boolean, msg: string) {
    setStatus({ ok, msg });
  }

  // build YAML snippet for config
  function buildYaml(token: string, hostname: string) {
    return (
`external_hostname: ${hostname}
additional_hosts: []
tunnel_token: >-
  ${token}
nginx_proxy_manager: true
log_level: debug
run_parameters:
  - "--logfile=/config/cloudflared.log"
  - "--loglevel=debug"
  - "--retries=0"`
    );
  }

  // ─── create tunnel + hostname ─────────────────────────────────────────
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
      if (!json.success) throw new Error("Tunnel create failed");

      const id = json.result.id as string;
      setTunnelId(id);
      setTunnelToken(json.result.token as string);

      const hostRes = await fetch(`${API}/api/hostname`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tunnel_id: id,
          subdomain: tunnelName,
          domain: FIXED_DOMAIN,
          service: FIXED_SERVICE,
        }),
      });
      const hostJson = await hostRes.json();
      if (!hostJson.success) throw new Error("Hostname create failed");
      setPublicHostname(`${tunnelName}.${FIXED_DOMAIN}`);

      show(true, `Tunnel + hostname ready (${id})`);
    } catch (e: any) {
      show(false, e.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── delete tunnel + CNAME ────────────────────────────────────────────
  async function deleteTunnel() {
    if (!tunnelId) {
      show(false, "No tunnel ID set");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/delete/${tunnelId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error("Delete tunnel failed");

      await fetch(`${API}/api/hostname`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: tunnelName, domain: FIXED_DOMAIN }),
      });

      setTunnelId("");
      setTunnelToken("");
      setPublicHostname(null);
      show(true, `Tunnel + hostname deleted`);
    } catch (e: any) {
      show(false, e.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────────
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

          {tunnelToken && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-auto">
              {buildYaml(tunnelToken, publicHostname ?? `${tunnelName}.${FIXED_DOMAIN}`)}
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    buildYaml(tunnelToken, publicHostname ?? `${tunnelName}.${FIXED_DOMAIN}`)
                  )
                }
                title="Copy YAML"
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                <Copy size={14} />
              </button>
            </div>
          )}

          {publicHostname && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Globe2 size={14} />
              <a
                href={`https://${publicHostname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {publicHostname}
              </a>
            </div>
          )}

          {status && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium ${
                status.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {status.ok ? <CheckCircle size={18} /> : <XCircle size={18} />} {status.msg}
            </motion.div>
          )}

          <p className="text-xs text-gray-500">
            Tunnel wordt gekoppeld aan <code>{`*.${FIXED_DOMAIN}`}</code> ↔︎ <code>{FIXED_SERVICE}</code> — bij verwijderen gaat het CNAME weg.
          </p>

          <p className="text-[10px] text-gray-400 text-center">Build: {BUILD}</p>
        </CardContent>
      </Card>
    </div>
  );
}
