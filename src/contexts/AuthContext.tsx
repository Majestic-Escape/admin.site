"use client";

import { usePathname } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCheckToken } from "@/services/useCheckToken";
import { isPlainObject, readJSON } from "@/lib/storage";
type Admin = {
  email: string;

  // Add other admin properties as needed
};

type Address = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Preferences = {
  currency: string;
  language: string;
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  theme: "light" | "dark";
};

type OTP = {
  value: string;
  expiry: string; // ISO string
};

type Verification = {
  emailVerified: boolean;
  idVerified: boolean;
  phoneVerified: boolean;
};

type HostStatus = {
  active: boolean;
  banned: boolean;
};

type Hosts = {
  _id: string;
  about: string;

  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  dob: string; // ISO date string

  address: Address;

  languages: string[];

  profilePicture: string;

  role: "user" | "admin" | "host";
  status: HostStatus;

  isVerified: boolean;
  kyc: boolean;
  kycDocCount: number;
  bank: boolean;

  totalPropertyCount: number;
  activePropertyCount: number;

  averageRating: number;
  avgPropertyRating: number;
  reviewCount: number;
  propertyReviewCount: number;

  bookings: any[];
  wishlist: any[];

  hostOffer: boolean;

  preferences: Preferences;

  otp: OTP;
  otpRetries: number;
  lockUntil: string;

  verification: Verification;
  socialAccounts: any[];

  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
};

type AuthContextType = {
  admin: Admin | null;
  hosts: Hosts | null;
  setHosts: React.Dispatch<React.SetStateAction<Hosts | null>>;
  login: (admin: Admin) => void;
  logout: () => void;
  hostId: String;
  setHostId: React.Dispatch<React.SetStateAction<String>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [hosts, setHosts] = useState<Hosts | null>(null);
  const [hostId, setHostId] = useState<String>("");
  const queryClient = useQueryClient();
  useEffect(() => {
    // Check for existing admin in localStorage on initial load (tolerant of
    // a corrupt value: a parse error here used to take every route down).
    const storedAdmin = readJSON<Admin | null>(
      localStorage,
      "admin",
      null,
      (v): v is Admin => isPlainObject(v),
    );
    if (storedAdmin) {
      setAdmin(storedAdmin);
    }
  }, []);

  const login = (adminData: Admin) => {
    // Never reuse another account's cached data in the same tab.
    queryClient.clear();
    setAdmin(adminData);
    localStorage.setItem("admin", JSON.stringify(adminData));
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem("admin");
    queryClient.clear();
  };
  const { checkToken } = useCheckToken();
  const pathname = usePathname();

  // useEffect(() => {
  //   const verify = async () => {
  //     await checkToken();
  //   };
  //   verify();
  // }, [pathname]);
  const value: AuthContextType = {
    admin,
    login,
    logout,
    hosts,
    setHosts,
    hostId,
    setHostId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
//   return (
//     <AuthContext.Provider value={{ admin, login, logout, host }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
