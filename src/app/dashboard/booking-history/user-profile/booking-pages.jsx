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
import Image from "next/image";
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
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon,
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
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function BookingsPage() {
  const [bookings, setBookings] = React.useState([]);
  const router = useRouter();
  const [date, setDate] = React.useState({
    from: addMonths(new Date(), -1),
    to: new Date(),
  });
  const [guestProfile, setGuestProfile] = React.useState();
  const [selectedBookings, setSelectedBookings] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [userEmail, setUserEmail] = React.useState();
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [bookingId, setBookingId] = React.useState(null);

  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  // Simulate a 2 second loading delay to show the skeleton UI.
  const getDate = (item) => {
    const d = new Date(item);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  };
  const fetchData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    const from = date?.from ? new Date(date.from).toLocaleDateString() : "";
    const to = date?.to ? new Date(date.to).toLocaleDateString() : "";

    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/booking/admin/analytics-filter?search=${searchTerm}&status=${activeTab}&from=${from}&to=${to}`,
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

        const final = await result.data;
        setBookings(final);
      } catch (err) {
        console.error(err);
      }
    }
  };
  const fetchUserProfile = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/guests/guest-by-id?userId=${userId}`,
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

        setGuestProfile(result);
      } catch (err) {
        console.error(err);
      }
    }
  };
  React.useEffect(() => {
    fetchUserProfile();
  }, []);
  React.useEffect(() => {
    fetchData();
  }, [searchTerm, activeTab, date]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  function ProfileItem({ label }) {
    return (
      <div className="flex items-center justify-between border-b pb-3">
        <span className="text-gray-800">{label}</span>
      </div>
    );
  }
  const toggleBookingSelection = (id) => {
    setSelectedBookings((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };
  const renderUserProfile = (profile) => {
    if (loading) {
      // Skeleton UI for the table structure
      return (
        <div className=" space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      );
    }
    if (!loading && !profile) {
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
    const fmt = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return (
      <div className="p-8">
        <div className="bg-white flex flex-col items-center px-4 py-6 min-h-0 box-border w-full max-w-3xl mx-auto">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative overflow-hidden">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-black flex items-center justify-center text-white text-5xl font-bold">
                A
              </div>
              <button className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white shadow-md px-3 py-1 rounded-full text-sm">
                Add
              </button>
            </div>

            <div className="text-center max-w-md">
              <h1 className="text-2xl font-semibold">
                {profile?.firstName + " " + profile?.lastName}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Hosts and guests can see your profile ...{" "}
                <a className="text-blue-600 underline">Learn more</a>
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <ProfileItem label="Where I went to school" />
            <ProfileItem label="Where I’ve always wanted to go" />
            <ProfileItem label="My work" />
            <ProfileItem label="Pets" />
            <ProfileItem label="Decade I was born" />
            <ProfileItem label="My most useless skill" />
          </div>
        </div>
      </div>
    );
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
      <Table className="overflow-x-auto">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Guest</TableHead>
            <TableHead className="w-[180px]">Property</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>
              <Button variant="ghost" className="p-0 hover:bg-transparent">
                <span>Total</span>
                <SortAsc className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking._id}>
              <TableCell className="font-medium">
                <span
                  title={
                    booking.userId.firstName + " " + booking?.userId?.lastName
                  }
                >
                  {checkLength(
                    booking.userId.firstName + " " + booking?.userId?.lastName
                  )}
                </span>
              </TableCell>
              <TableCell>
                <span title={booking?.propertyId.title}>
                  {checkLength(booking?.propertyId.title)}
                </span>
              </TableCell>
              <TableCell>
                {new Date(booking?.checkIn).toDateString().slice(3)}
              </TableCell>
              <TableCell>
                {new Date(booking?.checkOut).toDateString().slice(3)}
              </TableCell>
              <TableCell>₹ {booking?.price}</TableCell>
              <TableCell>
                <StatusPill status={booking?.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Mobile-only select (valid HTML)
  const TabsSelectMobile = () => (
    <select
      className="block md:hidden w-full rounded border px-3 py-2 bg-white box-border"
      value={activeTab}
      onChange={(e) => setActiveTab(e.target.value)}
    >
      <option value="all">All</option>
      <option value="confirmed">Confirmed</option>
      <option value="pending">Pending</option>
      <option value="rejected">Rejected</option>
      <option value="cancelled">Cancelled</option>
    </select>
  );
  const onGetExporProduct = async (title, worksheetname) => {
    try {
      setLoading(true);

      // Check if the action result contains data and if it's an array
      if (bookings && Array.isArray(bookings)) {
        let dataToExport;
        if (activeTab != "all") {
          dataToExport = bookings
            .filter((item) => item.status == activeTab)
            .map((pro) => ({
              id: pro?._id,
              property_title: pro?.propertyId?.title,
              check_in: new Date(pro?.checkIn).toLocaleDateString(),
              check_out: new Date(pro?.checkOut).toLocaleDateString(),
              price: pro?.price,
              status: pro?.status,
            }));
        } else {
          dataToExport = bookings.map((pro) => ({
            id: pro?._id,
            property_title: pro?.propertyId?.title,
            check_in: new Date(pro?.checkIn).toLocaleDateString(),
            check_out: new Date(pro?.checkOut).toLocaleDateString(),
            price: pro?.price,
            status: pro?.status,
          }));
        }

        // Create Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils?.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${worksheetname}`);
        // Save the workbook as an Excel file
        XLSX.writeFile(workbook, `${title}.xlsx`);
        console.log(`Exported data to ${title}.xlsx`);
        setLoading(false);
      } else {
        setLoading(false);
        console.log("#==================Export Error");
      }
    } catch (error) {
      setLoading(false);
      console.log("#==================Export Error", error.message);
    }
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
  console.log("aaa");
  s;
  return (
    <div
      className={
        loading
          ? "h-screen space-y-4 p-8 pt-6 bg-gray-200 min-h-0"
          : " space-y-4 p-8 pt-6 bg-gray-200 min-h-0"
      }
    >
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold font-bricolage tracking-tight"></h2>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle></CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {renderUserProfile(guestProfile)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search + Calendar */}
      <div className="lg:flex flex-col md:flex-row md:items-center lg:space-x-4 space-y-3 md:space-y-0">
        <div className="flex-1">
          <Label htmlFor="search" className="sr-only">
            Search reservations
          </Label>
          <Input
            id="search"
            className="bg-white w-full"
            placeholder="Search by guest name or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="md:pt-4 lg:pt-0 md:flex items-center">
          <Popover className="">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full sm:w-full md:w-[280px] justify-start text-left font-normal ${
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
                numberOfMonths={1} // show 1 month on mobile
              />
            </PopoverContent>
          </Popover>
          <Button
            className=" mt-4 w-full md:ml-4 md:mt-0 bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            onClick={() =>
              onGetExporProduct(
                `${guestProfile?.firstName}_${guestProfile?.lastName}_Booking_History${arrayCheckinDate[0]}${arrayCheckinDate[1]}${arrayCheckinDate[2]}_${arrayCheckoutDate[0]}${arrayCheckoutDate[1]}${arrayCheckoutDate[2]}`,
                `Booking_History`
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="overflow-hidden sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full sm:w-[250px] md:w-[380px] box-border bg-white">
              <SelectValue placeholder="Host Email" />
            </SelectTrigger>
            <SelectContent className="w-full sm:w-[250px] md:w-[380px] max-w-[calc(100vw-2rem)] bg-white ">
              <div className="overflow-x-scroll">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="all"
        className="space-y-4"
        onValueChange={setActiveTab}
      >
        <div>
          <TabsList className="flex flex-wrap gap-2 hidden md:block">
            <TabsTrigger value="all">All </TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </div>

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
