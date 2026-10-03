"use client";
// Calendar sync (SyncGuard) — the operator's view: is the scheduler alive,
// which connected OTA calendars need a look, and why.
// Data: GET /calendarSync/admin/overview (admin only; no calendar URLs,
// feed tokens or guest data). One request, refreshed on focus and by the
// Refresh button — no polling.
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminFetch } from "@/lib/admin-api";
import { queryKeys } from "@/lib/query-keys";
import { LIVE } from "@/lib/query-presets";

const CHANNELS = { AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", AGODA: "Agoda", VRBO: "Vrbo", MAKE_MY_TRIP: "MakeMyTrip", GOIBIBO: "Goibibo", GENERIC_ICAL: "Other calendar" };
const CONNECTION_STATES = {
  BROKEN: { label: "Not working", tone: "bg-red-100 text-red-900 border-red-200" },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "bg-red-100 text-red-900 border-red-200" },
  STALE: { label: "Out of date", tone: "bg-amber-100 text-amber-900 border-amber-200" },
  DEGRADED: { label: "Retrying", tone: "bg-amber-100 text-amber-900 border-amber-200" },
  PENDING: { label: "Checking", tone: "bg-gray-100 text-gray-800 border-gray-200" },
  HEALTHY: { label: "Up to date", tone: "bg-green-100 text-green-900 border-green-200" },
};
const SCHEDULER_STATES = {
  HEALTHY: { label: "Running", tone: "bg-green-100 text-green-900 border-green-200" },
  DEGRADED: { label: "Running late", tone: "bg-amber-100 text-amber-900 border-amber-200" },
  STALE: { label: "Stopped", tone: "bg-red-100 text-red-900 border-red-200" },
};
const TILE_ORDER = ["HEALTHY", "DEGRADED", "STALE", "NEEDS_ATTENTION", "BROKEN", "PENDING"];

function ago(value) {
  if (!value) return "never";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return "—";
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

function Pill({ state, map }) {
  const s = map[state] || { label: state || "Unknown", tone: "bg-gray-100 text-gray-800 border-gray-200" };
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>;
}

function counts(p) {
  const parts = [];
  if (p.conflicts) parts.push(`${p.conflicts} overlap${p.conflicts === 1 ? "s" : ""} a Majestic booking`);
  if (p.overlaps) parts.push(`${p.overlaps} overlap${p.overlaps === 1 ? "s" : ""} another site's booking`);
  if (p.possibleOverlaps) parts.push(`${p.possibleOverlaps} possible ${p.possibleOverlaps === 1 ? "copy" : "copies"} of another site's booking`);
  if (p.missing) parts.push(`${p.missing} awaiting confirmation that ${p.missing === 1 ? "it was" : "they were"} cancelled`);
  return parts.join(" · ");
}

// The plain-language reason when there is one; the raw error code only as a
// fallback (the reason already says the same thing in words).
function detail(p) {
  if (p.reason) return p.reason;
  return p.lastErrorCode ? `Error: ${p.lastErrorCode.toLowerCase().replace(/_/g, " ")}` : "";
}

export default function CalendarSyncPage() {
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.calendarSyncOverview,
    queryFn: async () => (await adminFetch("/calendarSync/admin/overview")).data,
    ...LIVE,
  });
  const scheduler = data?.scheduler;
  const totals = data?.totals || {};
  const problems = data?.problems || [];

  return (
    <div className="flex-1 space-y-4 bg-gray-200 px-4 pt-8 pb-24 sm:px-8 md:p-8 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bricolage text-3xl font-semibold tracking-tight">Calendar sync</h2>
          <p className="text-sm text-muted-foreground">OTA calendars connected by hosts (Airbnb, Booking.com, Agoda, …) and the clock that keeps them current.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <Card role="alert">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm text-red-800">Couldn&apos;t load the calendar sync overview: {error.message}</p>
            <Button type="button" className="min-h-[44px] bg-primaryGreen text-white hover:bg-brightGreen" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card aria-busy={isPending}>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Sync clock</CardTitle>
            {scheduler ? <Pill state={scheduler.state} map={SCHEDULER_STATES} /> : null}
          </div>
          <CardDescription>Checks every connected calendar about every {scheduler?.expectedIntervalMinutes ?? 15} minutes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isPending ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : scheduler ? (
            <>
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Last run</dt>
                  <dd>
                    {ago(scheduler.lastSweepFinishedAt)}
                    {scheduler.lastTriggerSource ? ` (${scheduler.lastTriggerSource})` : ""}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Last full check</dt>
                  <dd>{ago(scheduler.lastFullSweepAt)}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Calendars waiting</dt>
                  <dd>
                    {scheduler.overdueConnections}
                    {scheduler.overdueConnections ? ` (oldest ${scheduler.oldestOverdueMinutes} min overdue)` : ""}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Connected calendars</dt>
                  <dd>{data.connections}</dd>
                </div>
              </dl>
              {scheduler.state !== "HEALTHY" ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                  Bookings stay safe — every booking re-checks the listing&apos;s calendars first — but bookings taken on one site reach the others more slowly. Check the GitHub clock workflow and the Vercel cron.
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {data ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Calendars by state">
          {TILE_ORDER.map((s) => (
            <li key={s} className="rounded-lg border bg-white p-3">
              <div className="text-2xl font-bold font-bricolage">{data.byHealth?.[s] ?? 0}</div>
              <Pill state={s} map={CONNECTION_STATES} />
            </li>
          ))}
        </ul>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Calendars that need a look</CardTitle>
          <CardDescription>
            {data && data.problemCount > problems.length ? `Showing the ${problems.length} most urgent of ${data.problemCount}.` : "Most urgent first. Dates of a calendar that is not working stay blocked."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !problems.length ? (
            <p className="text-sm text-muted-foreground">Every connected calendar is up to date.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>What&apos;s wrong</TableHead>
                      <TableHead>Last good check</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problems.map((p) => (
                      <TableRow key={p.connectionId}>
                        <TableCell className="max-w-[16rem]">
                          <Link className="break-words font-medium text-primaryGreen underline-offset-2 hover:underline" href={`/dashboard/view-property?property=${p.propertyId}`}>
                            {p.listingTitle || "Listing"}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{CHANNELS[p.channel] || p.channel}</TableCell>
                        <TableCell>
                          <Pill state={p.state} map={CONNECTION_STATES} />
                        </TableCell>
                        <TableCell className="min-w-[14rem] text-sm">
                          <div>{detail(p) || "—"}</div>
                          {counts(p) ? <div className="text-muted-foreground">{counts(p)}</div> : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{ago(p.lastSuccessAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="space-y-3 lg:hidden" aria-label="Calendars that need a look">
                {problems.map((p) => (
                  <li key={p.connectionId} className="rounded-lg border bg-white p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link className="min-w-0 break-words font-medium text-primaryGreen underline-offset-2 hover:underline" href={`/dashboard/view-property?property=${p.propertyId}`}>
                        {p.listingTitle || "Listing"}
                      </Link>
                      <Pill state={p.state} map={CONNECTION_STATES} />
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {CHANNELS[p.channel] || p.channel} · last good check {ago(p.lastSuccessAt)}
                    </p>
                    {detail(p) ? <p className="mt-1">{detail(p)}</p> : null}
                    {counts(p) ? <p className="mt-1 text-muted-foreground">{counts(p)}</p> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {data ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Protection so far</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Direct bookings stopped by an OTA booking</dt>
                <dd className="text-xl font-semibold">{totals.prebookPrevented ?? 0}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bookings paused because a calendar couldn&apos;t be checked</dt>
                <dd className="text-xl font-semibold">{totals.prebookRefused ?? 0}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Overlaps detected</dt>
                <dd className="text-xl font-semibold">{totals.conflicts ?? 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
