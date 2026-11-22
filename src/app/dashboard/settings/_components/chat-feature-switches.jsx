"use client";

// Two ops switches next to the AI chatbot one (../page.jsx): Support chat and
// guest↔host Messaging. Same service (the chat widget service), same admin-only
// guard, same optimistic-then-trust-the-server pattern as the AI switch.
//
// Turning one off is enforced server-side (the support namespace refuses
// customers; the chat service refuses every REST call and socket), so the
// switch is a real control and not just a hidden button. The site and the
// widget hide the surface themselves within seconds.

import { useCallback, useEffect, useState } from "react";
import { Headset, MessagesSquare, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const SUPPORT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_SOCKET_URL || "http://localhost:3003";

// Mirrors getAdminToken() in ../page.jsx — the token is sometimes stored
// JSON-encoded and sometimes raw.
function getAdminToken() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("token");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string" && parsed.length > 0) return parsed;
  } catch {
    /* not JSON, treat as raw */
  }
  return raw;
}

const FEATURES = [
  {
    key: "support",
    field: "supportEnabled",
    Icon: Headset,
    title: "Support Chat",
    description:
      "The “Support” tab in the website chat widget, where customers talk to your team. Turn it off when nobody is around to answer.",
    onTitle: "Support Chat is ON.",
    onText: "Signed-in customers can start and continue support conversations.",
    offTitle: "Support Chat is OFF.",
    offText:
      "Customers can't open the Support tab and their connections are closed. You can still open the console and read every conversation.",
    toastOn: "Support Chat turned ON — customers can reach your team again.",
    toastOff: "Support Chat turned OFF — customers no longer see it.",
    label: "Toggle Support Chat on or off",
  },
  {
    key: "messaging",
    field: "messagingEnabled",
    Icon: MessagesSquare,
    title: "Guest ↔ Host Messaging",
    description:
      "“Message host” on stays, the guest Messages page and the host Inbox. Turn it off while the chat service is down or being worked on, so nobody hits a “try again” error.",
    onTitle: "Messaging is ON.",
    onText: "Guests can message hosts and hosts can reply.",
    offTitle: "Messaging is OFF.",
    offText:
      "Message host, Messages and Inbox are hidden for guests and hosts, and the chat service refuses every request — pages, API and live connections. Existing conversations are kept and return when you turn it back on.",
    toastOn: "Messaging turned ON — guests and hosts can message again.",
    toastOff: "Messaging turned OFF — it is hidden everywhere on the platform.",
    label: "Toggle guest and host messaging on or off",
  },
];

export function ChatFeatureSwitches() {
  const [flags, setFlags] = useState({ support: null, messaging: null }); // null = still loading
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(null); // key being saved

  const load = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setLoadError("Authentication required. Please log in again.");
      return;
    }
    try {
      const res = await fetch(`${SUPPORT_URL}/api/admin/chat-features`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 401) {
        setLoadError("You don't have admin access to this setting.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFlags({
        support: data.supportEnabled !== false,
        messaging: data.messagingEnabled !== false,
      });
      setLoadError(null);
    } catch (err) {
      setLoadError(
        `Couldn't reach the chat service (${err.message}). The settings are unchanged.`
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(feature, next) {
    const token = getAdminToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    const previous = flags[feature.key];
    setFlags((f) => ({ ...f, [feature.key]: next })); // optimistic
    setSaving(feature.key);
    try {
      const res = await fetch(`${SUPPORT_URL}/api/admin/chat-features`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feature: feature.key, enabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Trust the server's answer over our optimistic guess.
      setFlags({
        support: data.supportEnabled !== false,
        messaging: data.messagingEnabled !== false,
      });
      toast.success(next ? feature.toastOn : feature.toastOff);
    } catch (err) {
      setFlags((f) => ({ ...f, [feature.key]: previous })); // roll back
      toast.error(`Couldn't update the setting: ${err.message}`);
    } finally {
      setSaving(null);
    }
  }

  return FEATURES.map((feature) => {
    const { key, Icon } = feature;
    const enabled = flags[key];
    const loading = enabled === null && !loadError;
    const busy = loading || saving === key;
    return (
      <div
        key={key}
        className="bg-white shadow-md rounded-lg overflow-hidden"
        data-testid={`${key}-switch-card`}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-full bg-primaryGreen/10 text-primaryGreen items-center justify-center">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-gray-900">{feature.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {busy && <Loader2 className="w-4 h-4 animate-spin text-gray-400" aria-hidden="true" />}
                  <Switch
                    checked={!!enabled}
                    onCheckedChange={(next) => handleToggle(feature, next)}
                    disabled={busy || !!loadError || saving !== null}
                    aria-label={feature.label}
                    data-testid={`${key}-switch`}
                  />
                </div>
              </div>

              {loadError ? (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p>{loadError}</p>
                    <button
                      type="button"
                      onClick={load}
                      className="mt-1 rounded-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryGreen"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <p className="mt-4 text-sm text-gray-500">Checking current status…</p>
              ) : enabled ? (
                <div
                  key="on"
                  className="me-fade-in mt-4 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                >
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <p>
                    <span className="font-medium">{feature.onTitle}</span> {feature.onText}
                  </p>
                </div>
              ) : (
                <div
                  key="off"
                  className="me-fade-in mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
                >
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <p>
                    <span className="font-medium">{feature.offTitle}</span> {feature.offText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });
}
