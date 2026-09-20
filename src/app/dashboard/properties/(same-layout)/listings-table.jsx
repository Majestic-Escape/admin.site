"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DataTableEmpty, DataTablePagination, DataTableSearch, SortableHeader, useListParams } from "@/components/data-table";
const LISTING_FILTERS = { q: "", status: "all" };
import axios from "axios";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, MoreHorizontal, X } from "lucide-react";
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
const getFilteredListings = async (query) => {
  const getLocalData = await localStorage.getItem("token");
  const data = JSON.parse(getLocalData);
  if (data) {
    try {
      const response = await axios.get(
        `${API_URL}/properties/admin/filtered-listings?${query}`,
        {
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
  const [imagePopupOpen, setImagePopupOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");
  const [bulk, setBulk] = useState(false);
  const [listingsToday] = useState(0);
  // page / size / sort / search / status live in the URL (server-side contract)
  const list = useListParams({ defaultSort: "updatedAt:desc", filters: LISTING_FILTERS });
  const { q: searchTerm, status: statusFilter } = list.filters;
  const page = list.page;
  const listQuery = React.useMemo(() => {
    const p = new URLSearchParams(list.apiParams);
    p.set("search", searchTerm);
    p.set("status", statusFilter);
    return p.toString();
  }, [list.apiParams, searchTerm, statusFilter]);

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
    queryKey: queryKeys.adminListings(listQuery),
    queryFn: async () => {
      const response = await getFilteredListings(listQuery);
      return {
        properties: Array.isArray(response?.properties)
          ? response.properties
          : [],
        total: response?.total ?? response?.totalProperties ?? 0,
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
  const filteredTotal = listingsResult?.total ?? 0;
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
  const handleStatusChange = (value) => list.setFilter("status", value);

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
          // data-no-navigate: the whole row opens the listing on click; the
          // selection checkbox must not (it made bulk actions unusable).
          <input
            type="checkbox"
            className="accent-primaryGreen"
            data-no-navigate="true"
            aria-label={`Select ${row.original?.title || "listing"}`}
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
        header: () => <SortableHeader label="Title" sortKey="title" sort={list} onSort={list.toggleSort} />,
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
        header: () => <SortableHeader label="Property Type" sortKey="propertyType" sort={list} onSort={list.toggleSort} />,
      },
      {
        id: "kyc",
        header: () => <SortableHeader label="KYC Status" sortKey="hostKyc" sort={list} onSort={list.toggleSort} />,
        cell: ({ row }) => <StatusKyc data={row.original?.host?.kyc} />,
      },
      {
        id: "bank",
        header: () => <SortableHeader label="Bank Details" sortKey="hostBank" sort={list} onSort={list.toggleSort} />,
        cell: ({ row }) => <StatusKyc data={row.original?.host?.bank} />,
      },
      {
        accessorKey: "hostEmail",
        header: () => <SortableHeader label="Email" sortKey="hostEmail" sort={list} onSort={list.toggleSort} />,
      },
      {
        accessorKey: "placeType",
        header: () => <SortableHeader label="Place Type" sortKey="placeType" sort={list} onSort={list.toggleSort} />,
      },
      {
        accessorKey: "guests",
        header: () => <SortableHeader label="Guests" sortKey="guests" sort={list} onSort={list.toggleSort} />,
      },
      {
        accessorKey: "bedrooms",
        header: () => <SortableHeader label="Bedrooms" sortKey="bedrooms" sort={list} onSort={list.toggleSort} />,
      },
      {
        accessorKey: "beds",
        header: () => <SortableHeader label="Beds" sortKey="beds" sort={list} onSort={list.toggleSort} />,
      },
      {
        accessorKey: "bathrooms",
        header: () => <SortableHeader label="Bathrooms" sortKey="bathrooms" sort={list} onSort={list.toggleSort} />,
      },
      {
        accessorKey: "basePrice",
        header: () => <div className="text-right"><SortableHeader label="Base Price" sortKey="basePrice" sort={list} onSort={list.toggleSort} align="right" /></div>,
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
        header: () => <SortableHeader label="Status" sortKey="status" sort={list} onSort={list.toggleSort} />,
        cell: ({ row }) => <StatusPill status={row.getValue("status")} />,
      },
      {
        accessorKey: "createdAt",
        header: () => <SortableHeader label="Created At" sortKey="createdAt" sort={list} onSort={list.toggleSort} />,
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
    [handleImageClick, handleApproveListing, handleDelisting, handleDeleteClick, list.sortKey, list.sortDir, list.toggleSort],
  );

  const table = useReactTable({
    data,
    columns,
    // Rows are identified by listing id, never by index, so a selection can
    // never drift onto a different listing when the data changes.
    getRowId: (row) => String(row._id),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // the server pages and sorts (utils/listQuery.js); the table only renders one page
    manualPagination: true,
    manualSorting: true,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // A new search / filter / page shows different rows: start the selection
  // over so bulk actions only ever apply to what is on screen.
  useEffect(() => {
    setRowSelection({});
  }, [searchTerm, statusFilter, page]);
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
      <div className="flex flex-col gap-2 py-4 md:flex-row md:items-center">
        <DataTableSearch
          value={searchTerm}
          onChange={(v) => list.setFilter("q", v)}
          placeholder="Search using title or email..."
          className="bg-white rounded-md"
        />
        <Select
          className="bg-white rounded-md"
          value={statusFilter}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="bg-white w-[180px] md:ml-2" aria-label="Status" data-testid="filter-status">
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
        {list.isDirty ? (
          <Button variant="ghost" size="sm" className="h-9" onClick={list.reset} data-testid="table-reset">
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        ) : null}
        <span className="text-sm text-muted-foreground md:ml-auto" data-testid="table-count">
          {loading ? "" : `${filteredTotal} ${filteredTotal === 1 ? "listing" : "listings"}`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="md:ml-2 bg-white">
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
              <DataTableEmpty colSpan={columns.length} message="No listings match these filters." onReset={list.isDirty ? list.reset : undefined} />
            )}
          </TableBody>
        </Table>
      </div>

      {/* ----------- PAGINATION ----------- */}
      <div className="py-2 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) on this page selected.
      </div>
      <DataTablePagination
        page={list.page}
        pageSize={list.pageSize}
        total={filteredTotal}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        isLoading={isFetching}
        itemLabel="listings"
      />
    </div>
  );
}
