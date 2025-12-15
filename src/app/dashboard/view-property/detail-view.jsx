"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect, useState } from "react";
import ImageCollection from "./component/image-collection";
import PropertyDetails from "./component/property-details";
import HostProfile from "./component/host-profile";
import DialogModal from "../../../components/dialog-modal";
import { propertyService } from "../../../services/propertyListingService";
import { Button } from "@/components/ui/button";
// import PropertyListing from "./components/property-listing";
// import Location from "./components/location";
// import ThingsToKnow from "./components/things-to-know";
// import HostProfile from "./components/host-profile"; // Assuming this is the refactored component
// import ReviewSection from "./components/review-section";
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const fetchProperty = async (id) => {
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("entered");
  }
  if (!id) throw new Error("Property ID is missing");
  const response = await fetch(`${API_URL}/properties/${id}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch property data (status: ${response.status})`
    );
  }
  const result = await response.json();
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log(result.data);
  }
  return result.data;
};

const fetchHostData = async (hostIdStr) => {
  if (!hostIdStr) {
    throw new Error("Host ID is missing");
  }
  const getLocalData = await localStorage.getItem("token");
  const data = JSON.parse(getLocalData);
  // const response = await fetch(`${API_URL}/hostData/${hostIdStr}`);
  const response = await fetch(`${API_URL}/hostData/${hostIdStr}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch host data (status: ${response.status})`);
  }
  const result = await response.json();
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("resp", result.data);
  }
  return result.data;
};

export default function DetailView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get("property");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  // const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [delistDialogOpen, setDelistDialogOpen] = useState(false);
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("id", propertyId);
  }

  const {
    data: propertyData,
    isLoading: isPropertyLoading, // Renamed for clarity
    error: propertyError, // Renamed for clarity
    isFetching: isPropertyFetching,
    isError: isPropertyError,
    refetch: refetchProperty,
  } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => fetchProperty(propertyId),
    enabled: !!propertyId, // Only run if propertyId exists
    // Optional: Add staleTime, cacheTime etc.
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const hostId = propertyData?.host;

  const hostIdStr = useMemo(() => {
    if (!hostId) return null;
    return typeof hostId === "object"
      ? hostId._id
        ? hostId._id.toString()
        : JSON.stringify(hostId) // Less ideal fallback
      : typeof hostId === "string"
        ? hostId
        : String(hostId);
  }, [hostId]); // Recalculate only if hostId changes

  // --- Query 2: Fetch Host Data ---
  const {
    data: hostData,
    isLoading: isHostLoading, // Renamed for clarity
    error: hostError, // Renamed for clarity
    isFetching: isHostFetching,
    isError: isHostError,
    refetch: refetchHost,
  } = useQuery({
    queryKey: ["hostProfile", hostIdStr], // Use normalized hostIdStr in key
    queryFn: () => fetchHostData(hostIdStr),
    // Enable only when we have a valid, non-empty string hostIdStr
    enabled:
      !!hostIdStr && typeof hostIdStr === "string" && hostIdStr.length > 0,
    // Optional: Configure caching/retries differently for host data if needed
    // staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const hostFirstName = propertyData?.host?.name?.split(" ")[0] || "Host";
  const locationInfo = {
    lat: propertyData?.address?.latitude,
    long: propertyData?.address?.longitude,
    address:
      propertyData?.address?.city &&
      propertyData?.address?.state &&
      propertyData?.address?.country
        ? `${propertyData.address.city}, ${propertyData.address.state}, ${propertyData.address.country}`
        : "Location not fully specified",
  };

  return (
    <main className="min-h-screen pt-16 md:pt-32 bg-white">
      <DialogModal
        choice={"Approve"}
        open={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
        }}
        onConfirm={async () => {
          if (process.env.NEXT_PUBLIC_ENV === "dev") {
            console.log("ins", propertyId);
          }
          await propertyService.approveListing(propertyId);
          setApproveDialogOpen(false);
          refetchProperty();
          refetchHost();
        }}
      />
      {/* <DialogModal
        choice={"Delete"}
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
        }}
        onConfirm={async () => {
          await propertyService.handleConfirmDelete(propertyId);
          setDeleteDialogOpen(false);
          router.push("/dashboard/properties");
        }}
      /> */}
      <DialogModal
        choice={"Delist"}
        open={delistDialogOpen}
        onClose={() => {
          setDelistDialogOpen(false);
        }}
        onConfirm={async () => {
          await propertyService.handleConfirmDelist(propertyId);
          setDelistDialogOpen(false);
          refetchProperty();
          refetchHost();
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Property Title */}
        {propertyData ? (
          <>
            <div className="mb-4 md:mb-6 ">
              <span className="font-bold">Property Status</span> :{" "}
              {propertyData?.status.charAt(0).toUpperCase()}
              {propertyData?.status.slice(1)}
            </div>
            <div className="mb-4 md:mb-6">
              {propertyData?.status != "active" ? (
                <Button
                  className="mr-4 bg-primaryGreen text-white py-3 rounded-md w-half mr-4"
                  onClick={() => setApproveDialogOpen(true)}
                >
                  Approve
                </Button>
              ) : null}
              {/* <Button
                className="mr-4"
                onClick={() => setDeleteDialogOpen(true)}
                variant="destructive"
              >
                Delete
              </Button> */}
              {propertyData?.status == "active" ? (
                <Button
                  variant="outline"
                  onClick={() => setDelistDialogOpen(true)}
                >
                  Delist
                </Button>
              ) : null}
            </div>
          </>
        ) : null}

        <h1 className="text-xl md:text-2xl font-bricolage font-semibold mb-4 md:mb-6">
          {propertyData?.title || "Property Title"}
        </h1>

        {/* Image Gallery */}
        {/* Pass isPropertyLoading here as images depend on property data */}
        <ImageCollection
          images={propertyData?.photos || []}
          isLoading={isPropertyLoading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-0 md:mt-8">
          {" "}
          {/* Added grid layout */}
          {/* Left Column (Listing Details) */}
          <div className="lg:col-span-2 space-y-8">
            {" "}
            {/* Takes 2/3 width on large screens */}
            {/* Property Listing Details */}
            {/* Pass isPropertyLoading if PropertyListing needs it */}
            <PropertyDetails
              hostData={hostData}
              propertyDetails={propertyData}
              isLoading={isPropertyLoading}
            />
            {/* Review Section */}
            {/* Pass relevant review data and potentially property ID */}
          </div>
        </div>

        {/* Sections below the main grid */}
        <div className="mt-12 space-y-12">
          {" "}
          {/* Add spacing */}
          {/* Location Map */}
          {/* <Location
            locationInfo={locationInfo}
            isLoading={isPropertyLoading} // Map depends on property location data
          /> */}
          {/* Host Profile */}
          {/* Pass data/loading/error states from the *host* query */}
          <HostProfile
            hostData={hostData}
            isLoading={isHostLoading}
            error={hostError}
          />
          {/* Things To Know */}
          {/* Pass isPropertyLoading if ThingsToKnow depends on it */}
          {/* <ThingsToKnow thingsToKnow={propertyData?.thingsToKnow || {}} isLoading={isPropertyLoading} /> */}
        </div>
      </div>
    </main>
  );
}
