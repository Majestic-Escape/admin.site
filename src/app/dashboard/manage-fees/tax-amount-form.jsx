"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function TaxAmountForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gst, setGst] = useState("");
  const [service, setService] = useState("");
  const [ifscDetails, setIfscDetails] = useState(null);
  const [bankName, setBankName] = useState("");
  const [isBankNameReadOnly, setIsBankNameReadOnly] = useState(false);
  const [bankDetails, setBankDetails] = useState([]);
  const fetchData = async () => {
    const userId = await localStorage.getItem("userId");
    const parsedUserId = JSON.parse(userId);
    const token = await localStorage.getItem("token");
    const parsedToken = JSON.parse(token);
    if (parsedToken) {
      try {
        const response = await fetch(`${API_URL}/admin/service`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${parsedToken}`,
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();
        setGst(result.data[0].gst || "");
        setService(result.data[0].service || "");
      } catch (error) {
        console.error(error);
      }
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent full page reload
    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log(gst, service);
    }
    const payload = {
      gst: gst,
      service: service,
    };
    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log("stage1", payload);
    }
    setIsSubmitting(true);
    try {
      const tokenData = await localStorage.getItem("token");
      const parsedToken = JSON.parse(tokenData);
      const hostId = await localStorage.getItem("userId");
      const parsedhost = JSON.parse(hostId);
      if (!parsedToken) {
        toast.error("Authentication required. Please login again.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${API_URL}/admin/service`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${parsedToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("stage3");
      }
      if (!response.ok) {
        // Handle HTTP errors (4xx, 5xx)
        const errorText = await response.text();
        console.error("❌ HTTP Error:", response.status, errorText);

        let errorMessage = "Something went wrong!";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use the text
          errorMessage = errorText || errorMessage;
        }

        toast.error(`❌ ${errorMessage}`);
        setIsSubmitting(false);
        return;
      }

      // Parse successful response
      const responseData = await response.json();

      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("🔍 Stage 4 - Success response:", responseData);
      }

      if (responseData.success) {
        toast.success("✅ Bank info saved successfully");
      } else {
        toast.error(
          `❌ ${responseData.message || "Failed to save bank details"}`
        );
      }
    } catch (error) {
      console.error("🚨 Network/JavaScript Error:", error);

      // More specific error messages
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        toast.error("❌ Network error: Cannot connect to server");
      } else if (error.name === "SyntaxError") {
        toast.error("❌ Invalid response from server");
      } else {
        toast.error("❌ Something went wrong! Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account Number */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="accountNumber">GST Charges (%)</Label>
          <Input
            id="gst"
            name="gst"
            type="text"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountNumberRepeat">Service Charges (%)</Label>
          <Input
            id="service"
            name="service"
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            required
          />
        </div>
      </div>

      {/* IFSC */}
      <div className="space-y-2"></div>

      {/* Holder and Bank Name */}
      <div className="grid grid-cols-2 gap-4"></div>

      {/* Ownership Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox id="confirmOwnership" name="confirmOwnership" required />
        <Label htmlFor="confirmOwnership">I agree to this changes</Label>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-12 bg-primaryGreen hover:bg-brightGreen text-white rounded-3xl"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Updating..." : "Update Bank Information"}
      </Button>
    </form>
  );
}
