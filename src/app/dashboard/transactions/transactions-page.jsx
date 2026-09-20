"use client";

import * as React from "react";
import { DataTableEmpty, DataTablePagination, DataTableSearch, SortableHeader, useListParams } from "@/components/data-table";
import { apiDate } from "@/lib/format";
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
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMonths, format } from "date-fns";
import { useRouter } from "next/navigation";
import { formatINR, parseFiniteNumber } from "@/lib/format";

// Razorpay amounts are in paise; a missing amount renders "—", not ₹NaN.
const paiseToINR = (amount) => {
  const n = parseFiniteNumber(amount);
  return n === null ? "—" : formatINR(n / 100);
};

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
const TX_FILTERS = { q: "", type: "all", status: "all", from: "", to: "" };
const isoDay = (d) => (d instanceof Date && !isNaN(d) ? format(d, "yyyy-MM-dd") : "");
const fromIso = (v) => { if (!v) return null; const d = new Date(`${v}T00:00:00`); return isNaN(d) ? null : d; };

export default function TransactionsPage() {
  const router = useRouter();
  // page / size / sort / search / type / status / date range live in the URL (server-side contract)
  const list = useListParams({ defaultSort: "createdAt:desc", filters: TX_FILTERS });
  const searchTerm = list.filters.q;
  const transactionType = list.filters.type;
  const statusFilter = list.filters.status;
  const [date, setDateState] = React.useState(() => ({
    from: fromIso(list.filters.from) || addMonths(new Date(), -1),
    to: fromIso(list.filters.to) || new Date(),
  }));
  const setDate = React.useCallback(
    (range) => {
      setDateState(range);
      if (range?.from && range?.to) list.setFilters({ from: isoDay(range.from), to: isoDay(range.to) });
    },
    [list],
  );
  const [payDetails, setPayDetails] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

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

    const from = date?.from ? apiDate(new Date(date.from)) : null;
    const to = date?.to ? apiDate(new Date(date.to)) : null;

    if (data) {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/payment/fetch?paymentType=${transactionType}&status=${statusFilter}&search=${encodeURIComponent(searchTerm)}&from=${from}&to=${to}&${list.apiParams.toString()}`,
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
        setPayDetails(Array.isArray(final) ? final : []);
        setTotal(result?.total ?? (Array.isArray(final) ? final.length : 0));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("s", payDetails);
  }
  React.useEffect(() => {
    fetchData();
  }, [transactionType, statusFilter, searchTerm, date, list.page, list.pageSize, list.sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const renderTransactionTable = (payDetails) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">
            <SortableHeader label="ID" sortKey="paymentId" sort={list} onSort={list.toggleSort} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Type" sortKey="paymentType" sort={list} onSort={list.toggleSort} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Amount" sortKey="amount" sort={list} onSort={list.toggleSort} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Status" sortKey="status" sort={list} onSort={list.toggleSort} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Date" sortKey="createdAt" sort={list} onSort={list.toggleSort} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Guest/Host" sortKey="customer" sort={list} onSort={list.toggleSort} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Property" sortKey="title" sort={list} onSort={list.toggleSort} />
          </TableHead>
          <TableHead>Method</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!loading && payDetails?.length === 0 ? (
          <DataTableEmpty colSpan={8} message="No transactions match these filters and dates." onReset={list.isDirty ? list.reset : undefined} />
        ) : null}
        {payDetails?.map((transaction) => (
          <TableRow key={transaction?._id || transaction?.id} data-testid="transaction-row">
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
            <TableCell>{paiseToINR(transaction?.amount)}</TableCell>
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
        value={transactionType}
        className="space-y-4"
        onValueChange={(v) => list.setFilter("type", v)}
      >
        <TabsListAdmin className="flex flex-col md:flex-row">
          <TabsTriggerAdmin value="all" data-testid="tab-all">All Transactions</TabsTriggerAdmin>
          <TabsTriggerAdmin value="pay-in" data-testid="tab-pay-in">Pay-ins</TabsTriggerAdmin>
          <TabsTriggerAdmin value="pay-out">Payouts</TabsTriggerAdmin>
          <TabsTriggerAdmin value="refunded">Refunds</TabsTriggerAdmin>
        </TabsListAdmin>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:space-x-2">
          <div className="flex-1">
            <DataTableSearch
              value={searchTerm}
              onChange={(v) => list.setFilter("q", v)}
              placeholder="Search by payment id, order id, name, e-mail or property"
              className="bg-white rounded-md md:max-w-none"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => list.setFilter("status", v)}>
            <SelectTrigger className="w-full md:w-[170px] bg-white" aria-label="Status" data-testid="filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refund initiated">Refund initiated</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          {list.isDirty ? (
            <Button variant="ghost" size="sm" className="h-9" onClick={list.reset} data-testid="table-reset">
              <X className="mr-1 h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
          ) : null}
          <span className="text-sm text-muted-foreground" data-testid="table-count">
            {loading ? "" : `${total} ${total === 1 ? "transaction" : "transactions"}`}
          </span>
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
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Transaction List</CardTitle>
            <CardDescription>
              View and manage financial transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
              {renderTransactionTable(payDetails)}
              <DataTablePagination
                page={list.page}
                pageSize={list.pageSize}
                total={total}
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
                isLoading={loading}
                itemLabel="transactions"
              />
            </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
