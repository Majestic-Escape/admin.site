"use client";

import React, { useState } from "react";
import { apiDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Star, MoreHorizontal } from "lucide-react";
import { useEffect } from "react";
import { addMonths, format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDate, parseFiniteNumber } from "@/lib/format";

const fullName = (person) =>
  `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim() || "—";
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
// Mock data for reviews
const reviews = [
  {
    id: 1,
    propertyName: "Sunset Villa",
    userName: "Alice Johnson",
    userAvatar: "/aditya.png",
    date: "2023-06-15",
    rating: 4.5,
    content: "Beautiful property with amazing views!",
    tags: ["Scenic", "Relaxing"],
  },
  {
    id: 2,
    propertyName: "Beach Bungalow",
    userName: "Bob Smith",
    userAvatar: "/aditya.png",
    date: "2023-06-14",
    rating: 3.8,
    content: "Nice place, but could be cleaner.",
    tags: ["Beach", "Needs Improvement"],
  },
  {
    id: 3,
    propertyName: "Mountain Retreat",
    userName: "Charlie Brown",
    userAvatar: "/aditya.png",
    date: "2023-06-13",
    rating: 5,
    content: "Absolutely stunning! Will definitely come back.",
    tags: ["Peaceful", "Nature"],
  },
  {
    id: 4,
    propertyName: "City Center Apartment",
    userName: "Diana Ross",
    userAvatar: "/aditya.png",
    date: "2023-06-12",
    rating: 4.2,
    content: "Great location, modern amenities.",
    tags: ["Central", "Modern"],
  },
  {
    id: 5,
    propertyName: "Riverside Cottage",
    userName: "Edward Norton",
    userAvatar: "/aditya.png",
    date: "2023-06-11",
    rating: 4.7,
    content: "Cozy and charming. Perfect getaway!",
    tags: ["Cozy", "Romantic"],
  },
];

const ReviewsPage = () => {
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all");
  const [reviewData, setReviewData] = useState([]);
  const [search, setSearch] = useState("");
  const [properties, setProperties] = useState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [propertyId, setPropertyId] = useState();
  const [rating, setRating] = useState();
  const [reviewHide, setReviewHide] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [date, setDate] = useState({
    from: addMonths(new Date(), -1),
    to: new Date(),
  });
  const router = useRouter();
  const [flag, setFlag] = useState(false);
  const fetchData = async () => {
    try {
      const getUserId = await localStorage.getItem("userId");
      const userId = JSON.parse(getUserId);
      const from = date.from ? apiDate(new Date(date.from)) : "";

      const to = date.to ? apiDate(new Date(date.to)) : "";
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log(from, to);
      }
      const getLocalData = await localStorage.getItem("token");
      const data = JSON.parse(getLocalData);
      if (data) {
        const response = await fetch(
          `${API_URL}/hostData/review/admin?flagged=${flag}&stars=${selectedRating}&search=${search}&property=${selectedProperty}&checkin=${from}&checkout=${to}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data}`,
            },
          },
        );

        if (!response.ok) {
          toast.error("Error in fetching data");
        }
        const result = await response.json();
        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log("what now", result);
        }
        const final = await result;
        setReviewData(result);

        return result.data;
      }
    } catch (err) {
      console.error(err);
    }
  };
  const fetchProperties = async () => {
    try {
      const getUserId = await localStorage.getItem("userId");
      const userId = JSON.parse(getUserId);
      const getLocalData = await localStorage.getItem("token");
      const data = JSON.parse(getLocalData);
      if (data) {
        const response = await fetch(`${API_URL}/properties/admin/active`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data}`,
          },
        });
        if (!response.ok) {
          toast.error("Error in fetching data");
        }
        const result = await response.json();
        setProperties(result.data);

        return result.data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  function checkLength(value) {
    if (value?.length > 15) {
      return value.substring(0, 15) + "…";
    }
    return value;
  }

  const updateReview = async () => {
    try {
      const getUserId = await localStorage.getItem("userId");
      const userId = JSON.parse(getUserId);
      const from = date.from ? apiDate(new Date(date.from)) : "";

      const to = date.to ? apiDate(new Date(date.to)) : "";
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log(from, to);
      }
      const getLocalData = await localStorage.getItem("token");
      const data = JSON.parse(getLocalData);
      // const review = reviewData
      //   ? reviewData?.data?.filter((item) => item?.bookingId?._id == bookingId)
      //   : [];
      if (data) {
        const response = await fetch(
          `${API_URL}/review/update?bookingId=${bookingId}&status=${reviewHide}&propertyId=${propertyId}&rating=${rating}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data}`,
            },
          },
        );

        if (!response.ok) {
          toast.error("Error in fetching data");
        }
        setDialogOpen(false);
        toast.success("Successfully updated your request");
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchProperties();
  }, []);
  useEffect(() => {
    fetchData();
  }, [selectedRating, selectedProperty, search, date, flag]);

  const handleModal = (review, value) => {
    setDialogOpen(true);
    setReviewHide(value);
    setBookingId(review?.bookingId?._id);
    setPropertyId(review?.property?._id);
    setRating(review?.rating);
  };

  return (
    <div className="container mx-auto px-6 pt-6 pb-24 md:p-6 space-y-6">
      <Dialog
        open={dialogOpen}
        onOpenChange={() => {
          setDialogOpen();
          setReviewHide("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewHide.charAt(0).toUpperCase() + reviewHide.slice(1)} Review
              Hiding
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {reviewHide} this request? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant={"outline"}
              onClick={() => {
                setDialogOpen(false);
                setReviewHide("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={updateReview}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <h1 className="text-3xl font-bold">Review Management</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFiniteNumber(reviewData?.averageRating) ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Out of 5 stars</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFiniteNumber(reviewData?.reviewCount) ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all properties
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex grid w-full gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Search reviews..."
                className=""
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
              >
                <SelectTrigger className="">
                  <SelectValue placeholder="Filter by property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>

                  {properties
                    ? properties.map((item) => (
                        <SelectItem value={item?.title}>
                          {item?.title}
                        </SelectItem>
                      ))
                    : null}
                  {/* <SelectItem value="beachside">Beachside Villa</SelectItem>
                       <SelectItem value="mountain">Mountain Retreat</SelectItem>
                       <SelectItem value="city">City Center Apartment</SelectItem> */}
                </SelectContent>
              </Select>
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger className="">
                  <SelectValue placeholder="Filter by rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      " justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
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
                      <span>Pick a date range</span>
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex align-center justify-between">
            <div>
              <CardTitle>Review List</CardTitle>
            </div>
            <div
              className={`${
                flag
                  ? "ring-lightGray ring-1 transition-all"
                  : "ring-gray-300 transition-all"
              } flex items-center px-3 py-3 gap-x-2   bg-gray-50 ring-1 rounded-full`}
            >
              <button
                className={`w-12 h-5 hover:ring-absoluteDark transition-all  flex items-center rounded-full p-1  duration-300 
                ${
                  flag
                    ? "bg-primaryGreen justify-end"
                    : "bg-solidGray justify-start border-primaryGreen"
                }
              `}
                onClick={() => setFlag(!flag)}
                aria-label={flag ? "All" : "Flagged"}
              >
                <div className="bg-white w-3 h-3 rounded-full shadow-md" />
              </button>
              <span className="text-sm text-absoluteDark font-medium whitespace-nowrap">
                {flag ? "All Data" : "Flagged"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>

                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewData?.data?.map((review) => (
                <TableRow
                  className={
                    review?.bookingId?.flag && review?.hideStatus == "pending"
                      ? "bg-green-100"
                      : ""
                  }
                  key={review?._id}
                >
                  <TableCell
                    className="font-medium"
                    title={review?.property?.title}
                  >
                    {checkLength(review?.property?.title)}
                  </TableCell>
                  <TableCell
                    title={
                      fullName(review?.user)
                    }
                  >
                    <div className="flex items-center">
                      <Image
                        src={review.userAvatar}
                        alt={review.userName}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                      {checkLength(
                        fullName(review?.user),
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(review?.createdAt, {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {parseFiniteNumber(review?.rating) ?? "—"}
                      <Star className="h-4 w-4 text-yellow-400 ml-1" />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {checkLength(review.content)}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Full Review</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/booking-history/user-profile?userId=${review?.user?._id}`,
                            )
                          }
                        >
                          Contact User
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem>Edit Tags</DropdownMenuItem> */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleModal(review, "accept")}
                        >
                          Accept Hide
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleModal(review, "reject")}
                        >
                          Reject Hide
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewsPage;
