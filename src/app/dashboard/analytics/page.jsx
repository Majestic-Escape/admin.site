"use client";

import React, { useState, useMemo } from "react";
import { addDays, subMonths, format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrendingUp, Download, Search, CalendarIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  Cell,
  Legend,
} from "recharts";

import { useEffect } from "react";

// Mock data for revenue insights (extended for longer periods)
const revenueData = {
  today: [
    { hour: "00:00", revenue: 200 },
    { hour: "04:00", revenue: 300 },
    { hour: "08:00", revenue: 400 },
    { hour: "12:00", revenue: 600 },
    { hour: "16:00", revenue: 800 },
    { hour: "20:00", revenue: 1000 },
  ],
  last7Days: [
    { day: "Mon", revenue: 1500 },
    { day: "Tue", revenue: 2000 },
    { day: "Wed", revenue: 1800 },
    { day: "Thu", revenue: 2200 },
    { day: "Fri", revenue: 2500 },
    { day: "Sat", revenue: 3000 },
    { day: "Sun", revenue: 2800 },
  ],
  thisMonth: [
    { date: "1", revenue: 5000 },
    { date: "5", revenue: 6200 },
    { date: "10", revenue: 7800 },
    { date: "15", revenue: 8400 },
    { date: "20", revenue: 9100 },
    { date: "25", revenue: 10500 },
    { date: "30", revenue: 12000 },
  ],
  threeMonths: Array.from({ length: 90 }, (_, i) => ({
    date: `Day ${i + 1}`,
    revenue: Math.floor(Math.random() * 10000) + 5000,
  })),
  sixMonths: Array.from({ length: 180 }, (_, i) => ({
    date: `Day ${i + 1}`,
    revenue: Math.floor(Math.random() * 15000) + 5000,
  })),
  oneYear: Array.from({ length: 365 }, (_, i) => ({
    date: `Day ${i + 1}`,
    revenue: Math.floor(Math.random() * 20000) + 5000,
  })),
};

// Mock data for property revenue share
const propertyRevenueShare = [
  { name: "Sunset View", value: 35 },
  { name: "Palm Grove", value: 25 },
  { name: "Ocean Breeze", value: 20 },
  { name: "Mountain Mist", value: 15 },
  { name: "City Lights", value: 5 },
];

// Updated color palette using shades of green
const GREEN_COLORS = ["#2ecc71", "#27ae60", "#1abc9c", "#16a085", "#3498db"];

// Mock data for bookings
const bookings = [
  {
    id: 1,
    property: "Sunset View",
    guest: "John Doe",
    checkIn: "2023-06-15",
    checkOut: "2023-06-20",
    amount: 1500,
    status: "Completed",
  },
  {
    id: 2,
    property: "Palm Grove",
    guest: "Jane Smith",
    checkIn: "2023-06-18",
    checkOut: "2023-06-22",
    amount: 800,
    status: "Upcoming",
  },
  {
    id: 3,
    property: "Ocean Breeze",
    guest: "Mike Johnson",
    checkIn: "2023-06-10",
    checkOut: "2023-06-13",
    amount: 600,
    status: "Completed",
  },
  {
    id: 4,
    property: "Mountain Mist",
    guest: "Sarah Brown",
    checkIn: "2023-06-25",
    checkOut: "2023-06-30",
    amount: 1200,
    status: "Upcoming",
  },
  {
    id: 5,
    property: "City Lights",
    guest: "Chris Wilson",
    checkIn: "2023-06-05",
    checkOut: "2023-06-08",
    amount: 750,
    status: "Completed",
  },
];
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AnalyticsPage = () => {
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    from: subDays(today, 7),
    to: new Date(),
  });
  const [hostName, setHostName] = useState();
  const [hostEmail, setHostEmail] = useState();
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("all");
  const [bookings, setBookings] = useState();
  const [searchTerm, setSearchTerm] = useState("");
  const [hostSearch, setHostSearch] = useState("");
  const [currentHost, setCurrentHost] = useState("all");
  const getDate = (item) => {
    const month = new Date(item).getMonth();
    const year = new Date(item).getFullYear();
    const day = new Date(item).getDate();
    const newDate = new Date(Date.UTC(year, month, day));
    return newDate.toISOString();
  };

  const fetchData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    const host = await localStorage.getItem("userId");

    const from = getDate(dateRange.from);
    const to = getDate(dateRange.to);
    console.log(from, to);
    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/booking/admin/analytics-filter?search=${searchTerm}&status=${status}&from=${from}&to=${to}&hostEmail=${currentHost}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${data}`,
              "Content-Type": "application/json",
            },
          }
        );
        const result = await response.json();
        const final = await result.data;
        setBookings(final);
      } catch (err) {
        console.error(err);
      }
    }
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
        console.log("sssss", result);
        const final = await result.data;
        setHostEmail(final);
      } catch (err) {
        console.error(err);
      }
    }
  };
  useEffect(() => {
    fetchHostEmails();
  }, []);
  useEffect(() => {
    fetchData();
  }, [searchTerm, status, dateRange, currentHost]);

  //   const filteredBookings = bookings.filter(
  //     (booking) =>
  //       booking.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       booking.guest.toLowerCase().includes(searchTerm.toLowerCase())
  //   );
  const handleDateRangeChange = (range) => {
    const today = new Date();
    switch (range) {
      case "1d":
        setDateRange({ from: today.setHours(0, 0, 0, 0), to: today });
        break;
      case "1w":
        setDateRange({ from: subDays(today, 7), to: today });
        break;
      case "1m":
        setDateRange({ from: subMonths(today, 1), to: today });
        break;
      case "3m":
        setDateRange({ from: subMonths(today, 3), to: today });
        break;
      case "6m":
        setDateRange({ from: subMonths(today, 6), to: today });
        break;
      case "1y":
        setDateRange({ from: subMonths(today, 12), to: today });
        break;
      default:
        break;
    }
  };

  function checkLength(value) {
    if (value?.length > 15) {
      return value.substring(0, 15) + "…";
    }
    return value;
  }

  function totalGuests() {
    let sum = 0;
    bookings?.forEach((item) => {
      sum += Number(item?.guests);
    });
    return sum;
  }

  function totalAdults() {
    let sum = 0;
    bookings?.forEach((item) => {
      sum += Number(item?.adults);
    });
    return sum;
  }

  function totalChildren() {
    let sum = 0;
    bookings?.forEach((item) => {
      sum += Number(item?.children);
    });
    return sum;
  }
  function getDaysBetweenTwoDates(date1, date2) {
    const utc1 = Date.UTC(
      date1.getFullYear(),
      date1.getMonth(),
      date1.getDate()
    );
    const utc2 = Date.UTC(
      date2.getFullYear(),
      date2.getMonth(),
      date2.getDate()
    );
    return Math.floor(Math.abs(utc2 - utc1) / (1000 * 60 * 60 * 24));
  }

  // Example usage
  const firstDate = new Date(dateRange.from);
  const secondDate = new Date(dateRange.to);
  const daysDifference = getDaysBetweenTwoDates(firstDate, secondDate);
  function daysBar() {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const data = [...Array(daysDifference + 1)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const final = bookings?.filter(
        (item) =>
          new Date(item?.checkIn).toLocaleDateString() ==
          date.toLocaleDateString()
      );
      let sum = 0;
      let sumBook = 0;
      final?.forEach((item) => {
        sum += Number(item?.guests);
        sumBook += 1;
      });
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return {
        order: i + 1,
        day: days[date.getDay()],
        date: date.toLocaleDateString(),
        short: `${date.getDate()} ${months[date.getMonth()]}`,
        guests: sum,
        booking: sumBook,
      };
    });
    return data.sort((a, b) => b.order - a.order);
  }

  function monthsBar() {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const date = new Date();
    const data = [...Array(13)].map((_, i) => {
      const newDate = subMonths(date, i);

      const final = bookings?.filter(
        (item) =>
          `${new Date(item?.checkIn).getMonth()}/${new Date(
            item?.checkIn
          ).getFullYear()}` ==
          `${new Date(newDate).getMonth()}/${new Date(newDate).getFullYear()}`
      );

      let sum = 0;
      let sumBook = 0;
      final?.forEach((item) => {
        sum += Number(item?.guests);
        sumBook += 1;
      });

      return {
        order: i + 1,
        month: `${months[newDate.getMonth()]} ${newDate
          .getFullYear()
          .toString()
          .slice(2)}`,
        date: newDate.toLocaleDateString(),
        guests: sum,
        booking: sumBook,
      };
    });
    return data.sort((a, b) => b.order - a.order);
  }

  const arr = useMemo(() => {
    const uniqueProperties = [];
    bookings?.forEach((item) => {
      if (!uniqueProperties.includes(item?.propertyId?.title)) {
        uniqueProperties.push(item?.propertyId?.title);
      }
    });
    return uniqueProperties;
  }, [bookings]);

  const propertyPieData = useMemo(() => {
    const data = arr.map((propTitle, i) => {
      const final = bookings?.filter(
        (item) =>
          item?.propertyId?.title?.toLowerCase() === propTitle.toLowerCase()
      );
      let sum = 0;
      let sumBook = 0;
      final?.forEach((item) => {
        sum += Number(item?.guests);
        sumBook += 1;
      });
      return {
        order: i + 1,
        guests: sum,
        name: propTitle,
        booking: sumBook,
      };
    });
    return data;
  }, [arr, bookings]);

  // Update total only when data changes
  useEffect(() => {
    const add = propertyPieData.reduce((acc, item) => acc + item.guests, 0);
    setTotal(add);
  }, [propertyPieData]);
  const emails = [];
  return (
    <div className="container mx-auto  py-10 px-8 min-h-screen bg-gray-200">
      <div className="flex justify-between">
        <div className="pb-5">
          <h1 className="text-2xl font-semibold font-bricolage text-absoluteDark mb-2">
            Analytics Insights
          </h1>

          <p className="text-sm text-muted-foreground">
            Track your key stats and analyze booking trends across properties.
          </p>
        </div>
        <Button className="text-white bg-primaryGreen hover:bg-brightGreen rounded-3xl">
          <Download className="mr-2 h-4 w-4" />
          Export Analytics Report
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-col pb-5 md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <Select onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              {/* <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7Days">Last 7 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem> */}

              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="1w">Last 7 days</SelectItem>
              <SelectItem value="1m">This Month</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last 1 year</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-[280px] justify-start text-left font-normal ${
                  !dateRange && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
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
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" selected>
                All Status
              </SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentHost} onValueChange={setCurrentHost}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {/* Search input inside dropdown */}
              <div className="py-2 px-1">
                <Input
                  placeholder="Search host email..."
                  value={hostSearch}
                  onChange={(e) => setHostSearch(e.target.value)}
                  className="w-full"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>

              {/* Default option */}
              <SelectItem value="all">All Host Email</SelectItem>

              {/* Filtered properties */}
              {hostEmail
                ?.filter((item) =>
                  item.hostEmail
                    ?.toLowerCase()
                    .includes(hostSearch.toLowerCase())
                )
                .map((item) => {
                  if (!emails.includes(item.hostEmail)) {
                    emails.push(item.hostEmail);
                    return (
                      <SelectItem key={item.hostEmail} value={item.hostEmail}>
                        {item.hostEmail}
                      </SelectItem>
                    );
                  }
                })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid pb-5 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* ₹{stats.total.toLocaleString()} */}
              {bookings?.length != 0 ? bookings?.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* ₹{stats.total.toLocaleString()} */}
              {bookings?.length != 0 ? totalGuests() : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adults</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* ₹{stats.total.toLocaleString()} */}
              {bookings?.length != 0 ? totalAdults() : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Children
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* ₹{stats.total.toLocaleString()} */}
              {bookings?.length != 0 ? totalChildren() : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last period
            </p>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Daily Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
          
            <p className="text-xs text-muted-foreground">No records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Highest Daily Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{0}</div>
          
            <p className="text-xs text-muted-foreground">No records</p>
          </CardContent>
        </Card> */}
      </div>
      <div className="grid pb-5 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bookings Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  getDaysBetweenTwoDates(
                    new Date(dateRange.from),
                    new Date(dateRange.to)
                  ) <= 31
                    ? daysBar()
                    : monthsBar()
                }
              >
                <XAxis
                  dataKey={
                    getDaysBetweenTwoDates(
                      new Date(dateRange.from),
                      new Date(dateRange.to)
                    ) <= 7
                      ? "day"
                      : getDaysBetweenTwoDates(
                            new Date(dateRange.from),
                            new Date(dateRange.to)
                          ) <= 31
                        ? "short"
                        : "month"
                  }
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="booking" fill="#2ecc71" />{" "}
                {/* Updated to use a shade of green */}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Share by Property</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={propertyPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={`booking`}
                  label={({ name, percent }) =>
                    `${name.slice(0, 11)}... ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {propertyPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GREEN_COLORS[index % GREEN_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Guests Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  getDaysBetweenTwoDates(
                    new Date(dateRange.from),
                    new Date(dateRange.to)
                  ) <= 31
                    ? daysBar()
                    : monthsBar()
                }
              >
                <XAxis
                  dataKey={
                    getDaysBetweenTwoDates(
                      new Date(dateRange.from),
                      new Date(dateRange.to)
                    ) <= 7
                      ? "day"
                      : getDaysBetweenTwoDates(
                            new Date(dateRange.from),
                            new Date(dateRange.to)
                          ) <= 31
                        ? "short"
                        : "month"
                  }
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="guests" fill="#2ecc71" />{" "}
                {/* Updated to use a shade of green */}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guest Share by Property</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={propertyPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={`guests`}
                  label={({ name, percent }) =>
                    `${name.slice(0, 11)}... ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {propertyPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GREEN_COLORS[index % GREEN_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Adults</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.map((booking) => (
                <TableRow key={booking?._id}>
                  <TableCell>
                    <span title={booking?.propertyId?.title}>
                      {checkLength(booking?.propertyId?.title)}
                    </span>
                  </TableCell>
                  <TableCell>{booking?.guests}</TableCell>
                  <TableCell>{booking?.adults}</TableCell>
                  <TableCell>{booking?.children}</TableCell>

                  <TableCell>
                    {new Date(booking?.checkIn).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(booking?.checkOut).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>₹{booking?.price?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking?.status === "pending"
                          ? "outline"
                          : booking?.status === "confirmed"
                            ? "default"
                            : booking?.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                      }
                    >
                      {booking?.status}
                    </Badge>
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

export default AnalyticsPage;
