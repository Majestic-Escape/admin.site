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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function GuestsPage() {
  const [selectedFilters, setSelectedFilters] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [deleteGuestId, setDeleteGuestId] = React.useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [guests, setGuests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [skip, setSkip] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const getData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      fetch(
        `${API_URL}/guests/?search=${searchTerm}&limit=${rowsPerPage}&skip=${rowsPerPage * skip}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data}`,
            "Content-Type": "application/json",
          },
        }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch guests data");
          }
          return response.json();
        })
        .then((result) => {
          console.log("what", result);
          setGuests(result.data);
          setCount(result.total);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  };
  React.useEffect(() => {
    getData();
  }, [searchTerm, rowsPerPage, skip]);

  const handleConfirmDelete = async () => {
    if (deleteGuestId) {
      const getLocalData = await localStorage.getItem("token");
      const data = JSON.parse(getLocalData);
      if (data) {
        try {
          const result = await fetch(
            `${API_URL}/guests/delete/${deleteGuestId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${data}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (!result.ok) {
            throw new Error("Failed to delete guests ");
          }

          setGuests((prev) =>
            prev.filter((guest) => guest._id != deleteGuestId)
          );
          toast.success("Successfully deleted the guest");
        } catch (err) {
          console.log(err);
          alert("Failed to delete guest.");
        }
        setShowDeleteDialog(false);
        setDeleteGuestId(null);
      }
    }
  };

  const handleDeleteClick = (guestId) => {
    setDeleteGuestId(guestId);
    setShowDeleteDialog(true);
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
              : guest
          )
        );
      } catch (err) {
        console.log(err);
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
        guest.status.active ? "Active" : "Inactive",
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

  if (error) return <p>Error: {error}</p>;

  return (
    <div className="flex-1 space-y-4 bg-gray-200 p-8 pt-6">
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
                    setSkip(Number(0));
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
                    <TableBody>
                      {guests.map((guest) => (
                        <TableRow key={guest._id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center w-full">
                              <span className="w-32">
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
                                guest.status.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {guest.status.active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {/* <Button
                              onClick={() => handleDeleteClick(guest._id)}
                              variant="danger"
                            >
                              Delete
                            </Button> */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 bg-white text-red-500 border border-red-500"
                              onClick={() =>
                                handleToggleBan(guest._id, guest.status.active)
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
                          if (skip >= 2) {
                            setSkip((prev) => prev - 1);
                          }
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
              <Dialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm guest deletion</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this guest? This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirmDelete}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
