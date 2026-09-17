// Tolerant JSON reads from localStorage / sessionStorage.
//
// Several root providers used to do `JSON.parse(localStorage.getItem(...))`
// straight from a mount effect. One corrupt value (a truncated write,
// "[object Object]", a legacy format) threw inside the provider, above every
// error boundary, and took every route down with "Application error".
// readJSON never throws: a bad value is dropped and the fallback returned.
//
// Not for the auth token — that is stored both JSON-encoded and bare by
// different code paths and is handled by lib/session.ts#readStoredToken.

type WebStorage = Pick<Storage, "getItem" | "removeItem">;

export function readJSON<T>(
  storage: WebStorage | null | undefined,
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  if (!storage) return fallback;
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw == null || raw === "") return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) {
      storage.removeItem(key);
      return fallback;
    }
    return parsed as T;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
    return fallback;
  }
}

export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Removes every key of `storage` that starts with `prefix`. Keys are collected
// first: removing while iterating over storage.length shifts the indexes.
export function removeByPrefix(storage: Storage | null | undefined, prefix: string) {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    for (const k of keys) storage.removeItem(k);
  } catch {
    // Storage can throw in private mode / when blocked.
  }
}
