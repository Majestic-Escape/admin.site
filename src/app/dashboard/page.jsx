"use client";

//Under Work--------------------------------------------------

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowUpRight,
  Users,
  DollarSign,
  Home,
  Star,
  Calendar,
  TrendingUp,
  Percent,
  Umbrella,
} from "lucide-react";

export default function DashboardPage() {
  // Simulate loading state
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Simulated empty data arrays for charts/tables (empty state will be shown)
  const guestArrivalsData = [];
  const popularPropertyData = [];
  const revenueTrendsData = [];
  const guestSatisfactionData = [];
  const currentBookingsData = [];
  const topRatedHostsData = [];

  // Helper components for skeletons & empty states
  const ChartSkeleton = ({ height = "300px" }) => (
    <div style={{ height }} className="bg-gray-200 animate-pulse rounded" />
  );

  const EmptyState = ({ message = "No data available" }) => (
    <div className="h-[300px] flex items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  const TableSkeleton = () => (
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-gray-200 rounded" />
      <div className="h-8 bg-gray-200 rounded" />
      <div className="h-8 bg-gray-200 rounded" />
    </div>
  );

  return (
    <div className="flex flex-col flex-1 bg-gray-200 overflow-hidden pb-8 md:pb-0">
      <main className="flex-1 overflow-y-auto pb-10">
        <div className="flex-1 space-y-6 p-8 pt-6">
          {/* Page header */}
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-semibold font-bricolage tracking-tight">
              Dashboard Overview (#underwork)
            </h2>
            <div className="flex items-center space-x-2">
              {/* <Button className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md">
                Download Report
              </Button> */}
            </div>
          </div>

          {/* Top Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-bricolage">
                  Total Guests
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-bold">35</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {loading ? "" : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-bold">₹0</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {loading ? "" : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Listings
                </CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-bold">0</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {loading ? "" : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Rating
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-bold">0</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {loading ? "" : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Guest Arrivals</CardTitle>
                <CardDescription>
                  Monthly guest arrivals in Goa over the past year
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {loading ? (
                  <ChartSkeleton height="300px" />
                ) : guestArrivalsData.length === 0 ? (
                  <EmptyState message="No guest arrivals data available" />
                ) : (
                  <LineChart
                    data={guestArrivalsData}
                    xField="month"
                    yField="guests"
                    className="h-[300px]"
                    colors={["#3b82f6"]}
                    yAxisWidth={60}
                    showLegend={false}
                    showTooltip={true}
                    showXAxis={true}
                    showYAxis={true}
                    curveType="monotone"
                  />
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Popular Property Types</CardTitle>
                <CardDescription>
                  Distribution of bookings by property type in Goa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton height="300px" />
                ) : popularPropertyData.length === 0 ? (
                  <EmptyState message="No property type data available" />
                ) : (
                  <BarChart
                    data={popularPropertyData}
                    xField="type"
                    yField="bookings"
                    className="h-[300px]"
                    colors={["#10b981"]}
                    yAxisWidth={60}
                    showLegend={false}
                    showTooltip={true}
                    showXAxis={true}
                    showYAxis={true}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>
                  Monthly revenue in Goa over the past year
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton height="300px" />
                ) : revenueTrendsData.length === 0 ? (
                  <EmptyState message="No revenue trend data available" />
                ) : (
                  <LineChart
                    data={revenueTrendsData}
                    xField="month"
                    yField={["revenue", "occupancy"]}
                    className="h-[300px]"
                    colors={["#f59e0b", "#3b82f6"]}
                    yAxisWidth={80}
                    showLegend={true}
                    showTooltip={true}
                    showXAxis={true}
                    showYAxis={true}
                    curveType="monotone"
                    valueFormatter={{
                      revenue: (value) => `₹${(value / 100000).toFixed(1)}L`,
                      occupancy: (value) => `${value}%`,
                    }}
                  />
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Guest Satisfaction</CardTitle>
                <CardDescription>
                  Distribution of guest ratings in Goa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton height="300px" />
                ) : guestSatisfactionData.length === 0 ? (
                  <EmptyState message="No guest satisfaction data available" />
                ) : (
                  <PieChart
                    data={guestSatisfactionData}
                    xField="rating"
                    yField="percentage"
                    className="h-[300px]"
                    colors={[
                      "#22c55e",
                      "#10b981",
                      "#14b8a6",
                      "#06b6d4",
                      "#0ea5e9",
                    ]}
                    showLegend={true}
                    showTooltip={true}
                    valueFormatter={(value) => `${value}%`}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Current Bookings & Top Rated Hosts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2 overflow-hidden">
              <CardHeader>
                <CardTitle>Current Bookings</CardTitle>
                <CardDescription>
                  Overview of ongoing stays in Goa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton />
                ) : currentBookingsData.length === 0 ? (
                  <div className="py-10 text-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      No current bookings
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      There are no current bookings at the moment.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Guest</TableHead>
                        <TableHead className="w-[200px]">Property</TableHead>
                        <TableHead className="w-[100px]">Check-in</TableHead>
                        <TableHead className="w-[100px]">Check-out</TableHead>
                        <TableHead className="w-[100px] text-right">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentBookingsData.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {booking.guest}
                          </TableCell>
                          <TableCell className="truncate">
                            {booking.property}
                          </TableCell>
                          <TableCell>{booking.checkIn}</TableCell>
                          <TableCell>{booking.checkOut}</TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              {booking.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Rated Hosts</CardTitle>
                <CardDescription>
                  Hosts with the highest ratings in Goa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-8 bg-gray-200 rounded" />
                    <div className="h-8 bg-gray-200 rounded" />
                    <div className="h-8 bg-gray-200 rounded" />
                  </div>
                ) : topRatedHostsData.length === 0 ? (
                  <div className="py-10 text-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      No top rated hosts
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      There are no top rated hosts at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {topRatedHostsData.map((host) => (
                      <div key={host.name} className="flex items-center">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={`/avatars/${host.name
                              .toLowerCase()
                              .replace(" ", "-")}.png`}
                            alt={host.name}
                          />
                          <AvatarFallback>
                            {host.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {host.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {host.properties} properties · {host.rating} rating
                          </p>
                        </div>
                        <div className="ml-auto font-medium">{host.rating}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">
                  Manage Guests
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                  variant="outline"
                >
                  View All Guests
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">
                  Property Listings
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                  variant="outline"
                >
                  Manage Properties
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">
                  Booking Management
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                  variant="outline"
                >
                  View Bookings
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">
                  Financial Reports
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
                  variant="outline"
                >
                  Generate Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
