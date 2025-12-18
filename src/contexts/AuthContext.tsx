"use client";

import { usePathname } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useCheckToken } from "@/services/useCheckToken";
type Admin = {
  email: string;

  // Add other admin properties as needed
};

type AuthContextType = {
  admin: Admin | null;
  login: (admin: Admin) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    // Check for existing admin in localStorage on initial load
    const storedAdmin = localStorage.getItem("admin");
    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }
  }, []);

  const login = (adminData: Admin) => {
    setAdmin(adminData);
    localStorage.setItem("admin", JSON.stringify(adminData));
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem("admin");
  };
  const { checkToken } = useCheckToken();
  const pathname = usePathname();

  // useEffect(() => {
  //   const verify = async () => {
  //     await checkToken();
  //   };
  //   verify();
  // }, [pathname]);
  return (
    <AuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
