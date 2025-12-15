/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
});
export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isEditingEmail, setIsEditingEmail] = useState(false); // Update 1

  const router = useRouter();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const validateStep1 = () => {
    try {
      loginSchema.parse({ email });
      return true;
    } catch (error) {
      // Convert Zod errors into a more user-friendly format
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

  const handleRequestOtp = async (requestType = "INITIAL") => {
    // Update 3
    if (!validateStep1()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/request-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          requestType: requestType, // Update 3
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (process.env.NEXT_PUBLIC_ENV === "dev") {
          console.log("OTP Request Error:", errorData.code);
        }
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
          case "USER_NOT_FOUND":
            toast.error("You are not registered, please register first");
            break;
          default:
            toast.error("Couldn't send OTP, please try again");
        }
        return;
      }

      const data = await response.json();
      // process.env.ENV === 'dev' && console.log("Data:", data)
      toast.success("OTP sent successfully to your email");
      setStep(2);
    } catch (error) {
      console.error("Network Error:", error);

      // Handle the case where the network fails and there's no response object
      // if (error.response) {
      //   const errorData = await error.response.json();
      //   console.error("OTP Request Error:", errorData.code);
      //   handleOtpError(errorData, error.response.status);
      // } else {
      //   toast.error("Couldn't send OTP, please try again");
      // }
      console.error("Network Error:", error);
      toast.error("Couldn't send OTP. Please try again.");
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
      const response = await fetch(`${API_BASE_URL}/admin/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
        }),
      });

      if (!response.ok) {
        // Parse error response
        const errorData = await response.json();
        handleOtpError(errorData, response.status);
        return;
      }

      // Parse successful response
      const data = await response.json();
      const { token } = data.token;

      // Store token and show success message
      localStorage.setItem("token", JSON.stringify(token));
      login({ email });
      toast.success("Welcome. You are now signed in.");
      router.push("/dashboard");
    } catch (error) {
      console.error("Network error while verifying OTP:", error);
      console.error("Network Error:", error);
      // toast.error("Couldn't send OTP. Please try again.");
      //     toast.error("Network error. Please check your internet connection.");
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
        if (errorData.code === "USER_NOT_FOUND") {
          toast.error("No user found with this email.");
        }
        break;

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
    // Update 7
    e.preventDefault();

    if (step === 1) {
      if (isEditingEmail) {
        // Update 7
        setIsEditingEmail(false);
        setStep(2);
      } else {
        await handleRequestOtp(); // Update 7
      }
    } else {
      await handleVerifyOtp(); // Update 7
    }
  };

  const handleRequestNewOtp = async () => {
    // Update 2
    setOtp("");
    await handleRequestOtp("RESEND"); // Update 2
  };

  return (
    <div className="p-6 lg:p-10 flex flex-col justify-center items-start max-w-md mx-auto w-full">
      <div className="mb-8">
        <Link href={"/"}>
          <img className="h-6 mb-6" src="/images/logo-full.svg" alt="Logo" />
        </Link>

        <h2 className="text-xl font-bricolage md:text-2xl font-semibold text-absoluteDark mb-2">
          Welcome, Admin!
        </h2>

        <p className="text-stone text-sm">
          Sign in to admin console to see what&apos;s happening on Majestic
          Escape today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        {(step === 1 || isEditingEmail) && ( // Update 5
          <Input
            type="email"
            placeholder="Email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            className="w-full text-sm py-6 px-4 mb-2"
            disabled={isLoading}
            required
          />
        )}
        {step === 2 && ( // Update 4
          <>
            <p className="text-sm text-gray-600">Enter OTP sent to {email}</p>
            <div className="space-y-4">
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={6}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <div className="flex justify-between text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleRequestNewOtp}
                  disabled={isLoading}
                >
                  Request new OTP
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setIsEditingEmail(true);
                    setStep(1);
                    setOtp("");
                  }}
                  disabled={isLoading}
                >
                  Edit email
                </Button>
              </div>
            </div>
          </>
        )}

        <Button
          type="submit"
          className="w-full py-6 rounded-3xl bg-primaryGreen hover:bg-brightGreen text-white"
          disabled={isLoading}
        >
          {
            isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {step === 1 ? "Requesting OTP..." : "Verifying OTP..."}
              </>
            ) : step === 1 ? (
              isEditingEmail ? (
                "Update Email"
              ) : (
                "Request OTP"
              )
            ) : (
              "Verify OTP"
            ) // Update 6
          }
        </Button>

        {step === 1 && (
          <Button
            type="button"
            variant="outline"
            className="w-full hidden py-6 rounded-3xl"
            disabled={isLoading}
          >
            <svg
              className="mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
            >
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              />
            </svg>
            Sign in with Google
          </Button>
        )}

        <div className="text-left text-sm">
          <p className="text-gray-600">
            Facing issues in signing in?{" "}
            <Link href="/help-center" className="text-primary underline">
              Contact support
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
