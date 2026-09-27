// Support inbox state rules (run: npm run check:support-inbox).
//
// AD-MERGE-01..03 and the paging / thread rules in src/lib/support-inbox.js:
// highest `rev` wins, names come from the newest snapshot, system lines never
// become the preview, refreshing the first page keeps older loaded pages,
// history merges keep live messages, read receipts name a real message.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(here), "..");
const inbox = await import(pathToFileURL(path.join(root, "src/lib/support-inbox.js")).href);
const {
  EMPTY_INBOX,
  applyFirstPage,
  applyNextPage,
  applyNewConversation,
  applyUpdate,
  cursorOf,
  withinLoaded,
  mergeHistory,
  readReceiptFor,
} = inbox;

let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) passed++;
  else failed.push(`${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
};

const id = (n) => n.toString(16).padStart(24, "0");
const at = (min) => new Date(Date.UTC(2026, 8, 27, 10, min)).toISOString();
const row = (n, over = {}) => ({
  conversationId: id(n),
  userId: id(1000 + n),
  userFirstName: "Test",
  userLastName: "",
  userName: "Test",
  status: "pending",
  lastMessage: { _id: id(5000 + n), from: "user", text: `hi ${n}`, createdAt: at(n) },
  unread: 1,
  updatedAt: at(n),
  assignedAdminId: null,
  assignedAdminName: null,
  rating: null,
  resolvedAt: null,
  rev: 1,
  ...over,
});
const ids = (s) => s.rows.map((r) => parseInt(r.conversationId, 16)).join(",");

console.log("rev ordering (AD-MERGE-02/03)");
{
  let s = applyFirstPage(EMPTY_INBOX, { conversations: [row(1), row(2)], hasMore: false, openCount: 2 });
  check("first page sorted newest first", ids(s) === "2,1", ids(s));
  s = applyUpdate(s, { conversationId: id(1), rev: 5, status: "open", unread: 0, assignedAdminName: "Admin Support", updatedAt: at(30) });
  check("a newer event applies absolute state and moves the row up", ids(s) === "1,2" && s.rows[0].status === "open" && s.rows[0].unread === 0, s.rows[0]);
  const stale = applyUpdate(s, { conversationId: id(1), rev: 4, status: "pending", unread: 3, updatedAt: at(31) });
  check("an older event is ignored", stale === s);
  const dup = applyUpdate(s, { conversationId: id(1), rev: 5, unread: 9 });
  check("a repeated event is ignored", dup === s);
  const snap = applyNextPage(s, { conversations: [row(1, { rev: 3, userFirstName: "Shrirajj", userLastName: "Naik", userName: "Shrirajj Naik" })], hasMore: false });
  const r1 = snap.rows.find((r) => r.conversationId === id(1));
  check(
    "a stale snapshot keeps the newer state but takes the new names",
    r1.status === "open" && r1.rev === 5 && r1.userName === "Shrirajj Naik" && r1.userLastName === "Naik",
    r1
  );
  const none = applyUpdate(s, { conversationId: id(1), rev: 6 });
  check("an event never counts unread up on its own", none.rows[0].unread === 0, none.rows[0]);
}

console.log("names (AD-MERGE-01)");
{
  let s = applyFirstPage(EMPTY_INBOX, { conversations: [row(1)], hasMore: false });
  s = applyFirstPage(s, { conversations: [row(1, { userFirstName: "Shrirajj", userLastName: "Naik", userName: "Shrirajj Naik" })], hasMore: false });
  check("a rename with the same updatedAt and rev shows the new name", s.rows[0].userName === "Shrirajj Naik", s.rows[0]);
}

console.log("previews (G-A2)");
{
  let s = applyFirstPage(EMPTY_INBOX, { conversations: [row(1)], hasMore: false });
  s = applyUpdate(s, { conversationId: id(1), rev: 2, status: "resolved", lastMessage: { _id: id(9), from: "system", kind: "resolve", text: "Resolved by Ops", createdAt: at(40) }, updatedAt: at(40) });
  check("a system line doesn't replace the preview", s.rows[0].lastMessage.text === "hi 1" && s.rows[0].status === "resolved", s.rows[0]);
  s = applyUpdate(s, { conversationId: id(1), rev: 3, lastMessage: { _id: id(10), from: "admin", text: "on it", createdAt: at(41) } });
  check("an agent's message does", s.rows[0].lastMessage.text === "on it");
  const fresh = applyNewConversation(EMPTY_INBOX, row(4, { lastMessage: { _id: id(11), from: "system", kind: "auto", text: "auto", createdAt: at(4) } }));
  check("a snapshot row with a system preview shows none", fresh.rows[0].lastMessage === null, fresh.rows[0]);
}

console.log("paging (G-A1)");
{
  const page1 = Array.from({ length: 50 }, (_, i) => row(200 - i));
  let s = applyFirstPage(EMPTY_INBOX, { conversations: page1, hasMore: true, openCount: 120 });
  check("hasMore and the open count come from the page", s.hasMore === true && s.openCount === 120);
  const cur = cursorOf(s);
  check("the cursor is the last row", cur?.id === id(151) && cur?.updatedAt === at(151), cur);
  s = applyNextPage(s, { conversations: Array.from({ length: 10 }, (_, i) => row(150 - i)), hasMore: false, openCount: 119 });
  check("the next page appends and ends the list", s.rows.length === 60 && s.hasMore === false && s.openCount === 119);
  // A refresh of page 1 (a conversation beyond it got a message and moved up)
  const moved = row(145, { updatedAt: at(300), rev: 2 });
  const refreshed = applyFirstPage(s, { conversations: [moved, ...page1.slice(0, 49)], hasMore: true, openCount: 119 });
  check(
    "refreshing page 1 keeps the older pages already loaded, without duplicates",
    refreshed.rows.length === 60 && new Set(refreshed.rows.map((r) => r.conversationId)).size === 60 && refreshed.rows[0].conversationId === id(145),
    refreshed.rows.length
  );
  check("…and keeps knowing the end was reached", refreshed.hasMore === false);
  const gone = applyFirstPage(applyFirstPage(EMPTY_INBOX, { conversations: [row(3), row(2), row(1)], hasMore: false }), { conversations: [row(3), row(1)], hasMore: false });
  check("a row missing from a complete first page is dropped (deleted)", ids(gone) === "3,1", ids(gone));
  check("an updated row inside the loaded range is 'within'", withinLoaded(s, at(160)) === true);
  const partial = applyFirstPage(EMPTY_INBOX, { conversations: page1, hasMore: true });
  check("…and one older than everything loaded is not", withinLoaded(partial, at(100)) === false);
  check("unknown rows are left alone", applyUpdate(partial, { conversationId: id(9999), rev: 1, status: "open" }) === partial);
  const tie = applyFirstPage(EMPTY_INBOX, { conversations: [row(1, { updatedAt: at(5) }), row(2, { updatedAt: at(5) })], hasMore: false });
  check("equal updatedAt: higher id first (the server's tiebreak)", ids(tie) === "2,1", ids(tie));
}

console.log("servers without rev");
{
  const legacyRow = { ...row(1), rev: undefined };
  let s = applyFirstPage(EMPTY_INBOX, { conversations: [legacyRow] });
  check("no hasMore from an old server → no Load more", s.hasMore === false);
  s = applyUpdate(s, { conversationId: id(1), lastMessage: { _id: id(20), from: "user", text: "again", createdAt: at(50) } }, null);
  check("an old server's customer message counts up, as before", s.rows[0].unread === 2 && s.rows[0].lastMessage.text === "again", s.rows[0]);
  const open = applyUpdate(s, { conversationId: id(1), lastMessage: { _id: id(21), from: "user", text: "x", createdAt: at(51) } }, id(1));
  check("…but not for the conversation being read", open.rows[0].unread === 2, open.rows[0]);
}

console.log("thread");
{
  const live = [
    { _id: id(1), from: "user", text: "a", createdAt: at(1), seq: 1 },
    { _id: "c_opt", clientMessageId: "c_opt", from: "admin", text: "reply", createdAt: at(9) },
    { _id: id(7), from: "user", text: "late", createdAt: at(8), seq: 7 },
  ];
  const history = [
    { _id: id(0), from: "user", text: "legacy", createdAt: at(0) },
    { _id: id(1), from: "user", text: "a", createdAt: at(1), seq: 1 },
    { _id: id(6), from: "admin", text: "reply", clientMessageId: "c_opt", createdAt: at(9), seq: 6 },
  ];
  const merged = mergeHistory(live, history);
  check(
    "history keeps live messages, replaces the optimistic reply, commit order",
    merged.map((m) => m.text).join("|") === "legacy|a|reply|late",
    merged.map((m) => m.text)
  );
  const receipt = readReceiptFor(id(3), merged);
  check("the read receipt names the newest stored message", receipt.seq === 7 && receipt.messageId === id(7), receipt);
  check("a thread without positions reads all (legacy)", JSON.stringify(readReceiptFor(id(3), [history[0]])) === JSON.stringify({ conversationId: id(3) }));
}

console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length) {
  for (const f of failed) console.error(`  - ${f}`);
  process.exit(1);
}
