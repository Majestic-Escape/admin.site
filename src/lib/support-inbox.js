// Support inbox rows — pure state rules for dashboard/support-chat (tested by
// scripts/check-support-inbox.mjs).
//
// The support server numbers every change to a conversation (`rev`, bumped in
// the same database write) and sends ABSOLUTE state with it: status, unread,
// preview, assignee. Events can arrive late or twice, and a snapshot (a page
// of the list) can be older than an event already applied, so:
//   - a row keeps the highest `rev` it has seen — older or equal events are
//     ignored, and nothing is ever counted up locally;
//   - names come from the newest snapshot even when its `rev` is older (a
//     rename doesn't change `rev`);
//   - the preview is the last message a person wrote: system lines (joined,
//     resolved…) never replace it.
// Servers from before `rev` send none; their events are applied as they
// arrive, as the page always did.

export const EMPTY_INBOX = { rows: [], hasMore: false, openCount: null };

const hasRev = (x) => typeof x?.rev === "number";

export const isPreview = (message) => !!message && (message.from === "user" || message.from === "admin");

// Newest first, by (updatedAt, id) — the server's page order.
export function byRecency(a, b) {
  const d = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  if (d) return d;
  return a.conversationId < b.conversationId ? 1 : a.conversationId > b.conversationId ? -1 : 0;
}

const sorted = (rows) => rows.slice().sort(byRecency);

function identityOf(row) {
  return { userFirstName: row.userFirstName, userLastName: row.userLastName, userName: row.userName };
}

// A row from a snapshot (a page, or a new conversation).
export function fromSnapshot(existing, row) {
  if (existing && hasRev(existing) && hasRev(row) && existing.rev > row.rev) {
    return { ...existing, ...identityOf(row) };
  }
  return { ...row, lastMessage: isPreview(row.lastMessage) ? row.lastMessage : existing?.lastMessage ?? null };
}

function upsertAll(rows, incoming) {
  const byId = new Map(rows.map((r) => [r.conversationId, r]));
  for (const row of incoming) byId.set(row.conversationId, fromSnapshot(byId.get(row.conversationId), row));
  return [...byId.values()];
}

// The first page (on connect, or a refresh). It is the truth for its range:
// rows in that range it no longer holds are gone; older rows already loaded
// with "Load more" stay, so a refresh doesn't throw away the admin's paging.
export function applyFirstPage(state, { conversations = [], hasMore, openCount }) {
  const incoming = sorted(conversations);
  const more = hasMore === true;
  const last = incoming[incoming.length - 1];
  const ids = new Set(incoming.map((r) => r.conversationId));
  const older = more && last ? state.rows.filter((r) => !ids.has(r.conversationId) && byRecency(last, r) < 0) : [];
  const previous = new Map(state.rows.map((r) => [r.conversationId, r]));
  const page = incoming.map((row) => fromSnapshot(previous.get(row.conversationId), row));
  return {
    rows: sorted([...page, ...older]),
    hasMore: more ? (older.length ? state.hasMore : true) : false,
    openCount: typeof openCount === "number" ? openCount : state.openCount,
  };
}

export function applyNextPage(state, { conversations = [], hasMore, openCount }) {
  return {
    rows: sorted(upsertAll(state.rows, conversations)),
    hasMore: hasMore === true,
    openCount: typeof openCount === "number" ? openCount : state.openCount,
  };
}

export function applyNewConversation(state, row) {
  return { ...state, rows: sorted(upsertAll(state.rows, [row])) };
}

// A live change to one row. Unknown rows are left alone (the caller refreshes
// the first page if the row belongs in view). `activeId` only matters for
// servers without `rev`, which never sent an unread count.
export function applyUpdate(state, payload, activeId = null) {
  const index = state.rows.findIndex((r) => r.conversationId === payload.conversationId);
  if (index < 0) return state;
  const row = state.rows[index];
  if (hasRev(payload) && hasRev(row) && payload.rev <= row.rev) return state;

  const next = { ...row };
  if (isPreview(payload.lastMessage)) next.lastMessage = payload.lastMessage;
  if (payload.status !== undefined) next.status = payload.status;
  if (payload.assignedAdminId !== undefined) next.assignedAdminId = payload.assignedAdminId;
  if (payload.assignedAdminName !== undefined) next.assignedAdminName = payload.assignedAdminName;
  if (payload.rating !== undefined) next.rating = payload.rating;
  if (payload.resolvedAt !== undefined) next.resolvedAt = payload.resolvedAt;
  if (typeof payload.unread === "number") {
    next.unread = payload.unread;
  } else if (!hasRev(payload) && payload.lastMessage?.from === "user" && payload.conversationId !== activeId) {
    next.unread = (row.unread || 0) + 1; // server without counts: as before
  }
  const updatedAt = payload.updatedAt ?? payload.lastMessage?.createdAt;
  if (updatedAt) next.updatedAt = updatedAt;
  if (hasRev(payload)) next.rev = payload.rev;

  const rows = state.rows.slice();
  rows[index] = next;
  return { ...state, rows: updatedAt ? sorted(rows) : rows };
}

// Would a row updated at `updatedAt` sit inside what the page has loaded?
export function withinLoaded(state, updatedAt) {
  if (!state.hasMore || !state.rows.length) return true;
  const last = state.rows[state.rows.length - 1];
  return new Date(updatedAt).getTime() >= new Date(last.updatedAt).getTime();
}

// Where "Load more" continues from.
export function cursorOf(state) {
  const last = state.rows[state.rows.length - 1];
  if (!last) return null;
  const at = new Date(last.updatedAt);
  if (Number.isNaN(at.getTime())) return null;
  return { updatedAt: at.toISOString(), id: last.conversationId };
}

// ─── Thread messages ─────────────────────────────────────────────────────────

// Commit order: `seq` when both have one (the server's write order), else the
// time. Messages from before `seq` are older than any that have one.
export function byCommitOrder(a, b) {
  const sa = typeof a.seq === "number";
  const sb = typeof b.seq === "number";
  if (sa && sb && a.seq !== b.seq) return a.seq - b.seq;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

// A history reply merged into what is on screen: messages that arrived live
// meanwhile stay, an optimistic reply is replaced by its stored copy.
export function mergeHistory(current, history) {
  const byId = new Map();
  for (const m of history) byId.set(m._id, m);
  const stored = new Set(history.map((m) => m.clientMessageId).filter(Boolean));
  for (const m of current) {
    if (byId.has(m._id)) continue;
    if (m.clientMessageId && stored.has(m.clientMessageId)) continue;
    byId.set(m._id, m);
  }
  return [...byId.values()].sort(byCommitOrder);
}

// The newest message the agent has on screen, as a read receipt.
export function readReceiptFor(conversationId, messages) {
  let latest = null;
  for (const m of messages) {
    if (typeof m.seq === "number" && m._id && /^[0-9a-f]{24}$/i.test(m._id) && (!latest || m.seq > latest.seq)) latest = m;
  }
  return latest ? { conversationId, seq: latest.seq, messageId: latest._id } : { conversationId };
}
