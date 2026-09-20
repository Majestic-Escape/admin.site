"use client";
// Users — every registered account, paged / sorted / filtered by the server
// (GET /guests/ with the list contract). Table state lives in the URL.
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ArrowUpRight, Download, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { USER } from "@/lib/query-presets";
import { queryKeys } from "@/lib/query-keys";
import { adminFetch } from "@/lib/admin-api";
import { formatDate, formatINR } from "@/lib/format";
import { DataTableEmpty, DataTableError, DataTablePagination, DataTableToolbar, SortableHeader, useListParams } from "@/components/data-table";
import { GuestTableSkeleton } from "./guest-table-skeleton";
import EditUserNameDialog from "@/components/edit-user-name-dialog";

const FILTER_DEFAULTS = { q: "", status: "all", role: "all", segment: "all" };
// The "segment" filter maps onto the server thresholds.
const SEGMENTS = {
  all: {},
  spenders: { minSpent: 10000 },
  frequent: { minBookings: 3 },
  rated: { minRating: 4.5 },
};
const COLUMNS = 8;

export default function UsersPage() {
  const list = useListParams({ defaultSort: "updatedAt:desc", filters: FILTER_DEFAULTS });
  const { q, status, role, segment } = list.filters;
  const [editingUser, setEditingUser] = React.useState(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const params = React.useMemo(() => {
    const p = new URLSearchParams(list.apiParams);
    if (q) p.set("search", q);
    if (status !== "all") p.set("status", status);
    if (role !== "all") p.set("isHost", role === "hosts" ? "true" : "false");
    for (const [k, v] of Object.entries(SEGMENTS[segment] || {})) p.set(k, String(v));
    return p.toString();
  }, [list.apiParams, q, status, role, segment]);

  const { data: result, isPending: loading, isPlaceholderData, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.adminGuests(params),
    queryFn: async () => {
      const r = await adminFetch(`/guests/?${params}`);
      return { data: Array.isArray(r?.data) ? r.data : [], total: r?.total ?? 0 };
    },
    ...USER,
    placeholderData: keepPreviousData,
  });
  const guests = result?.data ?? [];
  const total = result?.total ?? 0;

  // Patch the cached page in place (the row flips immediately after the
  // server confirmed), then let every users query refetch.
  const setGuests = (updater) => {
    queryClient.setQueryData(queryKeys.adminGuests(params), (prev) => (prev ? { ...prev, data: updater(prev.data ?? []) } : prev));
    queryClient.invalidateQueries({ queryKey: queryKeys.adminGuestsAll });
  };
  const handleNameSaved = (data) => {
    if (!data || !editingUser) return;
    setGuests((prev) => prev.map((g) => (g._id === editingUser._id ? { ...g, firstName: data.firstName, lastName: data.lastName } : g)));
  };
  const handleToggleBan = async (guestId, currentStatus) => {
    try {
      await adminFetch(`/guests/ban/${guestId}`, { method: "PATCH", body: JSON.stringify({ active: currentStatus }) });
      setGuests((prev) => prev.map((g) => (g._id === guestId ? { ...g, status: { ...g.status, active: !currentStatus } } : g)));
      toast.success(currentStatus ? "User banned" : "User unbanned");
    } catch (err) {
      toast.error(err?.message || "Failed to update the user's status.");
    }
  };

  const handleExportCSV = () => {
    if (guests.length === 0) return toast.error("No rows to export");
    const headers = ["ID", "First Name", "Last Name", "Email", "Phone Number", "Host", "Bookings", "Total Spent", "Rating", "Last Booking", "Status"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = guests.map((g) => [g._id, g.firstName, g.lastName, g.email, g.phoneNumber, g.isHost ? "yes" : "no", g.totalBookings ?? 0, g.totalSpent ?? 0, g.averageRating ? Number(g.averageRating).toFixed(1) : "", g.lastBookingAt ? formatDate(g.lastBookingAt) : "", g.status?.active ? "Active" : "Banned"].map(esc).join(","));
    const blob = new Blob([[headers.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `users-page-${list.page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fullName = (g) => [g.firstName, g.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex-1 space-y-4 bg-gray-200 px-8 pt-8 pb-24 md:p-8 md:pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight font-bricolage">Users</h2>
        <div className="flex items-center space-x-2">
          <Button className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bricolage font-bold" data-testid="stat-total-users">
                  {loading ? "…" : total}
                </div>
                {list.isDirty ? <p className="text-xs text-muted-foreground">matching the current filters</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hosts on this page</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{guests.filter((g) => g.isHost).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bookings on this page</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{guests.reduce((n, g) => n + (g.totalBookings || 0), 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Spend on this page</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatINR(guests.reduce((n, g) => n + (g.totalSpent || 0), 0))}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="col-span-4">
            <CardHeader>
              <CardTitle className="text-absoluteDark font-bricolage font-medium text-xl">User List</CardTitle>
              <CardDescription>Every registered account — hosts are marked. Edit a name with the pencil, review KYC, or ban.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTableToolbar search={q} onSearchChange={(v) => list.setFilter("q", v)} searchPlaceholder="Search by name, e-mail or phone" onReset={list.reset} isDirty={list.isDirty} resultCount={loading ? undefined : total}>
                <Select value={status} onValueChange={(v) => list.setFilter("status", v)}>
                  <SelectTrigger className="h-9 w-full md:w-[150px]" aria-label="Status" data-testid="filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={role} onValueChange={(v) => list.setFilter("role", v)}>
                  <SelectTrigger className="h-9 w-full md:w-[150px]" aria-label="Role" data-testid="filter-role">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hosts and guests</SelectItem>
                    <SelectItem value="hosts">Hosts only</SelectItem>
                    <SelectItem value="guests">Guests only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={segment} onValueChange={(v) => list.setFilter("segment", v)}>
                  <SelectTrigger className="h-9 w-full md:w-[190px]" aria-label="Segment" data-testid="filter-segment">
                    <SelectValue placeholder="Segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="spenders">High spenders (₹10,000+)</SelectItem>
                    <SelectItem value="frequent">Frequent bookers (3+)</SelectItem>
                    <SelectItem value="rated">High ratings (4.5+)</SelectItem>
                  </SelectContent>
                </Select>
              </DataTableToolbar>
              {loading ? (
                <GuestTableSkeleton />
              ) : (
                <>
                  <Table data-testid="users-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <SortableHeader label="User" sortKey="firstName" sort={list} onSort={list.toggleSort} />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Email" sortKey="email" sort={list} onSort={list.toggleSort} />
                        </TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>
                          <SortableHeader label="Total Spent" sortKey="totalSpent" sort={list} onSort={list.toggleSort} />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Rating" sortKey="averageRating" sort={list} onSort={list.toggleSort} />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Last Booking" sortKey="lastBookingAt" sort={list} onSort={list.toggleSort} />
                        </TableHead>
                        <TableHead>
                          <SortableHeader label="Status" sortKey="status" sort={list} onSort={list.toggleSort} />
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={isPlaceholderData || isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
                      {error ? (
                        <DataTableError colSpan={COLUMNS} error={error} onRetry={refetch} />
                      ) : guests.length === 0 ? (
                        <DataTableEmpty colSpan={COLUMNS} message="No users match these filters." onReset={list.isDirty ? list.reset : undefined} />
                      ) : (
                        guests.map((guest) => (
                          <TableRow key={guest._id} data-testid="user-row">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span data-testid="user-name">{fullName(guest)}</span>
                                {guest.isHost ? <span className="inline-flex items-center rounded-full bg-primaryGreen/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primaryGreen">Host</span> : null}
                              </div>
                            </TableCell>
                            <TableCell>{guest.email}</TableCell>
                            <TableCell>{guest.phoneNumber || "—"}</TableCell>
                            <TableCell>
                              {formatINR(guest.totalSpent || 0)}
                              {guest.totalBookings ? <span className="ml-1 text-xs text-muted-foreground">({guest.totalBookings} {guest.totalBookings === 1 ? "booking" : "bookings"})</span> : null}
                            </TableCell>
                            <TableCell>{guest.totalReviews ? `${Number(guest.averageRating || 0).toFixed(1)} ★ (${guest.totalReviews})` : "—"}</TableCell>
                            <TableCell>{guest.lastBookingAt ? formatDate(guest.lastBookingAt) : "No bookings"}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${guest.status?.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {guest.status?.active ? "Active" : "Banned"}
                              </span>
                            </TableCell>
                            <TableCell className="flex">
                              <Button size="icon" variant="outline" className="mr-2 h-8 w-8 bg-white" aria-label={`Edit name of ${fullName(guest)}`} title="Edit name" onClick={() => setEditingUser(guest)}>
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button size="sm" variant="outline" className="mr-2 bg-white text-yellow-500 border border-yellow-500" onClick={() => router.push(`/dashboard/kyc-details/${guest._id}?firstName=${encodeURIComponent(guest.firstName ?? "")}&lastName=${encodeURIComponent(guest.lastName ?? "")}`)}>
                                KYC
                              </Button>
                              <Button size="sm" variant="outline" className="ml-2 bg-white text-red-500 border border-red-500" onClick={() => handleToggleBan(guest._id, guest.status?.active)}>
                                {guest.status?.active ? "Ban" : "Unban"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <DataTablePagination page={list.page} pageSize={list.pageSize} total={total} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} isLoading={isFetching} itemLabel="users" />
                </>
              )}
              <EditUserNameDialog user={editingUser} open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }} onSaved={handleNameSaved} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
