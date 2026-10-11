import { Key, User, Users, UsersRound, UserRound } from "lucide-react";
import Link from "next/link";
import { formatTime12h } from "@/lib/format";

export default function PropertyDescription({ description, property }) {
  function prettify(str) {
    return str.replace(/(-|^)([^-]?)/g, function (_, prep, letter) {
      return (prep && " ") + letter.toUpperCase();
    });
  }
  const allAmenities = [
    {
      id: "self-check-in",
      title: "Self Check In",
      icon: Key,
      category: "standout",
      selected: false,
    },
    {
      id: "me",
      title: "Me",
      icon: User,
      category: "standout",
      selected: false,
    },
    {
      id: "family",
      title: "Family",
      icon: Users,
      category: "standout",
      selected: false,
    },
    {
      id: "guests",
      title: "Guests",
      icon: UsersRound,
      category: "standout",
      selected: false,
    },
    {
      id: "flatmates",
      title: "Flat Mates",
      icon: UserRound,
      category: "standout",
      selected: false,
    },
  ];

  // Filter the amenities using the dynamic prop (matching by id)
  const matchedAmenities = allAmenities?.filter((amenity) =>
    property?.occupancy?.includes(amenity.id)
  );
  return (
    <>
      <div className="border-b pb-6 mb-6">
        <p className="text-gray-800 mb-4">{description}</p>

        <button className="hidden  items-center font-medium">
          Show more
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-1"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div className="border-b pb-6 mb-6">
        <h2 className="text-xl font-medium mb-6">Who else might be there</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedAmenities.map((amenity, index) => (
            <div key={index} className="flex items-center gap-4">
              <amenity.icon className="h-6 w-6 text-gray-600" />
              <span>{amenity?.title}</span>
            </div>
          ))}
        </div>

        <button className="hidden  items-center font-medium">
          Show more
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-1"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      {/* One column below 360: two-up left each policy 120px wide at 320. */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-4">
        <div className="border-b pb-6 mb-6">
          <h2 className="text-xl font-medium mb-6">Cancellation Policy</h2>
          <p className="text-gray-800 mb-4">
            {property?.cancellationType &&
              Object.entries(property.cancellationType).map(([key, value]) =>
                value ? (
                  <div key={key}>
                    This property has {key} level cancellation policy.
                  </div>
                ) : null
              )}
          </p>
          {/* <Link href={"/cancellation-policy"} className="underline">
            Learn more
          </Link> */}

          <button className="hidden  items-center font-medium">
            Show more
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <div className="border-b pb-6 mb-6">
          <h2 className="text-xl font-medium mb-6">Things to know</h2>
          <p className="text-gray-800 mb-4">
            <div className="">
              {" "}
              {/* formatTime12h validates each time on its own: the check-out
                  branch used to test checkinTime, printing "-1 p.m." or
                  "NaN p.m." when check-out was earlier or missing. */}
              The check in time is{" "}
              {formatTime12h(property?.checkinTime, "TBD")}{" "}
              and the check out time is{" "}
              {formatTime12h(property?.checkoutTime, "TBD")}
              .
            </div>
          </p>
          {/* <Link href={"/cancellation-policy"} className="underline">
            Learn more
          </Link> */}

          <button className="hidden  items-center font-medium">
            Show more
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
