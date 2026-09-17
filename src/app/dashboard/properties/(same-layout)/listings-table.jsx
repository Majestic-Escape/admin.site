"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCarouselPopup } from "./image-carousel-popup";
import { toast } from "sonner";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { USER } from "@/lib/query-presets";
import { queryKeys } from "@/lib/query-keys";
import DeletePendingListingDialog, { isPendingListing } from "@/components/delete-pending-listing-dialog";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (process.env.NEXT_PUBLIC_ENV === "dev") {
  console.log("the url", API_URL);
}

const StatusPill = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-red-100 text-red-800";
      case "incomplete":
        return "bg-orange-100 text-orange-800";
      case "inactive":
        return "bg-red-100 text-red-800";
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
const StatusKyc = ({ data }) => {
  const getStatusColor = (data) => {
    if (data == true) {
      return "bg-green-100 text-green-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(data)}`}
    >
      {data === true ? "Completed" : "Pending"}
    </span>
  );
};
// -------------- API Helpers -----------------
const getFilteredListings = async (
  searchTerm,
  statusFilter,
  page = 1,
  limit = 10,
) => {
  const getLocalData = await localStorage.getItem("token");
  const data = JSON.parse(getLocalData);
  if (data) {
    try {
      const response = await axios.get(
        `${API_URL}/properties/admin/filtered-listings?search=${searchTerm}&status=${statusFilter}`,
        {
          params: { page, limit },
          headers: {
            Authorization: `Bearer ${data}`,
            "Content-Type": "application/json",
          },
        },
      );
      const result = await response.data;

      return result;
    } catch (error) {
      if (error.response?.status === 401) {
        // `router` isn't in scope in this module-level helper (it used to throw
        // a ReferenceError here); the caller redirects on this message.
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        throw new Error("Session expired. Please login again.");
      }

      // Handle other errors
      throw new Error(
        error.response?.data?.message || "Failed to fetch listings",
      );
    }
  }
};

const approveListing = async (listingId) => {
  try {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      const response = await fetch(
        `${API_URL}/properties/admin/approve/${listingId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${data}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.status == 200) {
        throw new Error("Something is wrong");
      }
      const result = await response.json();
      if (result.data == "hostDelist") {
        toast.error("Host has delisted this property");
      }

      return response.data;
    }
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to approve listing",
    );
  }
};

const deListing = async (listingId) => {
  try {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      const response = await fetch(
        `${API_URL}/properties/admin/delist/${listingId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${data}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.status == 200) {
        throw new Error("Something is wrong");
      }

      return response.data;
    }
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to approve listing",
    );
  }
};
// -------------- TABLE COMPONENT ---------------
const SkeletonRow = ({ columns }) => (
  <TableRow>
    {columns.map((column, index) => (
      <TableCell key={index}>
        <Skeleton className="h-4 w-full" />
      </TableCell>
    ))}
  </TableRow>
);

export function ListingsTable() {
  const router = useRouter();
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  // const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  // Delete (Batch A2): the pending listings queued for deletion and how many
  // of the selection were skipped because they are not pending.
  const [deleteQueue, setDeleteQueue] = useState(null); // { listings, skipped } | null
  const [listingToApprove, setListingToApprove] = useState(null);
  const [listingToDelist, setListingToDelist] = useState(null);
  const [delistDialogOpen, setDelistDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [imagePopupOpen, setImagePopupOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [bulk, setBulk] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // State to track the selected status filter
  const [listingsToday] = useState(0);

  // Cached per filter set; page/filter changes keep the previous rows on
  // screen (dimmed). Approve/delist invalidate adminListingsAll after the
  // mutation resolved.
  const queryClient = useQueryClient();
  const {
    data: listingsResult,
    isPending: loading,
    isPlaceholderData,
    isFetching,
    error: listingsError,
  } = useQuery({
    queryKey: queryKeys.adminListings({ searchTerm, statusFilter, page }),
    queryFn: async () => {
      const response = await getFilteredListings(
        searchTerm,
        statusFilter,
        page,
        10,
      );
      return {
        properties: Array.isArray(response?.properties)
          ? response.properties
          : [],
        totalList: response?.totalList ?? 0,
        totalActiveListings: response?.totalActiveListings ?? 0,
        totalProcessingListings: response?.totalProcessingListings ?? 0,
      };
    },
    ...USER,
    placeholderData: keepPreviousData,
  });
  const data = listingsResult?.properties ?? [];
  const totalListings = listingsResult?.totalList ?? 0;
  const totalActiveListings = listingsResult?.totalActiveListings ?? 0;
  const totalPendingListings = listingsResult?.totalProcessingListings ?? 0;
  useEffect(() => {
    if (!listingsError) return;
    console.error("Failed to fetch filtered listings:", listingsError);
    toast.error(listingsError.message);
    if (/Session expired/.test(listingsError?.message || "")) router.push("/");
  }, [listingsError, router]);
  const fetchFilteredListings = useCallback(
    (listingId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminListingsAll });
      if (listingId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.property(listingId),
        });
      }
    },
    [queryClient],
  );

  // Handle status filter change
  const handleStatusChange = (value) => {
    setStatusFilter(value); // Update filter state when a new status is selected
  };

  const handleImageClick = useCallback((images, propertyName) => {
    setSelectedImages(images);
    setSelectedPropertyName(propertyName);
    setImagePopupOpen(true);
  }, []);

  const handleApproveListing = useCallback((listing) => {
    setListingToApprove(listing);
    setApproveDialogOpen(true);
  }, []);

  const handleConfirmApproveListing = async () => {
    try {
      if (listingToApprove) {
        await approveListing(listingToApprove._id);
        toast.success("Listing approved successfully");
        setApproveDialogOpen(false);
        setListingToApprove(null);
        fetchFilteredListings(listingToApprove._id);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleDelisting = useCallback((listing) => {
    setListingToDelist(listing);
    setDelistDialogOpen(true);
  }, []);

  const handleConfirmDelist = async () => {
    try {
      if (listingToDelist) {
        await deListing(listingToDelist._id);
        toast.success("Listing delist successfully");
        setDelistDialogOpen(false);
        setListingToDelist(null);
        fetchFilteredListings(listingToDelist._id);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleDeleteClick = useCallback((listing) => {
    if (!isPendingListing(listing)) return;
    setDeleteQueue({ listings: [listing], skipped: 0 });
  }, []);

  // Only pending rows are queued; the dialog tells the admin how many of
  // the selection were skipped.
  const handleBulkDeleteClick = () => {
    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
    const pendingRows = selected.filter(isPendingListing);
    if (!pendingRows.length) return toast.error("No pending listings selected");
    setDeleteQueue({ listings: pendingRows, skipped: selected.length - pendingRows.length });
  };

  // Each deleted listing leaves the cache immediately; the table refetches
  // once the whole queue finished.
  const handleDeleted = (listing) => {
    queryClient.removeQueries({ queryKey: queryKeys.property(listing._id) });
  };
  const handleDeleteFinished = () => {
    setDeleteQueue(null);
    table.resetRowSelection();
    fetchFilteredListings();
  };

  const handleBulkApprove = async () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((r) => r.original._id);
    if (selectedIds.length === 0) return toast.error("No listings selected");

    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/properties/admin/approve/${id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${data}`,
              "Content-Type": "application/json",
            },
          }),
        ),
      );
      toast.success(`Approved ${selectedIds.length} listing(s)`);
      setApproveDialogOpen(false);
      setBulk(false);
      fetchFilteredListings();
      table.resetRowSelection();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delist selected listings");
    }
  };

  const handleBulkDelist = async () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((r) => r.original._id);
    if (selectedIds.length === 0) return toast.error("No listings selected");

    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/properties/admin/delist/${id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${data}`,
              "Content-Type": "application/json",
            },
          }),
        ),
      );
      toast.success(`Delisted ${selectedIds.length} listing(s)`);
      setDelistDialogOpen(false);
      setBulk(false);
      fetchFilteredListings();
      table.resetRowSelection();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delist selected listings");
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="accent-primaryGreen"
            data-no-navigate="true"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="accent-primaryGreen"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },

      {
        accessorKey: "photos",
        header: "Thumbnail",
        cell: ({ row }) => {
          const photos = row.getValue("photos");
          return photos && photos.length > 0 ? (
            <Image
              src={photos[0] || "/placeholder.svg"}
              alt="Property thumbnail"
              // data-no-navigate="true"
              width={50}
              height={50}
              className="rounded-md cursor-pointer"
              onClick={() => handleImageClick(photos, row.getValue("title"))}
            />
          ) : (
            <div className="w-[50px] h-[50px] bg-gray-200 rounded-md"></div>
          );
        },
      },
      {
        accessorKey: "title",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Title
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const title = row.getValue("title") || "";
          const truncated =
            title.length > 30 ? title.substring(0, 30) + "…" : title;

          return (
            <span
              title={title}
              className="block max-w-[250px] truncate cursor-pointer"
            >
              {truncated}
            </span>
          );
        },
      },
      {
        accessorKey: "propertyType",
        header: "Property Type",
      },
      {
        header: "KYC Status",
        cell: ({ row }) => {
          const listing = row.original; // Access actual data
          console.log("r", listing);
          return <StatusKyc data={listing?.host?.kyc} />;
        },
      },
      {
        header: "Bank Details",
        cell: ({ row }) => {
          const listing = row.original; // Access actual data
          console.log("r", listing);
          return <StatusKyc data={listing?.host?.bank} />;
        },
      },
      {
        accessorKey: "hostEmail",
        header: "Email",
      },
      {
        accessorKey: "placeType",
        header: "Place Type",
      },
      {
        accessorKey: "guests",
        header: "Guests",
      },
      {
        accessorKey: "bedrooms",
        header: "Bedrooms",
      },
      {
        accessorKey: "beds",
        header: "Beds",
      },
      {
        accessorKey: "bathrooms",
        header: "Bathrooms",
      },
      {
        accessorKey: "basePrice",
        header: () => <div className="text-right">Base Price</div>,
        cell: ({ row }) => {
          const price = row.getValue("basePrice");

          // Check if price is null or NaN
          if (price === null || isNaN(price)) {
            return <div className="text-right font-medium">-</div>;
          }

          // Format the price as currency if it's valid
          const formatted = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(Number.parseFloat(price));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },

      {
        accessorKey: "status",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => <StatusPill status={row.getValue("status")} />,
      },
      {
        accessorKey: "createdAt",

        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Created At
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="text-center">
            {new Date(row.getValue("createdAt")).toLocaleDateString()}
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const listing = row.original;
          if (process.env.NEXT_PUBLIC_ENV === "dev") {
            console.log("list", listing);
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  data-no-navigate="true"
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  data-no-navigate="true"
                  onClick={() =>
                    router.push(
                      `/dashboard/kyc-details/${listing.host._id}?firstName=${listing.host.firstName}&lastName=${listing.host.lastName}`,
                    )
                  }
                >
                  Kyc Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-navigate="true"
                  onClick={() => {
                    navigator.clipboard.writeText(listing._id);
                    toast.success("Listing ID copied to clipboard");
                  }}
                >
                  Copy listing ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-navigate="true"
                  onClick={() => {
                    router.push(`/dashboard/edit-property/${listing._id}`);
                  }}
                >
                  Edit Property
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-navigate="true"
                  onClick={() =>
                    router.push(
                      `/dashboard/view-property?property=${listing._id}`,
                    )
                  }
                >
                  View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {listing.status != "active" ? (
                  <DropdownMenuItem
                    data-no-navigate="true"
                    onClick={() => handleApproveListing(listing)}
                  >
                    Approve
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    data-no-navigate="true"
                    onClick={() => handleDelisting(listing)}
                  >
                    Delist
                  </DropdownMenuItem>
                )}
                {isPendingListing(listing) ? (
                  <DropdownMenuItem
                    data-no-navigate="true"
                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                    onClick={() => handleDeleteClick(listing)}
                  >
                    Delete listing
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleImageClick, handleApproveListing, handleDelisting, handleDeleteClick],
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);
  const pendingSelectedCount = table
    .getSelectedRowModel()
    .rows.filter((r) => isPendingListing(r.original)).length;

  return (
    <div className="w-full pb-24 md:pb-0">
      <DeletePendingListingDialog
        listings={deleteQueue?.listings ?? []}
        skipped={deleteQueue?.skipped ?? 0}
        open={!!deleteQueue}
        onOpenChange={(open) => {
          if (!open) setDeleteQueue(null);
        }}
        onDeleted={handleDeleted}
        onFinished={handleDeleteFinished}
      />
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {listingToApprove?.host?.kyc && listingToApprove?.host?.bank
                ? "Confirm Approval"
                : "Waiting fo host action"}
            </DialogTitle>
            <DialogDescription>
              {listingToApprove?.host?.kyc && listingToApprove?.host?.bank
                ? `Are you sure you want to approve the listing &quot;
              ${listingToApprove?.title}&quot;? This action cannot be undone.`
                : `Bank details/Kyc form not completed by host.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            {listingToApprove?.host?.kyc && listingToApprove?.host?.bank ? (
              <Button
                className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                onClick={bulk ? handleBulkApprove : handleConfirmApproveListing}
              >
                Confirm
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delistDialogOpen} onOpenChange={setDelistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delisting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delist the listing &quot;
              {listingToDelist?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDelistDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
              onClick={bulk ? handleBulkDelist : handleConfirmDelist}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP FOR PROPERTY IMAGES */}
      {/* <ImageCarouselPopup
        isOpen={imagePopupOpen}
        onClose={() => setImagePopupOpen(false)}
        images={selectedImages}
        propertyName={selectedPropertyName}
      /> */}

      {/* ----------- STATS CARDS ----------- */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="p-4 bg-white rounded shadow text-center">
          <div className="md:hidden text-sm font-medium">Total</div>
          <div className="hidden md:block text-sm font-medium">
            Total Listings
          </div>
          <div className="text-xl font-bold">{totalListings}</div>
        </div>
        <div className="p-4 bg-white rounded shadow text-center">
          <div className="md:hidden text-sm font-medium">Active</div>
          <div className="hidden md:block text-sm font-medium">
            Active Listings
          </div>
          <div className="text-xl font-bold">{totalActiveListings}</div>
        </div>
        <div className="p-4 bg-white rounded shadow text-center">
          <div className="md:hidden text-sm font-medium">Pend.</div>
          <div className="hidden md:block text-sm font-medium">
            Pending Listings
          </div>
          <div className="text-xl font-bold">{totalPendingListings}</div>
        </div>
        <div className="p-4 bg-white rounded shadow text-center">
          <div className="md:hidden text-sm font-medium">Today</div>
          <div className="hidden md:block text-sm font-medium">
            Listings Today
          </div>
          <div className="text-xl font-bold">{listingsToday}</div>
        </div>
      </div>

      {/* ----------- FILTERS & COLUMN VISIBILITY ----------- */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Search using title or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-white rounded-md"
        />
        <Select
          className="bg-white rounded-md"
          value={statusFilter}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="bg-white w-[180px] ml-2">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="processing">Pending</SelectItem>
            {/* <SelectItem value="incomplete">Incomplete</SelectItem> */}
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-between mb-4 bg-gray-50 border rounded p-3">
          <span className="text-sm">
            {Object.keys(rowSelection).length} selected
          </span>
          <div className="space-x-2">
            <Button
              onClick={() => {
                setBulk(true);
                setApproveDialogOpen(true);
              }}
              className="text-white bg-green-600 hover:bg-green-700"
            >
              Approve Selected
            </Button>
            <Button
              onClick={() => {
                setBulk(true);
                setDelistDialogOpen(true);
              }}
              className="text-white bg-yellow-600 hover:bg-yellow-700"
            >
              Delist Selected
            </Button>
            {pendingSelectedCount > 0 ? (
              <Button
                variant="destructive"
                onClick={handleBulkDeleteClick}
                className="text-white bg-red-600 hover:bg-red-700"
              >
                Delete pending ({pendingSelectedCount})
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* ----------- TABLE ----------- */}
      <div className="rounded-md bg-white border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className={
              isPlaceholderData || isFetching
                ? "opacity-60 transition-opacity"
                : "transition-opacity"
            }
          >
            {loading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <SkeletonRow key={index} columns={columns} />
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(e) => {
                    // Check if the clicked element or its parent has data-no-navigate
                    const noNavigateElement = e.target.closest(
                      '[data-no-navigate="true"]',
                    );
                    if (!noNavigateElement) {
                      router.push(
                        `/dashboard/view-property?property=${row.original._id}`,
                      );
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ----------- PAGINATION ----------- */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(page - 1, 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <Button
            className="bg-primaryGreen text-white hover:bg-brightGreen rounded-md"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={data?.length < 10 || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
