"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpRight,
  Download,
  Filter,
  Pencil,
  Search,
  SortAsc,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { GuestTableSkeleton } from "./guest-table-skeleton";
import EditUserNameDialog from "@/components/edit-user-name-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { USER } from "@/lib/query-presets";
import { queryKeys } from "@/lib/query-keys";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function GuestsPage() {
  const [selectedFilters, setSelectedFilters] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  // Rename (Batch A2): the row being edited; null closes the dialog.
  const [editingUser, setEditingUser] = React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [skip, setSkip] = React.useState(0);
  const router = useRouter();
  // Cached per search/page (USER preset); page changes keep the previous
  // rows on screen. Rename/ban update the cached row after the 2xx and
  // invalidate adminGuestsAll.
  const queryClient = useQueryClient();
  const filters = { searchTerm, rowsPerPage, skip };
  const {
    data: guestsResult,
    isPending: loading,
    isPlaceholderData,
    isFetching,
    error,
  } = useQuery({
    queryKey: queryKeys.adminGuests(filters),
    queryFn: async () => {
      let token = null;
      try {
        const raw = localStorage.getItem("token");
        token = raw ? JSON.parse(raw) : null;
      } catch {
        token = null;
      }
      if (!token) return { data: [], total: 0 };
      const response = await fetch(
        `${API_URL}/guests/?search=${searchTerm}&limit=${rowsPerPage}&skip=${rowsPerPage * skip}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch guests data");
      }
      const result = await response.json();
      return {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
      };
    },
    ...USER,
    placeholderData: keepPreviousData,
  });
  const guests = guestsResult?.data ?? [];
  const count = guestsResult?.total ?? 0;
  // Patch the cached page in place (the row disappears / flips immediately
  // after the server confirmed), then let every guests query refetch.
  const setGuests = (updater) => {
    queryClient.setQueryData(queryKeys.adminGuests(filters), (prev) =>
      prev ? { ...prev, data: updater(prev.data ?? []) } : prev,
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.adminGuestsAll });
  };

  // After a rename resolved (or a 409 told us someone else renamed first):
  // patch the row with the server's current values, then refetch.
  const handleNameSaved = (data) => {
    if (!data || !editingUser) return;
    setGuests((prev) =>
      prev.map((guest) =>
        guest._id === editingUser._id
          ? { ...guest, firstName: data.firstName, lastName: data.lastName }
          : guest,
      ),
    );
  };

  const handleToggleBan = async (guestId, currentStatus) => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      try {
        const result = await fetch(`${API_URL}/guests/ban/${guestId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${data}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ active: currentStatus }),
        });
        if (!result.ok) {
          throw new Error("Failed to ban guests ");
        }

        setGuests((prev) =>
          prev.map((guest) =>
            guest._id === guestId
              ? {
                  ...guest,
                  status: { ...guest.status, active: !currentStatus },
                }
              : guest,
          ),
        );
      } catch (err) {
        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log(err);
        }
        alert("Failed to update guest status.");
      }
    }
  };

  // Filter guests based on search term
  // const filteredGuests = guests.filter(
  //   (guest) =>
  //     guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     guest.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     guest.email.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  // Paginate the filtered guests
  // const paginatedGuests = guests.slice(
  //   (currentPage - 1) * rowsPerPage,
  //   currentPage * rowsPerPage
  // );
  // const totalPages = Math.ceil(guests.length / rowsPerPage);

  // Function to export CSV
  const handleExportCSV = () => {
    if (guests.length === 0) {
      toast.error("No guest data to export");
      // alert("No guest data to export.");
      return;
    }
    // Define CSV headers
    const headers = [
      "ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone Number",
      "Status",
    ];
    // Map guest data to CSV rows
    const csvRows = [];
    csvRows.push(headers.join(","));

    guests.forEach((guest) => {
      const row = [
        guest.id,
        guest.firstName,
        guest.lastName,
        guest.email,
        guest.phoneNumber,
        guest.status?.active ? "Active" : "Inactive",
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "guests.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="flex-1 space-y-4 bg-gray-200 px-8 pt-8 pb-24 md:p-8 md:pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight font-bricolage">
          Guests
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            onClick={handleExportCSV}
          >
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
                <CardTitle className="text-sm font-medium">
                  Total Guests
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bricolage font-bold">
                  {guests?.length > 0 ? guests?.length : 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed KYC
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Guest Bookings
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average revenue per guest
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          <Card className="col-span-4">
            <CardHeader>
              <CardTitle className="text-absoluteDark font-bricolage font-medium text-xl">
                Guest List
              </CardTitle>
              <CardDescription>
                Every registered account — hosts are marked. Edit a name with
                the pencil, review KYC, or ban.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 md:flex items-center gap-4">
                <div className="pb-4 md:pb-0 relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests"
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="pb-4 md:pb-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="ml-auto w-full">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuCheckboxItem
                        checked={selectedFilters.includes("highSpenders")}
                        onCheckedChange={() => {
                          setSelectedFilters((prev) =>
                            prev.includes("highSpenders")
                              ? prev.filter((item) => item !== "highSpenders")
                              : [...prev, "highSpenders"],
                          );
                        }}
                      >
                        High Spenders
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={selectedFilters.includes("frequentBookers")}
                        onCheckedChange={() => {
                          setSelectedFilters((prev) =>
                            prev.includes("frequentBookers")
                              ? prev.filter(
                                  (item) => item !== "frequentBookers",
                                )
                              : [...prev, "frequentBookers"],
                          );
                        }}
                      >
                        Frequent Bookers
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={selectedFilters.includes("highRatings")}
                        onCheckedChange={() => {
                          setSelectedFilters((prev) =>
                            prev.includes("highRatings")
                              ? prev.filter((item) => item !== "highRatings")
                              : [...prev, "highRatings"],
                          );
                        }}
                      >
                        High Ratings
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setSkip(Number(0));
                  }}
                >
                  <SelectTrigger className="w-full  md:w-[180px]">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 rows per page</SelectItem>
                    <SelectItem value="20">20 rows per page</SelectItem>
                    <SelectItem value="50">50 rows per page</SelectItem>
                    <SelectItem value="100">100 rows per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loading ? (
                <GuestTableSkeleton />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Guest</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="p-0 hover:bg-transparent"
                          >
                            <span>Total Spent</span>
                            <SortAsc className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="p-0 hover:bg-transparent"
                          >
                            <span>Rating</span>
                            <SortAsc className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>Last Booking</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody
                      className={
                        isPlaceholderData || isFetching
                          ? "opacity-60 transition-opacity"
                          : "transition-opacity"
                      }
                    >
                      {guests.map((guest) => (
                        <TableRow key={guest._id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 w-full">
                              <span className="w-32">
                                {[guest.firstName, guest.lastName]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                              {guest.isHost ? (
                                <span className="inline-flex items-center rounded-full bg-primaryGreen/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primaryGreen">
                                  Host
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{guest.email}</TableCell>
                          <TableCell>{guest.phoneNumber}</TableCell>
                          <TableCell>0 INR</TableCell>
                          <TableCell>NA</TableCell>
                          <TableCell>No bookings</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                guest.status?.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {guest.status?.active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="flex">
                            <Button
                              size="icon"
                              variant="outline"
                              className="mr-2 h-8 w-8 bg-white"
                              aria-label={`Edit name of ${[guest.firstName, guest.lastName].filter(Boolean).join(" ")}`}
                              title="Edit name"
                              onClick={() => setEditingUser(guest)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mr-2 bg-white text-yellow-500 border border-yellow-500"
                              onClick={() =>
                                router.push(
                                  `/dashboard/kyc-details/${guest._id}?firstName=${encodeURIComponent(guest.firstName ?? "")}&lastName=${encodeURIComponent(guest.lastName ?? "")}`,
                                )
                              }
                            >
                              KYC
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 bg-white text-red-500 border border-red-500"
                              onClick={() =>
                                handleToggleBan(guest._id, guest.status?.active)
                              }
                            >
                              {guest.status?.active ? "Ban" : "Unban"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex items-center justify-between">
                    <small>
                      Showing {skip == 0 ? 0 : skip * rowsPerPage} to{" "}
                      {skip == 0
                        ? rowsPerPage
                        : skip * rowsPerPage + rowsPerPage >= count &&
                            skip * rowsPerPage - rowsPerPage <= count
                          ? count
                          : skip * rowsPerPage + rowsPerPage}{" "}
                      of {count} entries
                    </small>
                    <div className="flex gap-2">
                      <Button
                        className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                        onClick={() => {
                          // setCurrentPage((prev) => Math.max(prev - 1, 1))
                          // if (skip >= 2) {
                          //   setSkip((prev) => prev - 1);
                          // }
                          setSkip((prev) => Math.max(prev - 1, 0));
                        }}
                        disabled={skip == 0 ? true : false}
                      >
                        Previous
                      </Button>
                      <Button
                        className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                        onClick={() =>
                          // setCurrentPage((prev) =>
                          //   Math.min(prev + 1, totalPages)
                          // )
                          {
                            setSkip((prev) => prev + 1);
                          }
                        }
                        disabled={
                          count >= skip * rowsPerPage - rowsPerPage &&
                          count <= skip * rowsPerPage + rowsPerPage
                            ? true
                            : false
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <EditUserNameDialog
                user={editingUser}
                open={!!editingUser}
                onOpenChange={(open) => {
                  if (!open) setEditingUser(null);
                }}
                onSaved={handleNameSaved}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
