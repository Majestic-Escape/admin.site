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
import { properties } from "../../../../lib/property-type";
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function HostProfilePage() {
  const [propertys, setPropertys] = React.useState([]);
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
  const [selectPropertyType, setselectPropertyType] = React.useState("");
  const [propertyTypeSearch, setPropertyTypeSearch] = React.useState("");
  const [selectPlaceType, setSelectPlaceType] = React.useState("");
  const searchParams = useSearchParams();
  const hostId = searchParams.get("hostId");
  // Simulate a 2 second loading delay to show the skeleton UI.
  const getDate = (item) => {
    const d = new Date(item);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  };
  const fetchData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    const from = date?.from ? getDate(date.from) : null;
    const to = date?.to ? getDate(date.to) : null;

    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/properties/active/filter/${hostId}?search=${searchTerm}&placeType=${selectPlaceType}&propertyType=${selectPropertyType}`,
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
        setPropertys(final);
      } catch (err) {
        console.error(err);
      }
    }
  };
  console.log(propertys);
  const fetchUserProfile = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/guests/guest-by-id?userId=${hostId}`,
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
  }, [searchTerm, selectPlaceType, hostId, selectPropertyType]);

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
            No Profile found.
          </h3>
          <p className="mt-2 text-sm text-gray-500">Try again later.</p>
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
                +91-{profile?.phoneNumber}
                {/* <a className="text-blue-600 underline">Learn more</a> */}
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <ProfileItem label="Address" />
            <ProfileItem
              label={profile?.address?.city + ", " + profile?.address?.state}
            />
            <ProfileItem label="Email" />
            <ProfileItem label={profile?.email} />
            <ProfileItem label="Date of Birth" />
            <ProfileItem
              label={fmt.format(new Date(profile?.dob.split("T")[0]))}
            />
          </div>
        </div>
      </div>
    );
  };

  const onGetExporProduct = async (title, worksheetname) => {
    try {
      setLoading(true);

      // Check if the action result contains data and if it's an array
      if (propertys && Array.isArray(propertys)) {
        const dataToExport = propertys.map((pro) => ({
          id: pro?._id,
          property_title: pro?.title,
          city: pro?.address?.city,
          state: pro?.address?.state,
          pincode: pro?.address?.pincode,
          price_per_night: pro?.basePrice,
          property_type: pro?.propertyType,
          place_type: pro?.placeType,
        }));

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
  const renderBookingTable = (profile) => {
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

    if (!loading && propertys?.length == 0) {
      return (
        <div className="py-10 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            No Property found.
          </h3>
          <p className="mt-2 text-sm text-gray-500">Change the filter.</p>
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
            <TableHead className="w-[180px]">Title</TableHead>
            <TableHead className="w-[180px]">Location</TableHead>
            <TableHead className="w-[180px]">Pincode</TableHead>

            <TableHead>Base Price</TableHead>
            <TableHead>
              <Button variant="ghost" className="p-0 hover:bg-transparent">
                <span>Type</span>
                <SortAsc className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Place</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {propertys.map((item) => (
            <TableRow key={item._id}>
              <TableCell className="font-medium">
                <span title={item?.title}>{checkLength(item?.title)}</span>
              </TableCell>
              <TableCell>
                <span title={item?.address?.city + " " + item?.address?.state}>
                  {checkLength(
                    item?.address?.city + ", " + item?.address?.state
                  )}
                </span>
              </TableCell>
              <TableCell>{item?.address?.pincode}</TableCell>

              <TableCell>₹ {item?.basePrice}</TableCell>
              <TableCell>
                {item?.propertyType[0].toUpperCase() +
                  item?.propertyType?.slice(1)}
              </TableCell>
              <TableCell>
                <StatusPill status={item?.placeType} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Mobile-only select (valid HTML)

  return (
    <div
      className={
        loading
          ? "h-screen space-y-4 p-8 pt-6 bg-gray-200 min-h-0"
          : "md:h-screen lg:h-auto space-y-4 p-8 pt-6 bg-gray-200 min-h-0"
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
        <div className="flex lg:w-[300px]">
          <Label htmlFor="search" className="sr-only">
            Search reservations
          </Label>
          <Input
            id="search"
            className="bg-white w-full"
            placeholder="Search by title, location, pincode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="md:pt-4 lg:pt-0 md:flex  items-center">
          <div className="w-full">
            <Select
              value={selectPropertyType}
              onValueChange={setselectPropertyType}
            >
              <SelectTrigger className="lg:w-[300px] box-border bg-white">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent className="w-full md:max-h-[200px] max-w-[calc(100vw-2rem)] bg-white ">
                <div className="overflow-x-scroll">
                  <div className="py-2 px-1">
                    <Input
                      placeholder="Search Property Type..."
                      value={propertyTypeSearch}
                      onChange={(e) => setPropertyTypeSearch(e.target.value)}
                      className="w-full"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>

                  <SelectItem value="all" selected>
                    All
                  </SelectItem>
                  {properties
                    .filter((item) =>
                      item?.label
                        ?.toLowerCase()
                        ?.includes(propertyTypeSearch.toLowerCase())
                    )
                    .map((item) => (
                      <SelectItem value={item?.route}>{item?.label}</SelectItem>
                    ))}
                </div>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 md:pl-3 md:pt-0 ">
            <Select value={selectPlaceType} onValueChange={setSelectPlaceType}>
              <SelectTrigger className="lg:w-[200px]  box-border bg-white">
                <SelectValue placeholder="Place Type" />
              </SelectTrigger>
              <SelectContent className="w-full max-w-[calc(100vw-2rem)] bg-white ">
                <div className="overflow-x-scroll">
                  <div className="py-2 px-1"></div>

                  <SelectItem value="all" selected>
                    All
                  </SelectItem>

                  <SelectItem value="entire">Entire</SelectItem>
                  <SelectItem value="room">Room</SelectItem>
                </div>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full mt-4 lg:mt-0 md:ml-3 md:mt-0 bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            onClick={() =>
              onGetExporProduct(
                `${guestProfile?.firstName}_${guestProfile?.lastName}_Property_List`,
                `Property_List`
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="all"
        className="space-y-4"
        onValueChange={setActiveTab}
      >
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Properties</CardTitle>
              <CardDescription>
                Manage and view details of all properties
              </CardDescription>
            </CardHeader>
            <CardContent>{renderBookingTable(propertys)}</CardContent>
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
            <CardContent>{renderBookingTable(propertys)}</CardContent>
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
            <CardContent>{renderBookingTable(propertys)}</CardContent>
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
            <CardContent>{renderBookingTable(propertys)}</CardContent>
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
            <CardContent>{renderBookingTable(propertys)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
