"use client";
// List state (page, page size, sort, filters) kept in the URL so a reload,
// the back button or a shared link restore the same table. One hook for
// every dashboard table; the API contract it targets is server.me
// utils/listQuery.js (?page=&limit=&sort=key:dir + the page's own filters).
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const PAGE_SIZES = [10, 20, 50, 100];

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * @param {object} options
 * @param {string} options.defaultSort   "key:asc" | "key:desc"
 * @param {number} [options.defaultPageSize=10]
 * @param {Record<string,string>} [options.filters]  filter name → default value
 */
export function useListParams({ defaultSort, defaultPageSize = 10, filters = {} } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(() => {
    const page = toInt(searchParams.get("page"), 1);
    const requestedSize = toInt(searchParams.get("size"), defaultPageSize);
    const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : defaultPageSize;
    const rawSort = searchParams.get("sort") || defaultSort || "";
    const [sortKey = "", sortDir = "asc"] = rawSort.split(":");
    const values = {};
    for (const [name, fallback] of Object.entries(filters)) {
      const v = searchParams.get(name);
      values[name] = v === null ? fallback : v;
    }
    return { page, pageSize, sort: rawSort, sortKey, sortDir: sortDir === "desc" ? "desc" : "asc", filters: values };
  }, [searchParams, defaultSort, defaultPageSize, filters]);

  const write = useCallback(
    (patch, { resetPage = false } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        const isDefault =
          v === undefined ||
          v === null ||
          v === "" ||
          (k === "page" && Number(v) === 1) ||
          (k === "size" && Number(v) === defaultPageSize) ||
          (k === "sort" && v === defaultSort) ||
          (Object.prototype.hasOwnProperty.call(filters, k) && v === filters[k]);
        if (isDefault) next.delete(k);
        else next.set(k, String(v));
      }
      if (resetPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, defaultPageSize, defaultSort, filters],
  );

  const setPage = useCallback((page) => write({ page }), [write]);
  const setPageSize = useCallback((size) => write({ size }, { resetPage: true }), [write]);
  const setSort = useCallback((key, dir) => write({ sort: key ? `${key}:${dir || "asc"}` : "" }, { resetPage: true }), [write]);
  // Sorting a column: none → asc → desc → none (back to the default).
  const toggleSort = useCallback(
    (key) => {
      if (state.sortKey !== key) return setSort(key, "asc");
      if (state.sortDir === "asc") return setSort(key, "desc");
      return setSort("");
    },
    [state.sortKey, state.sortDir, setSort],
  );
  const setFilter = useCallback((name, value) => write({ [name]: value }, { resetPage: true }), [write]);
  const setFilters = useCallback((patch) => write(patch, { resetPage: true }), [write]);
  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);
  const isDirty = useMemo(() => {
    if (state.page !== 1 || state.pageSize !== defaultPageSize || (state.sort && state.sort !== defaultSort)) return true;
    return Object.entries(filters).some(([k, fallback]) => state.filters[k] !== fallback);
  }, [state, defaultPageSize, defaultSort, filters]);

  // The query string the server contract expects.
  const apiParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(state.page));
    p.set("limit", String(state.pageSize));
    if (state.sort) p.set("sort", state.sort);
    return p;
  }, [state.page, state.pageSize, state.sort]);

  return { ...state, apiParams, setPage, setPageSize, setSort, toggleSort, setFilter, setFilters, reset, isDirty };
}
