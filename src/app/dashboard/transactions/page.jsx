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
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsListAdmin, TabsTriggerAdmin } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  Download,
  Filter,
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
import { addMonths, format } from "date-fns";

// Transaction entry for the booking "Listing for Goa" by guest "Divya Yash"
const transactions = [
  {
    id: "txnrzpteste8s3h83j9030989437",
    type: "Pay-in",
    amount: 137025,
    status: "Completed",
    date: format(new Date(), "PPpp"), // current date time
    guest: "Divya Yash",
    property: "Listing for Goa",
    method: "Net Banking",
  },
];
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function TransactionsPage() {
  const [date, setDate] = React.useState({
    from: addMonths(new Date(), -1),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = React.useState("");
  const [transactionType, setTransactionType] = React.useState("all");
  const [payDetails, setPayDetails] = React.useState([]);
  const [filterList, setFilterList] = React.useState("");

  // const filteredTransactions = transactions.filter(
  //   (transaction) =>
  //     (transaction.guest?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       transaction.property
  //         .toLowerCase()
  //         .includes(searchTerm.toLowerCase())) &&
  //     (transactionType === "all" ||
  //       transaction.type.toLowerCase() === transactionType.toLowerCase())
  // );
  const fetchData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    const from = date?.from ? new Date(date.from).toLocaleDateString() : null;
    const to = date?.to ? new Date(date.to).toLocaleDateString() : null;

    if (data) {
      try {
        const response = await fetch(
          `${API_URL}/payment/fetch?paymentType=${transactionType}&search=${searchTerm}&searchList=${filterList}&from=${from}&to=${to}`,
          {
            method: "GET",
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
        const result = await response.json();

        const final = await result.data;
        setPayDetails(final);
      } catch (err) {
        console.error(err);
      }
    }
  };
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("s", payDetails);
  }
  React.useEffect(() => {
    fetchData();
  }, [transactionType, searchTerm, filterList, date]);
  const renderTransactionTable = (payDetails) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>
            <Button variant="ghost" className="p-0 hover:bg-transparent">
              <span>Amount</span>
              <SortAsc className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Guest/Host</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Method</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payDetails?.map((transaction) => (
          <TableRow key={transaction?.id}>
            <TableCell className="font-medium">
              #{transaction?.paymentId}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  transaction?.paymentType === "pay-in"
                    ? "default"
                    : transaction?.paymentType === "pay-out"
                      ? "secondary"
                      : "destructive"
                }
              >
                {transaction?.type === "pay-in" ? (
                  <ArrowDownIcon className="mr-1 h-3 w-3 inline" />
                ) : (
                  <ArrowUpIcon className="mr-1 h-3 w-3 inline" />
                )}
                {transaction?.paymentType}
              </Badge>
            </TableCell>
            <TableCell>₹{Number(transaction?.amount) / 100}</TableCell>
            <TableCell>
              <Badge
                variant={transaction?.status === "paid" ? "success" : "warning"}
              >
                {transaction?.status}
              </Badge>
            </TableCell>
            <TableCell>{transaction?.createdAt?.split("T")[0] ?? "—"}</TableCell>
            <TableCell>{transaction?.customerDetails?.name}</TableCell>
            <TableCell>{transaction?.propertyId?.title}</TableCell>
            <TableCell>{transaction?.paymentMethod}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex-1 space-y-4 px-8 pt-8 pb-24 md:p-8 md:pt-6">
      <div className="md:flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <div className="md:flex items-center md:space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full md:w-[280px] justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date?.to ? (
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
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                selected={date}
                defaultMonth={date?.from}
                onSelect={setDate}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button className="mt-4 w-full md:mt-0 ">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      <Tabs
        defaultValue="all"
        className="space-y-4"
        onValueChange={setTransactionType}
      >
        <TabsListAdmin className="flex flex-col md:flex-row">
          <TabsTriggerAdmin value="all">All Transactions</TabsTriggerAdmin>
          <TabsTriggerAdmin value="pay-in">Pay-ins</TabsTriggerAdmin>
          <TabsTriggerAdmin value="pay-out">Payouts</TabsTriggerAdmin>
          <TabsTriggerAdmin value="refunded">Refunds</TabsTriggerAdmin>
        </TabsListAdmin>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem>Date Range</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Amount</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Status</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
          <Select value={filterList} onValueChange={setFilterList}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest First)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
              <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Transaction List</CardTitle>
            <CardDescription>
              View and manage financial transactions
            </CardDescription>
          </CardHeader>
          <CardContent>{renderTransactionTable(payDetails)}</CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
