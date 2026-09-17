"use client";
import { use, useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { toast } from "sonner";
import axios from "axios";
import { adminAuthHeaders } from "@/lib/admin-token";
import { PropertyType } from "./component/property-type";
import { PlaceType } from "./component/place-type";
import { Location } from "./component/address";
import { BasicDetails } from "./component/basic-details";
import { Bathroom } from "./component/bathroom";
import { Other } from "./component/other-details";
import { Button } from "@/components/ui/button";
import { Amenities } from "./component/amenities";
import { Images } from "./component/images";
import { Title } from "./component/title";
import { Cancellation } from "./component/cancellation";
import { Time } from "./component/timing";
import { Reservation } from "./component/reservation";
import { Price } from "./component/price";
import { Safety } from "./component/safety";
import { Stay } from "./component/stay";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const EditPropertyPage = () => {
  const collapsible = false;
  const { id } = useParams();

  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialStatus, setInitialStatus] = useState(null);

  const router = useRouter();

  useEffect(() => {
    const fetchListingData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        // The raw document (host email, street, registration number) is
        // admin-only on the backend: send the admin session.
        const response = await axios.get(
          `${API_BASE_URL}/prop-listing/admin/${id}`,
          { headers: adminAuthHeaders() },
        );
        const listing = await response?.data;

        setOriginalData(listing.data);
        setFormData(listing.data);
        // setInitialStatus(listing.status);
      } catch (error) {
        toast.error("Failed to fetch listing data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListingData();
  }, [id]);
  console.log("or", originalData);
  const updateFormData = (stepData) => {
    setFormData((prevData) => ({
      ...prevData,
      ...stepData,
    }));
  };
  const updateProperty = async (id, propertyData) => {
    try {
      console.log("updated the property info", propertyData);
      const response = await axios.put(
        `${API_BASE_URL}/properties/admin-update-property/${id}`,
        propertyData,
        { headers: adminAuthHeaders() },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to update property",
      );
    }
  };
  const handleSubmit = async () => {
    const toastId = toast.loading("Updating your listing...");
    try {
      await updateProperty(id, {
        ...formData,
        status: formData?.status,
      });

      toast.dismiss(toastId);
      const status = formData?.status || "active";
      let successMessage = "Listing has been updated.";

      toast.success(successMessage);
      setTimeout(() => {
        // setShowMembershipPopup(true);
      }, 2000);
      // router.push("/host/dashboard");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading property details...</div>
      </div>
    );
  }

  if (!formData && !formData?.id) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">No property data found.</div>
        <Button onClick={() => router.back()} className="ml-4">
          Go Back
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="pt-8 px-8">
        {" "}
        <h2 className="text-3xl font-semibold tracking-tight font-bricolage">
          Edit Mode
        </h2>
        <Button
          onClick={handleSubmit}
          className="mt-8 bg-primaryGreen rounded-3xl hover:bg-brightGreen py-5 px-6 text-white"
        >
          Update
        </Button>
      </div>
      <div className="flex flex-col justify-center items-center px-8 py-8">
        <PropertyType
          key={"propertyType"}
          formData={formData}
          updateFormData={updateFormData}
        />
        <PlaceType
          key={"placeType"}
          formData={formData}
          updateFormData={updateFormData}
        />
        <Location
          key={"location"}
          formData={formData}
          updateFormData={updateFormData}
        />
        <BasicDetails
          key={"basic"}
          formData={formData}
          updateFormData={updateFormData}
        />
        <Bathroom
          key={"bathroom"}
          formData={formData}
          updateFormData={updateFormData}
        />
        <Other
          key={"other"}
          formData={formData}
          updateFormData={updateFormData}
        />
        <Amenities formData={formData} updateFormData={updateFormData} />
        <Images formData={formData} updateFormData={updateFormData} />
        <Title formData={formData} updateFormData={updateFormData} />
        <Cancellation
          key={"cancel"}
          formData={formData}
          updateFormData={updateFormData}
        />
        <Time formData={formData} updateFormData={updateFormData} />
        <Reservation formData={formData} updateFormData={updateFormData} />
        <Price formData={formData} updateFormData={updateFormData} />
        <Safety formData={formData} updateFormData={updateFormData} />
        <Stay formData={formData} updateFormData={updateFormData} />
      </div>
    </>
  );
};

export default EditPropertyPage;
