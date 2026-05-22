"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { Send, CheckCircle2, RotateCcw, Star, ArrowLeft, X, AlertCircle } from "lucide-react";

const SUPPORT_URL =
  process.env.NEXT_PUBLIC_SUPPORT_SOCKET_URL || "http://localhost:3003";

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

function genClientMessageId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const STAR_COUNT = [1, 2, 3, 4, 5];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  open: "bg-emerald-100 text-emerald-800 border-emerald-200",
  resolved: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusPill({ status }) {
  if (!status) return null;
  const cls = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

export default function SupportChatPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeMeta, setActiveMeta] = useState(null); // status, assignedAdminName, rating, etc.
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [token, setToken] = useState(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { title, body, confirmLabel, tone, onConfirm }
  const [toast, setToast] = useState(null); // { message, tone: "error" | "info" }
  const socketRef = useRef(null);
  const activeIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(false);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, tone = "error") => {
    setToast({ message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    setToken(getAdminToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    const sock = io(`${SUPPORT_URL}/support`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = sock;

    sock.on("connect", () => {
      setIsConnected(true);
      setAuthError(null);
      // On a RECONNECT the server places this fresh socket only in
      // ADMINS_ROOM — not back in the open conversation's room. Without
      // rejoining, live messages for the currently-open thread silently
      // stop arriving until the admin clicks away and back. Re-emitting
      // assign rejoins the room (a silent no-op when still assigned to us);
      // fetch-history backfills anything missed while disconnected.
      const openId = activeIdRef.current;
      if (openId) {
        sock.emit("support:fetch-history", { conversationId: openId }, () => {});
        sock.emit("support:assign", { conversationId: openId }, () => {});
      }
    });
    sock.on("disconnect", () => setIsConnected(false));
    sock.on("connect_error", (err) => {
      setAuthError(err?.message || "Connection failed");
      setIsConnected(false);
    });

    sock.on("support:admin-init", (payload) => {
      setConversations(payload.conversations || []);
    });

    sock.on("support:new-conversation", () => {
      sock.emit("support:start");
    });

    sock.on("support:conversation-updated", (payload) => {
      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) => c.conversationId === payload.conversationId
        );
        const base =
          idx >= 0
            ? prev[idx]
            : {
                conversationId: payload.conversationId,
                status: "pending",
                lastMessage: null,
                unread: 0,
                updatedAt: new Date().toISOString(),
                assignedAdminId: null,
                assignedAdminName: null,
                rating: null,
              };
        const updated = {
          ...base,
          lastMessage: payload.lastMessage ?? base.lastMessage,
          status: payload.status ?? base.status,
          assignedAdminId:
            payload.assignedAdminId !== undefined
              ? payload.assignedAdminId
              : base.assignedAdminId,
          assignedAdminName:
            payload.assignedAdminName !== undefined
              ? payload.assignedAdminName
              : base.assignedAdminName,
          rating:
            payload.rating !== undefined ? payload.rating : base.rating,
          unread:
            payload.lastMessage?.from === "user" &&
            payload.conversationId !== activeIdRef.current
              ? (base.unread || 0) + 1
              : base.unread,
          updatedAt: payload.lastMessage?.createdAt ?? base.updatedAt,
        };
        const rest = prev.filter(
          (c) => c.conversationId !== payload.conversationId
        );
        return [updated, ...rest];
      });
    });

    sock.on("support:message", (payload) => {
      if (payload.conversationId !== activeIdRef.current) return;
      setMessages((prev) => {
        // Dedup by serverId
        if (prev.some((m) => m._id === payload.message._id)) return prev;
        // Replace optimistic by clientMessageId
        if (payload.message.clientMessageId) {
          const idx = prev.findIndex(
            (m) => m.clientMessageId === payload.message.clientMessageId
          );
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = payload.message;
            return next;
          }
        }
        return [...prev, payload.message];
      });
    });

    sock.on("support:status", (payload) => {
      if (payload.conversationId !== activeIdRef.current) return;
      setActiveMeta((m) => ({
        ...(m || {}),
        status: payload.status,
        assignedAdminId: payload.assignedAdminId,
        assignedAdminName: payload.assignedAdminName,
      }));
    });

    sock.on("support:rated", (payload) => {
      if (payload.conversationId === activeIdRef.current) {
        setActiveMeta((m) => ({ ...(m || {}), rating: payload.rating }));
      }
    });

    sock.on("support:typing", (payload) => {
      if (payload.conversationId !== activeIdRef.current) return;
      if (payload.from === "user") setPeerTyping(!!payload.isTyping);
    });

    // Full-history replay sent in response to support:fetch-history. Carries
    // the entire conversation (live + archive), so admins always see every
    // message even after a convo is resolved or has aged past the 500-message
    // ring buffer cap. Compliance requirement.
    sock.on("support:history", (payload) => {
      if (payload.conversationId !== activeIdRef.current) return;
      setMessages(payload.messages || []);
    });

    // Force an immediate reconnect when a backgrounded tab is refocused, so
    // the reply input doesn't sit disabled waiting out the backoff after an
    // idle period.
    const onVisible = () => {
      if (document.visibilityState === "visible" && !sock.connected) {
        sock.connect();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sock.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const openConversation = useCallback((id) => {
    if (!socketRef.current) return;
    setActiveId(id);
    setMessages([]);
    setPeerTyping(false);
    const convo = conversations.find((c) => c.conversationId === id);
    setActiveMeta({
      status: convo?.status ?? null,
      assignedAdminId: convo?.assignedAdminId ?? null,
      assignedAdminName: convo?.assignedAdminName ?? null,
      userFirstName: convo?.userFirstName ?? (convo?.userId ? "User" : "Guest"),
      userId: convo?.userId ?? null,
      rating: convo?.rating ?? null,
    });
    // Always replay the full conversation history (live + archive). Compliance:
    // admins must see every message regardless of convo age or resolved state.
    socketRef.current.emit("support:fetch-history", { conversationId: id }, (ack) => {
      if (ack && !ack.ok) showToast(`Couldn't load history: ${ack.error}`);
    });
    if (convo?.status !== "resolved") {
      socketRef.current.emit("support:assign", { conversationId: id }, (ack) => {
        if (ack && !ack.ok) showToast(`Couldn't open: ${ack.error}`);
      });
    }
    setConversations((prev) =>
      prev.map((c) => (c.conversationId === id ? { ...c, unread: 0 } : c))
    );
    socketRef.current.emit("support:read", { conversationId: id });
  }, [conversations, showToast]);

  const sendReply = useCallback(() => {
    if (!reply.trim() || !activeId || !socketRef.current) return;
    if (activeMeta?.status === "resolved") {
      showToast("This conversation is closed. Reopen it before sending a reply.");
      return;
    }
    const text = reply.trim();
    const clientMessageId = genClientMessageId();
    // Optimistic add
    setMessages((prev) => [
      ...prev,
      {
        _id: clientMessageId,
        clientMessageId,
        from: "admin",
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
    socketRef.current.emit(
      "support:message",
      { conversationId: activeId, text, clientMessageId },
      (ack) => {
        if (!ack?.ok) {
          showToast(`Send failed: ${ack?.error ?? "unknown"}`);
          // Drop the optimistic
          setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
        }
      }
    );
    setReply("");
  }, [reply, activeId, activeMeta, showToast]);

  const resolveConversation = useCallback(() => {
    if (!activeId || !socketRef.current) return;
    setConfirmModal({
      title: "Mark as resolved?",
      body: "The user will be prompted to rate the support experience. You can reopen the conversation later if needed.",
      confirmLabel: "Mark resolved",
      tone: "primary",
      onConfirm: () => {
        socketRef.current?.emit("support:resolve", { conversationId: activeId }, (ack) => {
          if (!ack?.ok) showToast(`Resolve failed: ${ack?.error ?? "unknown"}`);
        });
      },
    });
  }, [activeId, showToast]);

  const reopenConversation = useCallback(() => {
    if (!activeId || !socketRef.current) return;
    setConfirmModal({
      title: "Reopen conversation?",
      body: "The user will be notified that their conversation has been reopened and can continue chatting.",
      confirmLabel: "Reopen",
      tone: "primary",
      onConfirm: () => {
        socketRef.current?.emit("support:reopen", { conversationId: activeId }, (ack) => {
          if (!ack?.ok) showToast(`Reopen failed: ${ack?.error ?? "unknown"}`);
        });
      },
    });
  }, [activeId, showToast]);

  if (!token) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Support Chat</h1>
        <p className="text-sm text-muted-foreground">
          You must be logged in as an admin to use this page.
        </p>
      </div>
    );
  }

  const status = activeMeta?.status;
  const isResolved = status === "resolved";
  const adminName = activeMeta?.assignedAdminName;
  const rating = activeMeta?.rating;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-[calc(100vh-4rem)] pb-16 lg:pb-0">
      <div className="px-4 lg:px-6 py-3 lg:py-4 border-b flex items-center justify-between bg-background">
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-semibold">Support Chat</h1>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {isConnected
              ? "Connected — real-time replies enabled"
              : authError
              ? `Connection error: ${authError}`
              : "Connecting…"}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] overflow-hidden min-h-0">
        {/* Conversation list — hidden on mobile when a convo is active */}
        <aside
          className={`border-r bg-card overflow-y-auto ${
            activeId ? "hidden lg:block" : "block"
          }`}
        >
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No active conversations yet. New user messages will appear here.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.conversationId}
                onClick={() => openConversation(c.conversationId)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition ${
                  activeId === c.conversationId ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {c.userFirstName ?? (c.userId ? "User" : "Guest")}
                  </span>
                  {c.unread > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {c.unread}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  #{c.conversationId.slice(-6)}
                </span>
                <p className="text-sm mt-1 line-clamp-2">
                  {c.lastMessage?.text ?? "(no messages yet)"}
                </p>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <StatusPill status={c.status} />
                    <p className="text-[10px] text-muted-foreground truncate">
                      {c.assignedAdminName ? `${c.assignedAdminName} · ` : ""}
                      {new Date(c.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  {c.rating && (
                    <span className="flex items-center text-amber-500 text-[10px] shrink-0">
                      {STAR_COUNT.map((n) => (
                        <Star
                          key={n}
                          className={`w-2.5 h-2.5 ${n <= c.rating.stars ? "fill-amber-400" : ""}`}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Active chat — hidden on mobile when no convo is selected */}
        <section
          className={`flex-col bg-background min-h-0 ${
            activeId ? "flex" : "hidden lg:flex"
          }`}
        >
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
              Select a conversation to start replying.
            </div>
          ) : (
            <>
              <div className="border-b p-3 lg:p-4 flex items-center gap-3">
                <button
                  onClick={() => setActiveId(null)}
                  className="lg:hidden p-1.5 -ml-1 rounded-md hover:bg-muted shrink-0"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-base font-semibold flex items-center gap-2 truncate">
                    {activeMeta?.userFirstName ?? "Guest"}
                    {!activeMeta?.userId && (
                      <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        Anonymous
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusPill status={status} />
                    <span className="text-[11px] font-mono text-muted-foreground truncate">
                      #{activeId.slice(-8)}
                      {status === "pending"
                        ? " · awaiting first reply"
                        : status === "open"
                        ? ` · handled by ${adminName ?? "you"}`
                        : status === "resolved"
                        ? rating ? ` · rated ${rating.stars}★` : ""
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isResolved ? (
                    <button
                      onClick={reopenConversation}
                      className="text-xs px-3 py-1.5 border rounded-md hover:bg-muted flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reopen</span>
                    </button>
                  ) : (
                    <button
                      onClick={resolveConversation}
                      className="text-xs px-3 py-1.5 border rounded-md hover:bg-muted flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mark resolved</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Type a reply to begin. New messages stream in live.
                  </p>
                )}
                {messages.map((m) => {
                  if (m.from === "system") {
                    return (
                      <div key={m._id} className="flex justify-center my-1">
                        <span className="bg-muted text-muted-foreground text-[11px] italic px-3 py-1 rounded-full">
                          {m.text}
                        </span>
                      </div>
                    );
                  }
                  const isAdmin = m.from === "admin";
                  return (
                    <div
                      key={m._id}
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        isAdmin
                          ? "bg-primaryGreen text-white self-end"
                          : "bg-card border self-start"
                      }`}
                    >
                      <div>{m.text}</div>
                      <div
                        className={`text-[10px] mt-1 ${
                          isAdmin
                            ? "text-white/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {peerTyping && !isResolved && (
                <div className="px-4 pb-1 text-[11px] text-muted-foreground italic flex items-center gap-1">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  {(activeMeta?.userFirstName ?? "User")} is typing…
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendReply();
                }}
                className="border-t p-3 flex gap-2"
              >
                <input
                  value={reply}
                  onChange={(e) => {
                    setReply(e.target.value);
                    // Throttle typing emits — start once, stop after 2s of inactivity.
                    if (!socketRef.current?.connected || !activeIdRef.current) return;
                    if (!typingEmitRef.current) {
                      typingEmitRef.current = true;
                      socketRef.current.emit("support:typing", {
                        conversationId: activeIdRef.current,
                        isTyping: true,
                      });
                    }
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      typingEmitRef.current = false;
                      socketRef.current?.emit("support:typing", {
                        conversationId: activeIdRef.current,
                        isTyping: false,
                      });
                    }, 2000);
                  }}
                  placeholder={isResolved ? "Reopen the conversation to reply" : "Reply…"}
                  disabled={!isConnected || isResolved}
                  className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primaryGreen focus:border-primaryGreen disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!reply.trim() || !isConnected || isResolved}
                  className="px-4 bg-primaryGreen text-white rounded-full text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* Custom confirm modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
          onClick={() => setConfirmModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-xl shadow-xl max-w-md w-full p-5 border"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-base font-semibold">{confirmModal.title}</h2>
              <button
                onClick={() => setConfirmModal(null)}
                className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1 rounded-md hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">{confirmModal.body}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="text-sm px-4 py-2 rounded-md border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm?.();
                  setConfirmModal(null);
                }}
                className="text-sm px-4 py-2 rounded-md bg-primaryGreen text-white hover:opacity-90"
              >
                {confirmModal.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast — replaces alert() */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-background border shadow-lg rounded-lg px-4 py-3 flex items-start gap-2 max-w-sm">
            <AlertCircle
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                toast.tone === "error" ? "text-red-500" : "text-primaryGreen"
              }`}
            />
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="text-muted-foreground hover:text-foreground -mt-0.5 -mr-1 p-0.5 rounded hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
