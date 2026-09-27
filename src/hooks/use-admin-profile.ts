"use client";
// The signed-in admin's own name and e-mail (header avatar, Settings → "Your
// name in Support Chat"). Keyed by a fingerprint of the stored session token
// so a different admin in the same tab gets a different cache entry; logout
// clears every ["adminProfile"] entry (contexts/AuthContext.tsx).
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMyProfile } from "@/lib/admin-api";
import { readAdminToken } from "@/lib/admin-token";
import { queryKeys } from "@/lib/query-keys";
import { USER } from "@/lib/query-presets";

// FNV-1a (32-bit) → 8 hex chars: stable, cheap, and keeps the token itself
// out of the cache key (React Query devtools print keys).
export function sessionFingerprint(token: string | null): string | null {
  if (!token) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Re-read when another tab signs in or out (the "storage" event).
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
const getIdentity = () => sessionFingerprint(readAdminToken());
const getServerIdentity = () => null;

export function useAdminIdentity(): string | null {
  return useSyncExternalStore(subscribe, getIdentity, getServerIdentity);
}

export function useAdminProfile() {
  const identity = useAdminIdentity();
  const query = useQuery({
    queryKey: queryKeys.adminProfile(identity),
    queryFn: fetchMyProfile,
    ...USER,
    staleTime: 5 * 60 * 1000,
    enabled: identity !== null,
  });
  return { ...query, identity };
}

// "AS" for Admin Support: first letters of first and last name; with no last
// name, the first letters of the first two words of the first name.
export function adminInitials(profile: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const first = String(profile?.firstName ?? "").trim();
  const last = String(profile?.lastName ?? "").trim();
  const letter = (word: string) => Array.from(word)[0] ?? "";
  if (first && last) return (letter(first) + letter(last)).toUpperCase();
  const words = first.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(letter).join("").toUpperCase();
}

export function adminFullName(profile: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return [profile?.firstName, profile?.lastName].map((v) => String(v ?? "").trim()).filter(Boolean).join(" ");
}
