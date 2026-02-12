"use client";

import { use, useEffect, useRef, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TextReveal } from "@/components/text-reveal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, DoorOpenIcon as Door } from "lucide-react";
import { Label } from "@/components/ui/label";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const INDIA_STATES_AND_UT = [
  // 28 States
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // 8 Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export function Location({ formData, updateFormData }) {
  // 🔥 Get address directly from formData (no local state for address)
  const address = formData?.address || {
    street: "",
    district: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    latitude: "",
    longitude: "",
    registrationNumber: "",
  };

  const [registrationNumberError, setRegistrationNumberError] = useState("");
  const [registrationNumberLoading, setRegistrationNumberLoading] =
    useState(false);

  const [validRegistrationNo, setValidRegistrationNo] = useState(
    formData?.validRegistrationNo || false,
  );

  // 🔥 mapCenter derived from address (no sync needed)
  const mapCenter = {
    lat: address.latitude ? address.latitude : 15.2993,
    lng: address.longitude ? address.longitude : 74.124,
  };

  const previousStateRef = useRef(formData?.address?.state);

  const [searchValue, setSearchValue] = useState("");
  const [locationStatus, setLocationStatus] = useState({
    loading: false,
    error: null,
    showApproxLocation: false,
    permissionState: null,
  });

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const googleMapsRef = useRef(null);

  // 🔥 Effect to update registration number when state changes
  useEffect(() => {
    if (previousStateRef.current !== address.state) {
      // Update parent directly when state changes
      updateFormData({
        address: { ...address, registrationNumber: "" },
        validRegistrationNo: false,
      });
    }
    previousStateRef.current = address.state;
  }, [address.state, updateFormData]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLocationStatus((prev) => ({
        ...prev,
        error:
          "Google Maps API key is not configured. Please check your environment variables.",
      }));
      return;
    }
    checkPermissionStatus();
    loadGoogleMapsScript();
  }, []);

  const loadGoogleMapsScript = () => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => {
      setLocationStatus((prev) => ({
        ...prev,
        error:
          "Failed to load Google Maps. Please check your internet connection and try again.",
      }));
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current) return;

    googleMapsRef.current = window.google.maps;
    mapInstanceRef.current = new googleMapsRef.current.Map(mapRef.current, {
      center: mapCenter, // 🔥 Uses derived mapCenter
      zoom: 12,
    });

    markerRef.current = new googleMapsRef.current.Marker({
      map: mapInstanceRef.current,
      position: mapCenter, // 🔥 Uses derived mapCenter
      draggable: true,
    });

    googleMapsRef.current.event.addListener(
      markerRef.current,
      "dragend",
      handleMarkerDragEnd,
    );

    autocompleteRef.current = new googleMapsRef.current.places.Autocomplete(
      document.getElementById("address-input"),
      {
        componentRestrictions: { country: "IN" },
        bounds: new googleMapsRef.current.LatLngBounds(
          new googleMapsRef.current.LatLng(14.8, 73.6),
          new googleMapsRef.current.LatLng(15.8, 74.3),
        ),
        strictBounds: true,
      },
    );

    autocompleteRef.current.addListener("place_changed", handlePlaceSelect);
  };

  const handleMarkerDragEnd = () => {
    const position = markerRef.current.getPosition();
    const lat = position.lat();
    const lng = position.lng();

    updateAddressFromCoordinates(lat, lng);
  };

  const updateAddressFromCoordinates = (lat, lng) => {
    const geocoder = new googleMapsRef.current.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results[0]) {
        const place = results[0];
        updateAddressFromPlace(place);
      }
    });
  };

  const updateAddressFromPlace = (place) => {
    const newAddress = {
      street: "",
      district: "",
      city: "",
      state: "",
      pincode: "",
      country: "India - IN",
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      // Preserve registration number
      registrationNumber: address.registrationNumber,
    };

    place.address_components.forEach((component) => {
      if (component.types?.includes("route"))
        newAddress.street = component.long_name;
      if (component.types?.includes("sublocality_level_1"))
        newAddress.district = component.long_name;
      if (component.types?.includes("locality"))
        newAddress.city = component.long_name;
      if (component.types?.includes("administrative_area_level_1"))
        newAddress.state = component.long_name;
      if (component.types?.includes("postal_code"))
        newAddress.pincode = component.long_name;
    });

    // 🔥 Update parent directly
    updateFormData({ address: newAddress });
    setSearchValue(place.formatted_address);

    // Update map position
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setCenter({
        lat: newAddress.latitude,
        lng: newAddress.longitude,
      });
      markerRef.current.setPosition({
        lat: newAddress.latitude,
        lng: newAddress.longitude,
      });
    }
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry) return;

    updateAddressFromPlace(place);
  };

  const checkPermissionStatus = async () => {
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        setLocationStatus((prev) => ({
          ...prev,
          permissionState: permission.state,
        }));
      } catch (error) {
        console.error("Error checking geolocation permission:", error);
        setLocationStatus((prev) => ({
          ...prev,
          error: "Error checking location permission",
        }));
      }
    }
  };

  const getCurrentLocation = async () => {
    if (locationStatus.permissionState === "denied") {
      setLocationStatus((prev) => ({
        ...prev,
        error: "Location access denied",
      }));
      return;
    }

    setLocationStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      updateAddressFromCoordinates(latitude, longitude);

      setLocationStatus((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log(error);
      }
      setLocationStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Error getting current location",
      }));
    }
  };

  const checkRegistrationNumber = async (number) => {
    setRegistrationNumberLoading(true);
    try {
      if (address.state == "Goa") {
        const response = await fetch(
          `${API_BASE_URL}/property-registration-no/${number}`,
        );

        if (!response.ok) {
          const data = await response.json();
          setRegistrationNumberError(data?.message);
          setValidRegistrationNo(false);
          updateFormData({ validRegistrationNo: false });
        } else {
          const data = await response.json();
          if (!data.exists) {
            setRegistrationNumberError(data?.message);
            setValidRegistrationNo(false);
            updateFormData({ validRegistrationNo: false });
          } else {
            setRegistrationNumberError("");
            setValidRegistrationNo(true);
            updateFormData({ validRegistrationNo: true });
          }
        }
      } else {
        setRegistrationNumberError("");
        setValidRegistrationNo(true);
        updateFormData({ validRegistrationNo: true });
      }
    } catch (error) {
      console.error("Error checking registration number:", error);
      setRegistrationNumberError("Error verifying registration number");
      setValidRegistrationNo(false);
      updateFormData({ validRegistrationNo: false });
    } finally {
      setRegistrationNumberLoading(false);
    }
  };

  const handleRegistrationInputChange = (e) => {
    let value = e.target.value.toUpperCase().slice(0, 30);

    const newAddress = { ...address, registrationNumber: value };

    // Reset validity
    setValidRegistrationNo(false);
    updateFormData({
      address: newAddress,
      validRegistrationNo: false,
    });

    const isGoa = address.state === "Goa";

    if (!isGoa) {
      setRegistrationNumberError("");
      setValidRegistrationNo(true);
      updateFormData({ validRegistrationNo: true });
      return;
    }

    if (value.trim() === "") {
      setRegistrationNumberError("");
      setValidRegistrationNo(true);
      updateFormData({ validRegistrationNo: true });
      return;
    }

    const regEx = /^(HOTN|HOTS)[A-Z0-9]{6}$/;

    if (value.length < 10) {
      setRegistrationNumberError("");
      return;
    }

    if (!regEx.test(value)) {
      setRegistrationNumberError("Invalid Goa registration");
      return;
    }

    setRegistrationNumberError("");
    checkRegistrationNumber(value);
  };

  const handleManualInputChange = (key, value) => {
    const newAddress = { ...address, [key]: value };
    updateFormData({ address: newAddress });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className="bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Property Address
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          {locationStatus.showApproxLocation && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="flex items-center">
                <div className="bg-rose-100 p-3 rounded-full">
                  <MapPin className="text-rose-500" />
                </div>
                <p className="ml-3">We'll share your approximate location.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-x-8 justify-between items-start md:flex-row gap-y-4">
            <div className="w-full md:w-1/2">
              <TextReveal>
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      id="address-input"
                      type="text"
                      placeholder="Enter your address"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full h-12 p-4 border rounded-t-lg"
                    />
                    <Button
                      onClick={getCurrentLocation}
                      disabled={locationStatus.loading}
                      className="w-full mt-2 p-4 h-12 flex items-center justify-center gap-2 text-absoluteDark bg-gray-100 border border-gray-400 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                      {locationStatus.loading ? (
                        <Loader2 className="text-absoluteDark animate-spin" />
                      ) : (
                        <>
                          <Navigation className="text-absoluteDark inline-block" />
                          <span className="text-absoluteDark">
                            {locationStatus.permissionState === "prompt"
                              ? "Allow location access"
                              : "Use my current location"}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TextReveal>
              <div className="mt-6">
                <div
                  ref={mapRef}
                  className="h-[400px] rounded-lg overflow-hidden z-10"
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                You can drag the pin to adjust the location
              </p>
            </div>
            <div className="md:w-1/2 space-y-4 mt-6 md:mt-0">
              <Label className="text-lg font-semibold">
                Property Registration Number
              </Label>
              <div className="relative">
                <Input
                  value={address.registrationNumber || ""}
                  onChange={handleRegistrationInputChange}
                  placeholder="Enter your registration number"
                  className="w-full p-4 border rounded-lg"
                />
                {registrationNumberLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 animate-spin" />
                )}
              </div>
              {registrationNumberError && (
                <p className="text-red-500 text-sm">
                  {registrationNumberError}
                </p>
              )}
              {address.state == "Goa" && (
                <p className="text-sm text-gray-600 pl-1">
                  Don't have a registration no.?{" "}
                  <Link
                    className="text-primaryGreen underline text-base"
                    target="_blank"
                    href="https://goaonline.gov.in/Appln/Uil/DeptServices?__DocId=TOU&__ServiceId=TOU03"
                  >
                    Register here
                  </Link>
                </p>
              )}

              <hr />
              <h3 className="text-lg font-semibold">
                Confirm or edit your address details
              </h3>
              <Select
                value={address.country || undefined}
                onValueChange={(value) =>
                  handleManualInputChange("country", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="India - IN">India - IN</SelectItem>
                </SelectContent>
              </Select>

              {[
                { key: "street", placeholder: "Street, area..." },
                { key: "district", placeholder: "District / locality" },
                { key: "city", placeholder: "City / town" },
                { key: "pincode", placeholder: "PIN code should be 6 digits" },
              ].map(({ key, placeholder }) =>
                key === "pincode" ? (
                  <div key={key}>
                    <Input
                      value={address[key] || ""}
                      onChange={(e) =>
                        handleManualInputChange(key, e.target.value)
                      }
                      placeholder={placeholder}
                      className="w-full p-4 border rounded-lg"
                      maxLength={6}
                      minLength={6}
                    />
                    <Select
                      value={address.state || undefined}
                      onValueChange={(value) =>
                        handleManualInputChange("state", value)
                      }
                    >
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIA_STATES_AND_UT.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Input
                    key={key}
                    value={address[key] || ""}
                    onChange={(e) =>
                      handleManualInputChange(key, e.target.value)
                    }
                    placeholder={placeholder}
                    className="w-full p-4 border rounded-lg"
                  />
                ),
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
