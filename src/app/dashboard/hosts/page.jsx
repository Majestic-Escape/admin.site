"use client";
import * as React from "react";

// The guests endpoints require a Bearer token; this page used to call them
// without one (always 401) and stored the response envelope instead of the
// array (a render crash once it ever succeeded). Mirrors guests/page.jsx.
const readToken = () => {
  try {
    const raw = localStorage.getItem("token");
    if (!raw) return null;
    return raw.startsWith('"') ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
};
const authHeaders = () => {
  const token = readToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuestTableSkeleton } from "./guest-table-skeleton";
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function HostsPage() {
  const [selectedFilters, setSelectedFilters] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [guests, setHosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  React.useEffect(() => {
    fetch(`${API_URL}/guests/`, { headers: authHeaders() })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch guests data");
        }
        return response.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data;
        setHosts(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // The account-delete action was removed (Batch A2): the backend has no
  // cascading user deletion and this page is not linked from the sidebar.

  const handleToggleBan = async (guestId, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/guests/ban/${guestId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update ban status");
      setHosts((prev) =>
        prev.map((guest) =>
          guest.id === guestId
            ? { ...guest, status: { ...guest.status, active: !currentStatus } }
            : guest
        )
      );
    } catch (err) {
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log(err);
      }
      alert("Failed to update guest status.");
    }
  };

  const filteredHosts = guests.filter(
    (guest) =>
      guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedHosts = filteredHosts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredHosts.length / rowsPerPage);

  if (error) return <p>Error: {error}</p>;

  return (
    <div className="flex-1 space-y-4 bg-gray-200 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight font-bricolage">
          Hosts
        </h2>
        <div className="flex items-center space-x-2">
          <Button className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md">
            <Download className=" mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid  gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Hosts
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bricolage font-bold">
                  {guests?.length > 0 ? 28 : 0}
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
                  Active Host Bookings
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
                Host List
              </CardTitle>
              <CardDescription>
                Manage and view details of all guests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests"
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
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
                            : [...prev, "highSpenders"]
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
                            ? prev.filter((item) => item !== "frequentBookers")
                            : [...prev, "frequentBookers"]
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
                            : [...prev, "highRatings"]
                        );
                      }}
                    >
                      High Ratings
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
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
                        <TableHead className="w-[100px]">Host</TableHead>
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
                    <TableBody>
                      {paginatedHosts.map((guest) => (
                        <TableRow key={guest.id}>
                          <TableCell className="font-medium">
                            <div className="flex  items-center w-full">
                              <span className="w-32">
                                {" "}
                                {guest.firstName + " " + guest.lastName}
                              </span>
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
                                guest.status.active === true
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {guest.status.active === true
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 bg-white text-red-500 border border-red-500"
                              onClick={() =>
                                handleToggleBan(guest.id, guest.status.active)
                              }
                            >
                              {guest.status.active ? "Ban" : "Unban"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex items-center justify-between">
                    <small>
                      Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                      {Math.min(
                        currentPage * rowsPerPage,
                        filteredHosts.length
                      )}{" "}
                      of {filteredHosts.length} entries
                    </small>
                    <div className="flex gap-2">
                      <Button
                        className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
