"use client";

// Platform settings: the signed-in admin's own name (what customers see in
// Support Chat — server.me /admin/me), the homepage banner (./_components,
// server.me docs/site-hero.md) and the AI chatbot kill-switch.
//
// The chatbot flag lives in the chat widget service (port 3003 in dev,
// chat.majesticescape.in in prod), not in server.me — same service the support
// console already talks to. Turning it off stops Gemini/Groq/xAI spend at the
// source: the widget hides its AI tab, and /api/chat refuses server-side so the
// saving holds even if someone calls the API directly.

import { useCallback, useEffect, useState } from "react";
import { Bot, ShieldCheck, Loader2, AlertCircle, UserRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import EditUserNameDialog from "@/components/edit-user-name-dialog";
import { renameMe } from "@/lib/admin-api";
import { queryKeys } from "@/lib/query-keys";
import { adminFullName, useAdminProfile } from "@/hooks/use-admin-profile";
import { HeroBannerSettings } from "./_components/hero-banner-settings";

const SUPPORT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_SOCKET_URL || "http://localhost:3003";

// Mirrors getAdminToken() in dashboard/support-chat/page.jsx — the token is
// sometimes stored JSON-encoded and sometimes raw.
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

// The name customers see when this admin replies in Support Chat. Renaming
// changes this admin account only; chat lines already sent keep the name
// they were sent with.
function SupportChatNameCard() {
  const queryClient = useQueryClient();
  const { data: profile, error, isPending, isFetching, refetch, identity } = useAdminProfile();
  const [editing, setEditing] = useState(false);

  const busy = !profile && (isPending || isFetching);
  const errorMessage = error
    ? error.status === 403
      ? "Only admin accounts can change this name."
      : `Couldn't load your profile (${error.message}).`
    : null;

  // Header avatar and this card read the same cache entry, so both update
  // the moment the server confirms (or reports a newer name after a 409).
  const handleSaved = (data) => {
    if (!data) return;
    queryClient.setQueryData(queryKeys.adminProfile(identity), (prev) =>
      prev ? { ...prev, firstName: data.firstName ?? "", lastName: data.lastName ?? "" } : prev
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden" data-testid="support-chat-name-card">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-full bg-primaryGreen/10 text-primaryGreen items-center justify-center">
            <UserRound className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="support-chat-name-heading" className="text-lg font-medium text-gray-900">
                  Your name in Support Chat
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Customers see your first name when you reply in Support Chat
                  (e.g. “Admin Support is helping you”). Renaming changes this
                  admin account&apos;s name; past chat lines keep the name they
                  were sent with.
                </p>
              </div>
              {busy ? (
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" aria-hidden="true" />
                </div>
              ) : null}
            </div>

            {errorMessage && !profile ? (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p>{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-1 rounded-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryGreen"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !profile ? (
              <p className="mt-4 text-sm text-gray-500">Loading your name…</p>
            ) : (
              <div className="me-fade-in mt-4 flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <dl className="grid min-w-0 gap-1 text-sm">
                  <div className="flex min-w-0 flex-wrap gap-x-2">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="min-w-0 break-words font-medium text-gray-900" data-testid="support-chat-name">
                      {adminFullName(profile) || "—"}
                    </dd>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-x-2">
                    <dt className="text-gray-500">E-mail</dt>
                    <dd className="min-w-0 break-all text-gray-700">{profile.email || "—"}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 self-start bg-white sm:self-auto"
                  aria-describedby="support-chat-name-heading"
                  onClick={() => setEditing(true)}
                  data-testid="edit-my-name"
                >
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Edit name
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <EditUserNameDialog
        user={profile ? { _id: identity ?? "me", firstName: profile.firstName ?? "", lastName: profile.lastName ?? "", email: profile.email } : null}
        open={editing && !!profile}
        onOpenChange={setEditing}
        onSaved={handleSaved}
        save={renameMe}
        conflictMode="stay"
        title="Edit your name"
        description="Customers see your first name when you reply in Support Chat."
      />
    </div>
  );
}

export default function SettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setLoadError("Authentication required. Please log in again.");
      return;
    }
    try {
      const res = await fetch(`${SUPPORT_URL}/api/admin/ai-toggle`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 401) {
        setLoadError("You don't have admin access to this setting.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAiEnabled(data.aiEnabled !== false);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        `Couldn't reach the chat service (${err.message}). The setting is unchanged.`
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(next) {
    const token = getAdminToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    const previous = aiEnabled;
    setAiEnabled(next); // optimistic
    setSaving(true);
    try {
      const res = await fetch(`${SUPPORT_URL}/api/admin/ai-toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Trust the server's answer over our optimistic guess.
      setAiEnabled(data.aiEnabled !== false);
      toast.success(
        next
          ? "AI chatbot turned ON — guests can use the AI Assistant again."
          : "AI chatbot turned OFF — no further AI costs will be incurred."
      );
    } catch (err) {
      setAiEnabled(previous); // roll back
      toast.error(`Couldn't update the setting: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const loading = aiEnabled === null && !loadError;

  return (
    <div className="container px-4 pt-6 pb-24 sm:px-6 md:pb-10 lg:px-8">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
          <p className="text-sm text-gray-600">
            Platform-wide controls for the website.
          </p>
        </div>

        <SupportChatNameCard />

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-full bg-primaryGreen/10 text-primaryGreen items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-medium text-gray-900">
                      AI Chatbot
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Powers the “AI Assistant” tab in the website chat widget.
                      Turn it off when the business is closed or operations are
                      down to stop AI response costs.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    {(loading || saving) && (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    )}
                    <Switch
                      checked={!!aiEnabled}
                      onCheckedChange={handleToggle}
                      disabled={loading || saving || !!loadError}
                      aria-label="Toggle the AI chatbot on or off"
                    />
                  </div>
                </div>

                {loadError ? (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p>{loadError}</p>
                      <button
                        onClick={load}
                        className="mt-1 font-medium underline underline-offset-2"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : loading ? (
                  <p className="mt-4 text-sm text-gray-500">
                    Checking current status…
                  </p>
                ) : aiEnabled ? (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                      <span className="font-medium">AI responses are ON.</span>{" "}
                      Guests see both the AI Assistant and Support tabs. Each AI
                      reply costs money.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                      <span className="font-medium">AI responses are OFF.</span>{" "}
                      The AI Assistant tab is hidden and no AI costs are being
                      incurred. Customers can still reach your team through
                      Support Chat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* after the compact kill switch, so it is never buried below the editor */}
        <HeroBannerSettings />
      </div>
    </div>
  );
}
