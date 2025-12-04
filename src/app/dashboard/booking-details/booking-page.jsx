"use client";

import React, { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Info, MapPin } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function BookingPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");
  const [queryData, setQueryData] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [fetchedData, setFetchedData] = useState([]);
  const auth = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);

    if (data) setIsAuth(true);
  };
  const router = useRouter();
  useEffect(() => {
    auth();
  }, []);
  console.log("bookingId", bookingId);
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const getLocalData = await localStorage.getItem("token");
        const data = JSON.parse(getLocalData);
        if (data) {
          const response = await fetch(`${API_URL}/booking/${bookingId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${data}`,
              "Content-Type": "application/json",
            },
          });
          if (!response.ok) {
            return;
          }
          const result = await response.json();
          setFetchedData(result.data);
          return result.data;
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchBooking();
  }, []);

  const changeTime = (num) => {
    return `${Number(num) - 12} p.m.`;
  };
  console.log("m", fetchedData);
  if (fetchedData.length == 0)
    return (
      <div className="min-h-screen font-poppins pt-24">
        <p>Loading...</p>
      </div>
    );

  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins pt-24">
        You are not authorized to access this page. &nbsp;{" "}
        <Link href="/login">
          <u>
            <b>Click Here</b>
          </u>
        </Link>
        &nbsp; to log in now to access.
      </div>
    );
  }
  const checkInDate = new Date(fetchedData?.checkIn);

  const checkOutDate = new Date(fetchedData?.checkOut);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="min-h-screen font-poppins">
      <header className="flow-root bg-offWhite shadow-sm">
        <div className=" max-w-7xl mx-auto py-4 ml-10 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold font-bricolage text-absoluteDark mt-4">
              {fetchedData?.hostId?.firstName +
                " " +
                fetchedData?.hostId?.lastName}
            </h2>
            <p className="pt-3">
              <span className=" text-gray-500 font-bold"> Booking Id : </span>{" "}
              {fetchedData?._id}
            </p>

            <p className="pt-3">
              <span className="text-gray-500 font-bold"> Contact : (+91) </span>{" "}
              {fetchedData?.hostId?.phoneNumber}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700"></h4>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 border rounded-xl p-4 shadow-lg">
              <div>
                <Image
                  src="/sf-loft.jpg"
                  alt="Cozy SF Loft"
                  width={600}
                  height={400}
                  className="rounded-xl"
                />
                <h3 className="mt-4 text-lg font-medium">
                  {fetchedData?.propertyId?.photos}
                </h3>
                <p className="text-gray-600 text-sm">
                  {fetchedData?.propertyId?.placeType.charAt(0).toUpperCase() +
                    fetchedData?.propertyId?.placeType.slice(1)}{" "}
                  {fetchedData?.propertyId?.propertyType
                    .charAt(0)
                    .toUpperCase() +
                    fetchedData?.propertyId?.propertyType.slice(1)}{" "}
                  by {fetchedData?.userId?.firstName}{" "}
                  {fetchedData?.userId?.hostLastName}
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p>
                      {days[checkInDate?.getDay()]},{" "}
                      <strong>
                        {months[checkInDate?.getMonth()]}{" "}
                        {checkInDate?.getDate()}, {checkInDate?.getFullYear()}
                      </strong>
                      <br />
                      Check-in :{" "}
                      {fetchedData?.propertyId?.checkinTime > 11
                        ? changeTime(fetchedData?.propertyId?.checkinTime)
                        : `${fetchedData?.propertyId?.checkinTime} a.m.`}
                    </p>
                  </div>
                  <div>
                    <p>
                      {days[checkOutDate?.getDay()]},{" "}
                      <strong>
                        {months[checkOutDate?.getMonth()]}{" "}
                        {checkOutDate?.getDate()}, {checkOutDate?.getFullYear()}
                      </strong>
                      <br />
                      Check-out :{" "}
                      {fetchedData?.propertyId?.checkoutTime > 11
                        ? changeTime(fetchedData?.propertyId?.checkoutTime)
                        : `${fetchedData?.propertyId?.checkoutTime} a.m.`}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Nights</h4>
                    <p className="text-gray-500">{fetchedData?.nights}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700">Total Guests</h4>
                    <p className="text-gray-500">{fetchedData?.guests}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Adults</h4>
                    <p className="text-gray-500">{fetchedData?.adults}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Children</h4>
                    <p className="text-gray-500">{fetchedData?.children}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Infants</h4>
                    <p className="text-gray-500">{fetchedData?.infants}</p>
                  </div>
                </div>
                <button className="w-full border border-gray-300 py-2 rounded-lg">
                  Change reservation
                </button>
                <div>
                  <h4 className="font-medium text-gray-700">Email</h4>
                  <p className="text-gray-500">
                    {fetchedData?.hostId?.email}hdjjdksjdlskdlsk
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Amount Paid</h4>
                  <p className="text-gray-500">₹{fetchedData?.price}.00</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">
                    Know what to expect
                  </h4>
                  <p className="text-gray-500">
                    Make sure to review the house rules and amenities.
                  </p>
                  <button className="text-red-400 text-xs mt-1">
                    View House Rules
                  </button>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">
                    Customer support
                  </h4>
                  <p className="text-gray-500">
                    Contact our support team 24/7 from anywhere in the world.
                  </p>
                  <div className="flex gap-2 mt-1">
                    {/* <button className="text-red-400 text-xs">
                    Visit Help Centre
                  </button>
                  <button className="text-red-400 text-xs">
                    Contact Airbnb
                  </button> */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-semibold text-primary">
                  Contact Us
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  If you have any questions about our Cancellation Policy,
                  please contact us.
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-primary sm:mt-0 sm:col-span-2">
                      <a
                        className="underline"
                        href="mailto:support@majesticescape.in"
                      >
                        support@majesticescape.in
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
