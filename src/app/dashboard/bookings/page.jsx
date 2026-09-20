"use client";

import * as React from "react";
import { apiDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as XLSX from "xlsx";
import { X } from "lucide-react";
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
import { properties } from "../../../utils/property-type";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsListAdmin,
  TabsTriggerAdmin,
} from "@/components/ui/tabs";
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
import { addDays, addMonths, differenceInDays, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { LIVE } from "@/lib/query-presets";
import { queryKeys } from "@/lib/query-keys";

// Added booking entry based on your provided details.
// const bookings = [
//   {
//     id: "booking_1",
//     guest: "Divya Yash",
//     property: "Listing for Goa",
//     checkIn: "24 March 2025",
//     checkOut: "28 March 2025",
//     total: "₹1,37,025",
//     status: "Confirmed",
//   },
// ];

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function BookingsPage() {
  const router = useRouter();
  const [date, setDate] = React.useState({
    from: new Date(),
    to: addMonths(new Date(), 1),
  });
  const [modalDate, setModalDate] = React.useState({
    from: addMonths(new Date(), -1),
    to: new Date(),
  });
  const [errors, setErrors] = React.useState({});
  const [guestCount, setGuestCount] = React.useState("");
  const [adultCount, setAdultCount] = React.useState("");
  const [childrenCount, setChildrenCount] = React.useState("");
  const [propertyType, setPropertyType] = React.useState("");
  const [propertyTypeSearch, setPropertyTypeSearch] = React.useState("");
  const [modifyData, setModifyData] = React.useState({});
  const [selectedBookings, setSelectedBookings] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  // `loading` is only the export spinner now; the table's own loading state
  // comes from the query below (it used to be a fake 2 s timer).
  const [loading, setLoading] = React.useState(false);
  const [propertyList, setPropertyList] = React.useState([]);
  const [userEmail, setUserEmail] = React.useState();
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = React.useState(false);
  const [bookingId, setBookingId] = React.useState(null);
  const [catchData, setCatchData] = React.useState();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [skip, setSkip] = React.useState(0);
  const [mssg, setMssg] = React.useState(false);
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("cuy", catchData);
  }
  const submitModifyData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    const from = modalDate?.from
      ? apiDate(new Date(modalDate.from))
      : null;
    const to = modalDate?.to
      ? apiDate(new Date(modalDate.to))
      : null;
    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log("here", from);
    }
    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/booking/admin-modify?guest=${guestCount}&hostEmail=${catchData?.hostId?.email}&userEmail=${catchData?.userId?.email}&bookingId=${bookingId}&property=${propertyType}&adults=${adultCount}&children=${childrenCount}&from=${from}&to=${to}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (response.status === 401) {
          // Token expired or missing
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          router.push("/"); // redirect to login
          return;
        }
        toast.success("You have modified the booking");
        await fetchData(bookingId);
        propertyType("");
        propertyTypeSearch("");
        guestCount("");
      } catch (error) {
        console.error(error);
      }
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!guestCount || Number(guestCount) < 1) {
      newErrors.guestCount = "Guest count must be at least 1";
    }
    if (Number(guestCount) > Number(catchData?.propertyId?.guests)) {
      newErrors.guestCount = `Guest count is max ${catchData?.propertyId?.guests}`;
    }

    if (!adultCount || Number(adultCount) < 1) {
      newErrors.adultCount = "At least 1 adult required";
    }

    if (Number(adultCount) + Number(childrenCount) !== Number(guestCount)) {
      newErrors.totalMismatch = "Adult + Children must be equal to Guest count";
    }
    if (
      differenceInDays(new Date(modalDate.to), new Date(modalDate.from)) !=
      Number(catchData.nights)
    ) {
      newErrors.dateMismatch = "Date difference is more than original booking";
      toast.error(`Date difference is more than original booking`);
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // ✅ If no errors, proceed with submission

      submitModifyData();

      setModifyDialogOpen(false);
    }
  };

  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("sup", catchData);
  }
  // Bookings are LIVE data: cached rows paint instantly and always
  // revalidate; filter/page changes keep the previous rows (dimmed) instead
  // of a skeleton. Modify/cancel invalidate adminBookingsAll after the 2xx.
  const queryClient = useQueryClient();
  const from = date?.from ? apiDate(date.from) : null;
  const to = date?.to ? apiDate(date.to) : null;
  const filters = { searchTerm, activeTab, from, to, rowsPerPage, skip };
  const {
    data: bookingsResult,
    isPending: bookingsPending,
    isPlaceholderData,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.adminBookings(filters),
    queryFn: async () => {
      let token = null;
      try {
        const raw = localStorage.getItem("token");
        token = raw ? JSON.parse(raw) : null;
      } catch {
        token = null;
      }
      if (!token) return { data: [], total: 0, error: null };
      const response = await fetch(
        `${API_URL}/booking/admin/analytics-filter?search=${searchTerm}&status=${activeTab}&from=${from}&to=${to}&limit=${rowsPerPage}&skip=${rowsPerPage * skip}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const result = await response.json().catch(() => ({}));
      if (result?.error === "toDate") {
        return { data: [], total: 0, error: "toDate" };
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings (status: ${response.status})`);
      }
      return {
        data: Array.isArray(result?.data) ? result.data : [],
        total: result?.total ?? 0,
        error: null,
      };
    },
    ...LIVE,
    placeholderData: keepPreviousData,
  });
  const bookings = bookingsResult?.data ?? [];
  const count = bookingsResult?.total ?? 0;
  React.useEffect(() => {
    if (bookingsResult?.error === "toDate") {
      toast.error("Cannot select same date twice");
      setMssg(true);
    } else if (bookingsResult) {
      setMssg(false);
    }
  }, [bookingsResult]);
  const fetchData = async (changedBookingId) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.adminBookingsAll,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminAttention });
    if (changedBookingId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookingById(changedBookingId),
      });
    }
  };

  // const fetchProperty = async (hostId) => {
  //   const getLocalData = await localStorage.getItem("token");
  //   const data = JSON.parse(getLocalData);

  //   if (data) {
  //     try {
  //       const response = await fetch(
  //         `${API_URL}/properties/id-and-name/${hostId}`,
  //         {
  //           method: "GET",
  //           headers: {
  //             Authorization: `Bearer ${data}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );
  //       if (response.status === 401) {
  //         // Token expired or missing
  //         localStorage.removeItem("token");
  //         localStorage.removeItem("userId");
  //         router.push("/"); // redirect to login
  //         return;
  //       }
  //       const result = await response.json();
  //       setPropertyList(result.data);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   }
  // };

  // React.useEffect(() => {
  //   fetchProperty();
  // }, []);
  // React.useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const bookingData = await fetch(`${API_URL}/booking/`, {
  //         method: "GET",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //       });
  //       const result = await bookingData.json();
  //       for (let i in result.data) {
  //         setUserEmail(result.data[i].userId.email);
  //         const checkInDate = new Date(result.data[i].checkIn);
  //         const checkOutDate = new Date(result.data[i].checkOut);
  //         const monthNames = [
  //           "January",
  //           "February",
  //           "March",
  //           "April",
  //           "May",
  //           "June",
  //           "July",
  //           "August",
  //           "September",
  //           "October",
  //           "November",
  //           "December",
  //         ];

  //         const checkInYear = checkInDate.getFullYear();
  //         const checkOutYear = checkOutDate.getFullYear();
  //         const checkInMonth = checkInDate.getMonth();
  //         const checkOutMonth = checkOutDate.getMonth();
  //         const checkInMonthName = monthNames[checkInMonth]; // This will return "March"
  //         const checkOutMonthName = monthNames[checkOutMonth];
  //         const checkInDay = checkInDate.getDate();
  //         const checkOutDay = checkOutDate.getDate();
  //         const data = {
  //           checkIn: checkInDay + " " + checkInMonthName + " " + checkInYear,
  //           checkOut:
  //             checkOutDay + " " + checkOutMonthName + " " + checkOutYear,
  //           guest:
  //             result.data[i].hostId.firstName +
  //             " " +
  //             result.data[i].hostId.lastName,
  //           id: result.data[i]._id,
  //           property: result.data[i].propertyId.title,
  //           status: result.data[i].status,
  //           total: `₹ ${result.data[i].price}`,
  //         };

  //         bookings.push(data);
  //       }
  //       setBookings(bookings);
  //       return result;
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // const filteredBookings = bookings.filter(
  //   (booking) =>
  //     (booking.guest.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       booking.property.toLowerCase().includes(searchTerm.toLowerCase())) &&
  //     (activeTab === "all" ||
  //       booking.status.toLowerCase() === activeTab.toLowerCase())
  // );

  const toggleBookingSelection = (id) => {
    setSelectedBookings((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const handleBulkAction = (action) => {
    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log(`Performing ${action} on bookings:`, selectedBookings);
    }

    // Implement bulk action logic here
  };
  // const sendConfirmationToUser = async (bookingId, userEmail) => {
  //   try {
  //     const response = await fetch(`${API_URL}/booking/host/confirm`, {
  //       method: "PATCH",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         bookingId: bookingId,
  //         userEmail: userEmail,
  //       }),
  //     });
  //     // renderBookingTable();
  //     return response;
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("hsss", propertyType);
  }
  const sendRejectionToUser = async () => {
    try {
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("nn", bookingId);
      }
      const getLocalData = await localStorage.getItem("token");
      const data = JSON.parse(getLocalData);

      const response = await fetch(`${API_URL}/booking/admin/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${data}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingId,
        }),
      });
      if (!response.status == 200) {
        return;
      }

      setBookingId(null);

      setRejectDialogOpen(false);
      toast.success("Booking successfully cancelled");
      fetchData(bookingId);
      return response;
    } catch (err) {
      console.error(err);
    }
  };

  // Operational queue (Batch S.1): paid bookings the server could not honour
  // as-is (dates taken during payment, or a captured amount that is not the
  // server quote). Money is never refunded automatically — someone here
  // decides. Same LIVE freshness as the table; cancelling via "Cancel" on
  // the row refunds and clears the item.
  const { data: attentionResult } = useQuery({
    queryKey: queryKeys.adminAttention,
    queryFn: async () => {
      let token = null;
      try {
        const raw = localStorage.getItem("token");
        token = raw ? JSON.parse(raw) : null;
      } catch {
        token = null;
      }
      if (!token) return [];
      const response = await fetch(`${API_URL}/booking/admin/attention`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Failed to fetch the attention queue (status: ${response.status})`);
      const result = await response.json().catch(() => ({}));
      return Array.isArray(result?.data) ? result.data : [];
    },
    ...LIVE,
  });
  const attentionItems = attentionResult ?? [];

  const renderBookingTable = (bookings) => {
    if (bookingsPending) {
      // Skeleton UI for the table structure
      return (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      );
    }

    // if (!loading && bookings?.length == 0 && date.from && date.to) {
    //   if (date.from.toLocaleDateString() != date.to.toLocaleDateString()) {
    //     return (
    //       <div className="py-10 text-center">
    //         <h3 className="text-lg font-medium text-gray-900">
    //           No bookings found.
    //         </h3>
    //         <p className="mt-2 text-sm text-gray-500">
    //           Looks like you haven't received any bookings yet.
    //         </p>
    //       </div>
    //     );
    //   }
    // }
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

    const handleModifyModal = (booking) => {
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("what sd is", booking?.hostId?._id);
      }
      // fetchProperty was removed long ago but this call stayed behind, so
      // "Modify" threw a ReferenceError and the dialog never opened.
      setModifyDialogOpen(true);

      setBookingId(booking._id);
      setCatchData(booking);

      setModalDate({
        from: new Date(booking.checkIn.split("T")[0]),
        to: new Date(booking.checkOut.split("T")[0]),
      });
    };
    function checkLength(value) {
      if (value?.length > 15) {
        return value.substring(0, 15) + "…";
      }
      return value;
    }
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                {/* <Checkbox
                checked={selectedBookings?.length === bookings?.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedBookings(bookings.map((b) => b.id));
                  } else {
                    setSelectedBookings([]);
                  }
                }}
              /> */}
              </TableHead>
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            className={
              isPlaceholderData || isFetching
                ? "opacity-60 transition-opacity"
                : "transition-opacity"
            }
          >
            {bookings?.map((booking) => (
              <TableRow key={booking._id}>
                <TableCell>
                  <Checkbox
                    checked={selectedBookings.includes(booking._id)}
                    onCheckedChange={() => toggleBookingSelection(booking._id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <span
                    title={
                      booking.userId.firstName + " " + booking?.userId?.lastName
                    }
                  >
                    {checkLength(
                      booking.userId.firstName +
                        " " +
                        booking?.userId?.lastName,
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
                <TableCell>{booking?.price}</TableCell>
                <TableCell>
                  <StatusPill status={booking?.status} />
                  {booking?.needsAttention && (
                    <span
                      className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                      title={
                        booking.needsAttention === "amount_mismatch"
                          ? "Captured amount differs from the server quote"
                          : "Dates were taken before the payment completed"
                      }
                    >
                      Needs attention
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
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
                            `/dashboard/booking-details?booking=${booking._id}`,
                          )
                        }
                      >
                        View details
                      </DropdownMenuItem>
                      {/* <DropdownMenuItem>Modify booking</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        sendConfirmationToUser(booking.id, userEmail);
                      }}
                    >
                      Send message
                    </DropdownMenuItem> */}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className=""
                        onClick={() => {
                          handleModifyModal(booking);
                        }}
                      >
                        Modify
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {bookings && bookings?.length === 0 && (
          <div className="text-center py-10 text-gray-500 font-medium">
            {date?.from && !date?.to && (
              <>Cannot select single date. Reselect the date range.</>
            )}

            {date?.from && date?.to && (
              <>No bookings found for the selected date range.</>
            )}
          </div>
        )}
        <div className="text-center py-10 text-gray-500 font-medium">
          {mssg ? <>Cannot select same date. Reselect the date range.</> : null}
        </div>
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
    );
  };
  const sendData = async () => {
    await sendRejectionToUser();
  };

  const onGetExporProduct = async (title, worksheetname) => {
    try {
      setLoading(true);

      // Check if the action result contains data and if it's an array
      if (bookings && Array.isArray(bookings)) {
        const dataToExport = bookings?.map((pro) => ({
          booking_id: pro?._id,
          user_name: pro?.hostId?.firstName + " " + pro?.hostId?.lastName,
          user_id: pro?.hostId?._id,
          checkin: pro?.checkIn.split("T")[0],
          checkout: pro?.checkOut.split("T")[0],
          amount_paid: pro?.price,
          nights: pro?.nights,
          guests: pro?.guests,
          adults: pro?.adults,
          children: pro?.children,
          status: pro?.status,
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
  const exportCheckinDate =
    date?.from &&
    date.from.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  const arrayCheckinDate = date?.from && exportCheckinDate.split("/");
  const exportCheckoutDate =
    date?.to &&
    date.to.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  const arrayCheckoutDate = date?.to && exportCheckoutDate.split("/");

  return (
    <div className="flex-1 space-y-4 px-8 pt-8 pb-24 md:p-8 md:pt-6 bg-gray-200 min-h-screen">
      {modifyDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Modify Booking
              </h2>
              <button
                onClick={() => setModifyDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form className="p-6 space-y-6" onSubmit={(e) => handleSubmit(e)}>
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-3">
                  Change Property
                </label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="w-full mb-4 box-border bg-white">
                    <SelectValue placeholder="Property Type" />
                  </SelectTrigger>
                  <SelectContent className="w-full md:max-h-[200px] max-w-[calc(100vw-2rem)] bg-white ">
                    <div className="overflow-x-scroll">
                      <div className="py-2 px-1">
                        <Input
                          placeholder="Search Property Type..."
                          value={propertyTypeSearch}
                          onChange={(e) =>
                            setPropertyTypeSearch(e.target.value)
                          }
                          className="w-full"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>

                      <SelectItem value="all" selected>
                        Default
                      </SelectItem>
                      {propertyList
                        .filter((item) =>
                          item?.title
                            ?.toLowerCase()
                            ?.includes(propertyTypeSearch.toLowerCase()),
                        )
                        .map((item) => (
                          <SelectItem value={item?._id}>
                            {item?.title}
                          </SelectItem>
                        ))}
                    </div>
                  </SelectContent>
                </Select>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Guest Count (max : {catchData?.propertyId?.guests})
                </label>
                <Input
                  id="guestCount"
                  className={`bg-white mb-1 border ${
                    errors.guestCount ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter guest count..."
                  value={guestCount}
                  type="number"
                  onChange={(e) => setGuestCount(e.target.value)}
                />
                {errors.guestCount && (
                  <p className="text-red-500 text-sm">{errors.guestCount}</p>
                )}
                <div className="py-4">
                  <div className={`flex  ${errors.totalMismatch}`}>
                    <div className="pr-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adult Count
                      </label>
                      <Input
                        id="adultCount"
                        className={`bg-white mb-1 border ${
                          errors.adultCount || errors.totalMismatch
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter adult count..."
                        value={adultCount}
                        type="number"
                        onChange={(e) => setAdultCount(e.target.value)}
                      />
                      {errors.adultCount && (
                        <p className="text-red-500 text-sm">
                          {errors.adultCount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Children Count
                      </label>
                      <Input
                        id="childrenCount"
                        className={`bg-white mb-1 border ${
                          errors.totalMismatch
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter children count..."
                        value={childrenCount}
                        type="number"
                        onChange={(e) => setChildrenCount(e.target.value)}
                      />
                    </div>
                  </div>
                  {errors.totalMismatch && (
                    <p className="text-red-500 text-sm">
                      {errors.totalMismatch}
                    </p>
                  )}
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Change Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${
                        !modalDate && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {modalDate?.from ? (
                        modalDate?.to ? (
                          <>
                            {format(new Date(modalDate?.from), "LLL dd, y")} -{" "}
                            {format(new Date(modalDate?.to), "LLL dd, y")}
                          </>
                        ) : (
                          format(modalDate?.from, "LLL dd, y")
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
                      defaultMonth={modalDate?.from}
                      selected={modalDate}
                      onSelect={setModalDate}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                  {errors.dateMismatch && (
                    <p className="text-red-500 text-sm">
                      {errors.dateMismatch}
                    </p>
                  )}
                </Popover>
                <div className="flex mt-8 justify-end">
                  <Button
                    type="submit"
                    className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {attentionItems.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-semibold">
            {attentionItems.length === 1
              ? "1 paid booking needs a decision"
              : `${attentionItems.length} paid bookings need a decision`}
          </p>
          <ul className="mt-2 space-y-1">
            {attentionItems.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() =>
                    router.push(`/dashboard/booking-details?booking=${item._id}`)
                  }
                >
                  {item?.propertyId?.title ?? "Listing"} —{" "}
                  {item?.userId?.firstName ?? "guest"},{" "}
                  {new Date(item?.checkIn).toDateString().slice(4)}
                </button>
                <span className="ml-2 text-red-700">
                  {item.needsAttention === "amount_mismatch"
                    ? `captured ${(item?.attentionDetails?.capturedPaise ?? 0) / 100} vs quote ${(item?.attentionDetails?.expectedPaise ?? 0) / 100}`
                    : "dates taken during payment"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-red-800">
            Cancel the booking from its row to refund the guest, or ask the team
            to resolve it with &quot;keep&quot; once the dates are free. Nothing
            is refunded automatically.
          </p>
        </div>
      )}
      <div className="md:flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold font-bricolage tracking-tight">
          Bookings
        </h2>
        <div className="md:flex items-center md:space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full md:w-[280px] justify-start text-left font-normal ${
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
                // onSelect={setDate}
                onSelect={(range) => {
                  // if (
                  //   range.to.toLocaleDateString() ==
                  //   range.from.toLocaleDateString()
                  // )
                  //   toast.error("Select two dates for date range");
                  if (!range?.from) {
                    // 👇 fallback when user deselects
                    toast.error("Cannot select date twice");
                    return;
                  }
                  if (!range?.to) {
                    toast.error("Select two dates for date range");
                  }

                  // Normal value
                  setDate(range);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button
            className="mt-4 md:mt-0 w-full bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            onClick={() => {
              if (!date?.from || !date?.to) {
                toast.error("Select both dates on calendar before export");
              } else {
                onGetExporProduct(
                  `All_Booking_${arrayCheckinDate[0]}${arrayCheckinDate[1]}${arrayCheckinDate[2]}_${arrayCheckoutDate[0]}${arrayCheckoutDate[1]}${arrayCheckoutDate[2]}`,
                  "All_BookingExport",
                );
              }
            }}
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

      <div className="flex-1">
        <Label htmlFor="search" className="sr-only">
          Search reservations
        </Label>
        <Input
          id="search"
          className="bg-white"
          placeholder="Search by guest name or property..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Tabs
        defaultValue="all"
        className="space-y-4"
        onValueChange={setActiveTab}
      >
        <TabsListAdmin className="flex flex-col md:flex-row">
          <TabsTriggerAdmin value="all">All</TabsTriggerAdmin>
          <TabsTriggerAdmin value="confirmed">Confirmed</TabsTriggerAdmin>
          <TabsTriggerAdmin value="pending">Pending</TabsTriggerAdmin>
          <TabsTriggerAdmin value="rejected">Rejected</TabsTriggerAdmin>
          <TabsTriggerAdmin value="cancelled">Cancelled</TabsTriggerAdmin>
        </TabsListAdmin>
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
