"use client";

import { useState, useEffect } from "react";
import { addDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import BookingWidget from "./booking-widget";
import PropertyHighlights from "./property-highlights";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import PropertyDescription from "./property-description";
import PropertyAmenities from "./property-amenities";
import PropertySleepingArrangements from "./property-sleeping-arrangements";

export default function PropertyDetails({
  hostData,
  propertyDetails,
  isLoading,
}) {
  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("z Host data", hostData);
  }

  if (process.env.NEXT_PUBLIC_ENV === "dev") {
    console.log("z propertyDetails data", propertyDetails);
  }

  const [showAmenitiesDialog, setShowAmenitiesDialog] = useState(false);
  const [amenities, setAmenities] = useState();
  const [safetyFeatures, setSafetyFeatures] = useState();
  const [selectedRules, setSelectedRules] = useState();
  const [customRules, setCustomRules] = useState();
  useEffect(() => {
    setAmenities(propertyDetails?.amenities);

    setSafetyFeatures(propertyDetails?.safetyFeatures);
    setSelectedRules(propertyDetails?.selectedRules);
    setCustomRules(propertyDetails?.customRules);
  }, []);
  function removeHypen(str) {
    const first = str
      .replace(/[-_]+/g, " ") // Replace hyphens and underscores with spaces
      .replace(/(^| )([a-z])/g, (match) => match.toUpperCase()); // Capitalize first letter after space or start

    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  return (
    <div className="max-w-7xl  mx-auto relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6 px-4 lg:px-0">
        <div className="lg:col-span-2">
          <div className="border-b pb-6 mb-6">
            <div className="flex items-center gap-4 mt-6">
              {propertyDetails?.placeType[0].toUpperCase() +
                propertyDetails?.placeType.slice(1)}{" "}
              {propertyDetails?.propertyType[0].toUpperCase() +
                propertyDetails?.propertyType.slice(1)}
            </div>
            <div className="flex items-center gap-4 mt-6">
              {propertyDetails?.guests} Guests | {propertyDetails?.beds} Beds |{" "}
              {propertyDetails?.bedrooms} Bedroom | {propertyDetails?.bathrooms}{" "}
              Bathroom
            </div>
            <div className="flex items-center gap-4 mt-6">
              <Avatar className="h-8 w-8 md:h-12 md:w-12">
                <AvatarImage
                  src="/placeholder.svg?height=40&width=40"
                  alt="Host"
                />
                <AvatarFallback>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-base md:text-lg font-medium text-stone">
                  Hosted by{" "}
                  <span className="text-absoluteDark font-semibold">
                    {hostData?.firstName} {hostData?.lastName}
                  </span>
                </h2>
                {/* <p className="text-gray-600">2 years hosting</p> */}
              </div>
            </div>
          </div>
          {/* <PropertyHighlights /> */}
          <PropertyDescription
            description={propertyDetails?.description}
            property={propertyDetails}
          />
          <PropertyAmenities
            amenities={propertyDetails?.amenities || []}
            showAmenitiesDialog={showAmenitiesDialog}
            setShowAmenitiesDialog={setShowAmenitiesDialog}
            safety={propertyDetails?.safetyFeatures || []}
            rules={propertyDetails?.selectedRules || []}
            custom={propertyDetails?.customRules || []}
          />

          {/* <PropertySleepingArrangements  
          bedRoom = {propertyDetails?.bedRooms}
          beds = {propertyDetails?.beds}
          /> */}
        </div>

        <div className="lg:sticky lg:top-0 lg:right-0 lg:self-start">
          {/* <BookingWidget
            propertyId={propertyDetails?._id}
            propertyImages={propertyDetails?.photos}
            pricePerNight={propertyDetails?.basePrice}
            date={date}
            guests={guests}
            showCalendar={showCalendar}
            showGuestsDropdown={showGuestsDropdown}
            onDateSelect={handleDateSelect}
            onGuestChange={handleGuestChange}
            toggleCalendar={toggleCalendar}
            toggleGuestsDropdown={toggleGuestsDropdown}
          /> */}
        </div>
      </div>
    </div>
  );
}
