// /services/useCheckToken.js
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useCheckToken() {
  const router = useRouter();

  const checkToken = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("token"));

      if (token) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/check-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          //   if (result.code === "USER_BANNED") {
          //     localStorage.clear();
          //     sessionStorage.clear();

          //     router.push("/login");
          //     toast.error("Your account has been banned.");
          //   }
          // if (result.code === "TOKEN_INVALIDATED") {
          //   localStorage.clear();
          //   sessionStorage.clear();
          //   router.push("/login");
          //   toast.error("Session expired, please login again.");
          // }
          if (result.code === "TOKEN_EXPIRED") {
            localStorage.clear();
            sessionStorage.clear();
            router.push("/");
            toast.error("Session expired, please login again.");
          }
          return null;
        }

        return result;
      }
    } catch (err) {
      console.error(err);
    }
  };

  return { checkToken };
}
