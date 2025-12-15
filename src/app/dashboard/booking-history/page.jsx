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
import * as XLSX from "xlsx";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon,
  Star,
  Download,
  Filter,
  MoreHorizontal,
  Search,
  SortAsc,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, addMonths, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function BookingsPage() {
  const [bookings, setBookings] = React.useState([]);
  const router = useRouter();
  const [date, setDate] = React.useState({
    from: addMonths(new Date(), -1),
    to: new Date(),
  });
  const [selectedBookings, setSelectedBookings] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [userEmail, setUserEmail] = React.useState();
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [hostSearch, setHostSearch] = React.useState("");
  const [bookingId, setBookingId] = React.useState(null);
  const [selectHost, setSelectHost] = React.useState("all");
  const [hostEmail, setHostEmail] = React.useState([]);
  // Simulate a 2 second loading delay to show the skeleton UI.
  const getDate = (item) => {
    const d = new Date(item);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  };
  const fetchHostEmails = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    if (data) {
      try {
        const response = await fetch(`${API_URL}/booking/hostEmails`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data}`,
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();
        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log("sssss", result);
        }
        const final = await result.data;
        setHostEmail(final);
      } catch (err) {
        console.error(err);
      }
    }
  };
  React.useEffect(() => {
    fetchHostEmails();
  }, []);
  const fetchData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    const from = date?.from ? new Date(date.from).toLocaleDateString() : null;
    const to = date?.to ? new Date(date.to).toLocaleDateString() : null;
    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log("here", from);
    }
    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/booking/users-by-host?hostId=${selectHost}&search=${searchTerm}&from=${from}&to=${to}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${data}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.status === 401) {
          // Token expired or missing
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          router.push("/"); // redirect to login
          return;
        }
        const result = await response.json();
        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log("data ext", result);
        }
        const final = await result.data;
        setBookings(final);
      } catch (err) {
        console.error(err);
      }
    }
  };
  React.useEffect(() => {
    fetchData();
  }, [searchTerm, selectHost, date]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const onGetExporProduct = async (title, worksheetname) => {
    try {
      setLoading(true);

      // Check if the action result contains data and if it's an array
      if (bookings && Array.isArray(bookings)) {
        const dataToExport = bookings.map((pro) => ({
          id: pro?.userId?._id,
          full_name: pro?.userId?.firstName + " " + pro?.userId?.lastName,
          total_amount_spend: pro?.totalAmountSpent,
          booking_count: pro?.totalBookings,
          review_count: pro?.totalReviews,
          average_rating: pro?.userId?.averageRating,
        }));
        // Create Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils?.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${worksheetname}`);
        // Save the workbook as an Excel file
        XLSX.writeFile(workbook, `${title}.xlsx`);

        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log(`Exported data to ${title}.xlsx`);
        }
        setLoading(false);
      } else {
        setLoading(false);

        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log("#==================Export Error");
        }
      }
    } catch (error) {
      setLoading(false);

      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("#==================Export Error", error.message);
      }
    }
  };
  const renderBookingTable = (bookings) => {
    if (loading) {
      // Skeleton UI for the table structure
      return (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      );
    }

    if (!loading && !bookings) {
      return (
        <div className="py-10 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            No bookings found.
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Looks like you haven't received any bookings yet.
          </p>
        </div>
      );
    }
    const StatusPill = ({ status }) => {
      const getStatusColor = (status) => {
        switch (status) {
          case "confirmed":
            return "bg-green-100 text-green-800";
          case "rejected":
            return "bg-red-100 text-red-800";
          case "cancelled":
            return "bg-orange-100 text-orange-800";

          default:
            return "bg-gray-100 text-gray-800";
        }
      };

      return (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}
        >
          {status === "processing"
            ? "Pending"
            : status?.charAt(0).toUpperCase() + status?.slice(1)}
        </span>
      );
    };
    const handleModal = (booking) => {
      setRejectDialogOpen(true);
      setBookingId(booking._id);
    };

    function checkLength(value) {
      if (value?.length > 15) {
        return value.substring(0, 15) + "…";
      }
      return value;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Guest</TableHead>
            <TableHead className="w-[180px]">Kyc Status</TableHead>
            <TableHead className="w-[180px]">Total Amount</TableHead>
            <TableHead>Total Bookings</TableHead>
            <TableHead>Total Reviews</TableHead>
            <TableHead>
              <Button variant="ghost" className="p-0 hover:bg-transparent">
                <span>Rating</span>
                {/* <SortAsc className="ml-2 h-4 w-4" /> */}
              </Button>
            </TableHead>
            {/* <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking._id}>
              <TableCell className="font-medium">
                <span
                  title={
                    booking.userId?.firstName + " " + booking?.userId?.lastName
                  }
                  onClick={() =>
                    router.push(
                      `/dashboard/booking-history/user-profile?userId=${booking.userId._id}`
                    )
                  }
                  className="underline cursor-pointer"
                >
                  {checkLength(
                    booking.userId?.firstName + " " + booking?.userId?.lastName
                  )}
                </span>
              </TableCell>
              <TableCell>
                {booking?.userId?.kyc?.isVerified ? "Verified" : "Pending"}
              </TableCell>
              <TableCell>
                <span title={booking?.totalAmountSpent}>
                  ₹ {booking?.totalAmountSpent}
                </span>
              </TableCell>
              <TableCell>{booking?.totalBookings}</TableCell>
              <TableCell>{booking?.totalReviews}</TableCell>
              <TableCell className="flex">
                {" "}
                <Star className="h-4 w-4 text-yellow-400 ml-1" />{" "}
                <span className="pl-2">{booking?.userId?.averageRating}</span>
              </TableCell>

              {/* <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/dashboard/booking-details?booking=${booking._id}`
                        )
                      }
                    >
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem>Modify booking</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        sendConfirmationToUser(booking.id, userEmail);
                      }}
                    >
                      Send message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {booking.status != "rejected" &&
                    booking.status != "cancelled" ? (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          handleModal(booking);
                        }}
                      >
                        Cancel booking
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  const sendData = async () => {
    await sendRejectionToUser();
  };
  const exportCheckinDate = date.from.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const arrayCheckinDate = exportCheckinDate.split("/");
  const exportCheckoutDate = date.to.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const arrayCheckoutDate = exportCheckoutDate.split("/");
  return (
    <div
      className={
        loading
          ? "flex-1 h-screen space-y-4 p-8 pt-6 bg-gray-200 min-h-screen"
          : "flex-1 space-y-4 p-8 pt-6 bg-gray-200 min-h-screen"
      }
    >
      <div className="lg:flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold font-bricolage tracking-tight">
          Bookings
        </h2>
        <div className="md:flex  items-center md:space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full lg:w-[280px] justify-start text-left font-normal ${
                  !date && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button
            className="mt-4 w-full md:mt-0 bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            onClick={() =>
              onGetExporProduct(
                `Guest_Booking_History_${arrayCheckinDate[0]}${arrayCheckinDate[1]}${arrayCheckinDate[2]}_${arrayCheckoutDate[0]}${arrayCheckoutDate[1]}${arrayCheckoutDate[2]}`,
                "GuestBookingHistoryExport"
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the booking &quot; &quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={sendData}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex">
        <Label htmlFor="search" className="sr-only">
          Search reservations
        </Label>
        <div className="w-full">
          <Input
            id="search"
            className="bg-white"
            placeholder="Search by guest name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="pl-2">
          <Select value={selectHost} onValueChange={setSelectHost}>
            <SelectTrigger className="w-full sm:w-[250px] md:w-[380px] box-border bg-white">
              <SelectValue placeholder="Host Email" />
            </SelectTrigger>
            <SelectContent className="w-full sm:w-[250px] md:w-[380px] max-w-[calc(100vw-2rem)] bg-white ">
              <div className="overflow-x-scroll">
                <div className="py-2 px-1">
                  <Input
                    placeholder="Search host email..."
                    value={hostSearch}
                    onChange={(e) => setHostSearch(e.target.value)}
                    className="w-full"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>

                <SelectItem value="all" selected>
                  All
                </SelectItem>
                {hostEmail
                  ?.filter((item) =>
                    item?.hostEmail
                      ?.toLowerCase()
                      .includes(hostSearch?.toLowerCase())
                  )
                  .map((item) => (
                    <SelectItem value={item?.host}>
                      {item?.hostEmail}
                    </SelectItem>
                  ))}
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Tabs
        defaultValue="all"
        className="space-y-4"
        onValueChange={setActiveTab}
      >
        {/* <TabsList>
          <TabsTrigger value="all">All Bookings</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList> */}
        {/* <div className="flex items-center space-x-2">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground bg-white rounded-md" />
              <Input
                placeholder="Search bookings"
                className="pl-8 bg-white rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem>Check-in Date</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>
                Check-out Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Total Amount</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Property Type</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select>
            <SelectTrigger className="w-[180px] bg-white rounded-md">
              <SelectValue className="bg-white" placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirm">Confirm Selected</SelectItem>
              <SelectItem value="cancel">Cancel Selected</SelectItem>
              <SelectItem value="refund">Refund Selected</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            onClick={() => handleBulkAction("apply")}
          >
            Apply
          </Button>
        </div> */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                Manage and view details of all bookings
              </CardDescription>
            </CardHeader>
            <CardContent>{renderBookingTable(bookings)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="confirmed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confirmed Bookings</CardTitle>
              <CardDescription>
                View and manage all confirmed bookings
              </CardDescription>
            </CardHeader>
            <CardContent>{renderBookingTable(bookings)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Bookings</CardTitle>
              <CardDescription>
                Review and process pending bookings
              </CardDescription>
            </CardHeader>
            <CardContent>{renderBookingTable(bookings)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Bookings</CardTitle>
              <CardDescription>
                View details of completed bookings
              </CardDescription>
            </CardHeader>
            <CardContent>{renderBookingTable(bookings)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cancelled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Bookings</CardTitle>
              <CardDescription>
                Review cancelled bookings and manage refunds
              </CardDescription>
            </CardHeader>
            <CardContent>{renderBookingTable(bookings)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
