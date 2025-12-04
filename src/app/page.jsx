/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/login-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast, Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
});

export default function Home() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const validateStep1 = () => {
    try {
      loginSchema.parse({ email });
      return true;
    } catch (error) {
      setErrors(
        error.errors.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.path[0]]: curr.message,
          }),
          {}
        )
      );
      return false;
    }
  };

  const handleRequestOtp = async () => {
    if (!validateStep1()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login/request-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          admin: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("OTP Request Error:", errorData.code);

        switch (errorData.code) {
          case "USER_EXISTS":
            toast.error("Account already exists, please login");
            break;
          case "ACCOUNT_LOCKED":
            toast.error(
              "Your account is locked due to multiple failed attempts"
            );
            break;
          case "INVALID_OTP":
            toast.error("Invalid OTP, please try again");
            break;
          case "ADMIN_ACCESS_DENIED":
            toast.error("Admin access denied");
            break;
          default:
            toast.error("Couldn't send OTP, please try again");
        }
        return;
      }

      const data = await response.json();
      console.log("Data:", data);
      toast.success("OTP sent successfully to your email");
      setStep(2);
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Couldn't send OTP, please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a complete 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
          admin: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        handleOtpError(errorData, response.status);
        return;
      }

      const data = await response.json();
      const { token } = data.token;

      localStorage.setItem("token", JSON.stringify(token));
      login({ email });
      toast.success("Welcome. You are now signed in.");
      router.push("/dashboard");
    } catch (error) {
      console.error("Network error while verifying OTP:", error);
      toast.error("Network error. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpError = (errorData, status) => {
    switch (status) {
      case 400:
        if (errorData.code === "OTP_MISSING") {
          toast.error("OTP is required. Please enter the OTP.");
        } else if (errorData.code === "INVALID_OTP") {
          toast.error(
            `Invalid OTP. ${errorData.otpAttempts.remainingAttempts} attempts remaining.`
          );
        }
        break;
      case 404:
      case 403:
        if (errorData.code === "USER_NOT_FOUND") {
          toast.error("No user found with this email.");
        }
        break;
      case 410:
        if (errorData.code === "OTP_EXPIRED") {
          toast.error("The OTP has expired. Please request a new one.");
        }
        break;
      case 423:
        if (errorData.code === "ACCOUNT_LOCKED") {
          toast.error(
            `Your account is locked. Try again after ${errorData.unlocksAt.remainingMinutes} minutes.`
          );
        }
        break;
      case 500:
        toast.error("An unexpected error occurred. Please try again later.");
        break;
      default:
        toast.error("Couldn't verify OTP. Please try again.");
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      handleRequestOtp();
    } else {
      handleVerifyOtp();
    }
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen w-full flex">
        {/* Left Panel */}
        <div className="hidden lg:flex w-1/2 bg-muted p-12 flex-col justify-between">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold font-bricolage tracking-tight">
                Hello, Admin!👋
              </h1>
              <p className="text-muted-foreground text-lg max-w-md">
                Manage Majestic Escape efficiently. Access reservations, guest &
                host details, all in one place.
              </p>
              <Image
                src="/images/chart.png"
                width={500}
                height={500}
                className="translate-y-[-50px]"
                alt="Line chart"
              />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </>
  );
}
