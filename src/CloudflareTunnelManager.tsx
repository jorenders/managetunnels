// src/CloudflareTunnelManager.tsx
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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [tunnelName, setTunnelName] = useState("api-tunnel");
  const [tunnelId, setTunnelId] = useState("");
  const [tunnelToken, setTunnelToken] = useState("");
  const [publicHostname, setPublicHostname] = useState<string | null>(null);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── constants ────────────────────────────────────────────────────────
  // Gebruik relatieve URL zodat CORS niet in de weg zit
  const API_BASE = "/api";
  const FIXED_DOMAIN = "house-iq.cc";
  const FIXED_SERVICE = "http://homeassistant:8123";

  // ─── helpers ──────────────────────────────────────────────────────────
  function show(ok: boolean, msg: string) {
    setStatus({ ok, msg });
  }

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
  - "--retries=0"`);
  }

  // ─── create tunnel + hostname ─────────────────────────────────────────
  async function createTunnel() {
    setLoading(true);
    setStatus(null);
    setError(null);
    const logs: string[] = [];
    setDebugLogs([]);

    try {
      logs.push(`🚀 Starting createTunnel for name="${tunnelName}"`);

      // 1️⃣ create tunnel
      const res = await fetch(`${API_BASE}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tunnelName }),
      });
      logs.push(`⬅️ [create] status=${res.status}`);
      const json = await res.json();
      logs.push(`⬅️ [create] body=${JSON.stringify(json)}`);

      if (!json.success) {
        logs.push(`❌ create failed: ${json.errors?.[0]?.message}`);
        setDebugLogs(logs);
        setError(json.errors?.[0]?.message || "Unknown error");
        return;
      }

      const id = json.result.id as string;
      const token = json.result.token as string;
      logs.push(`✅ Tunnel created with id=${id}`);
      setTunnelId(id);
      setTunnelToken(token);

      // 2️⃣ create hostname
      logs.push(`➡️ Configuring hostname for "${tunnelName}.${FIXED_DOMAIN}"`);
      const hostRes = await fetch(`${API_BASE}/hostname`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tunnel_id: id,
          subdomain: tunnelName,
          domain: FIXED_DOMAIN,
          service: FIXED_SERVICE,
        }),
      });
      logs.push(`⬅️ [hostname] status=${hostRes.status}`);
      const hostJson = await hostRes.json();
      logs.push(`⬅️ [hostname] body=${JSON.stringify(hostJson)}`);

      if (!hostJson.success) {
        logs.push(`❌ hostname create failed: ${hostJson.errors?.[0]?.message}`);
        setDebugLogs(logs);
        setError(hostJson.errors?.[0]?.message || "Hostname create failed");
        return;
      }
      logs.push("✅ Hostname configured");
      setPublicHostname(`${tunnelName}.${FIXED_DOMAIN}`);

      show(true, `Tunnel + hostname ready (${id})`);
    } catch (e: any) {
      const msg = e.message || "Network or CORS error";
      logs.push(`❌ fetch threw error: ${msg}`);
      setDebugLogs(logs);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ─── delete tunnel + CNAME ────────────────────────────────────────────
  async function deleteTunnel() {
    if (!tunnelId) {
      setError("No tunnel ID set");
      return;
    }
    setLoading(true);
    setStatus(null);
    setError(null);
    const logs: string[] = [];
    setDebugLogs([]);

    try {
      logs.push(`🚀 Starting deleteTunnel for id="${tunnelId}"`);

      // delete tunnel
      const res = await fetch(`${API_BASE}/delete/${tunnelId}`, { method: "DELETE" });
      logs.push(`⬅️ [delete tunnel] status=${res.status}`);
      const json = await res.json();
      logs.push(`⬅️ [delete tunnel] body=${JSON.stringify(json)}`);

      if (!json.success) {
        logs.push(`❌ delete tunnel failed`);
        setDebugLogs(logs);
        setError("Delete tunnel failed");
        return;
      }

      // delete CNAME
      logs.push(`➡️ Deleting CNAME for "${tunnelName}.${FIXED_DOMAIN}"`);
      const cnameRes = await fetch(`${API_BASE}/hostname`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: tunnelName, domain: FIXED_DOMAIN }),
      });
      logs.push(`⬅️ [delete CNAME] status=${cnameRes.status}`);
      const cnameJson = await cnameRes.json().catch(() => null);
      logs.push(`⬅️ [delete CNAME] body=${JSON.stringify(cnameJson)}`);

      logs.push("✅ Tunnel + hostname deleted");
      setTunnelId("");
      setTunnelToken("");
      setPublicHostname(null);
      show(true, "Tunnel + hostname deleted");
    } catch (e: any) {
      const msg = e.message || "Network or CORS error";
      logs.push(`❌ fetch threw error: ${msg}`);
      setDebugLogs(logs);
      setError(msg);
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
            <Button
              onClick={createTunnel}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <PlusCircle size={16} />}{" "}
              Create
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

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded">
              <strong>Error:</strong> {error}
              {debugLogs.length > 0 && (
                <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto">
                  {debugLogs.join("\n")}
                </pre>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Tunnel wordt gekoppeld aan <code>{`*.${FIXED_DOMAIN}`}</code> ↔︎{" "}
            <code>{FIXED_SERVICE}</code> — bij verwijderen gaat het CNAME weg.
          </p>

          <p className="text-[10px] text-gray-400 text-center">Build: {BUILD}</p>
        </CardContent>
      </Card>
    </div>
  );
}
