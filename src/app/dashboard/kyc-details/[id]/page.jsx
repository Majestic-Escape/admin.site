"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpRight,
  Download,
  Filter,
  Search,
  SortAsc,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { KycDetailsSkeleton } from "./kyc-details-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default function KycDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState([]);
  const [error, setError] = useState(null);
  const params = useParams();
  const id = params.id;
  const searchParams = useSearchParams();
  const firstName = searchParams.get("firstName");
  const lastName = searchParams.get("lastName");
  const email = searchParams.get("email");
  const getKycData = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      fetch(`${API_URL}/guests/kyc?id=${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch guests data");
          }
          return response.json();
        })
        .then((result) => {
          setGuests(result.data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  };
  useEffect(() => {
    getKycData();
  }, []);

  return (
    <div className="flex-1 min-h-screen space-y-4 bg-gray-200 p-8 pt-6">
      <div className="flex min items-center justify-between space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight font-bricolage">
          Kyc Details
        </h2>
      </div>
      <div>
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-absoluteDark font-bricolage font-medium text-xl">
              Steps List
            </CardTitle>
            <CardDescription>View each step status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <KycDetailsSkeleton />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Guest</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Step 1: Data</TableHead>

                      <TableHead>Step 2: Document</TableHead>
                      <TableHead>Step 3: GST</TableHead>
                      <TableHead>Step 4: Terms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guests.map((guest) => (
                      <TableRow key={guest._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center w-full">
                            <span className="w-32">
                              {firstName + " " + lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{guests[0]?.hostEmail}</TableCell>
                        <TableCell>
                          {" "}
                          {guests[0]?.personalInfo?.address?.pincode != "" &&
                          guests[0]?.status == "completed"
                            ? "Completed"
                            : "Pending"}
                        </TableCell>
                        <TableCell>
                          {guests[0]?.documentInfo?.isVerified
                            ? "Completed"
                            : "Pending"}
                        </TableCell>
                        <TableCell>
                          {" "}
                          {guests[0]?.gstInfo?.isVerified
                            ? "Completed"
                            : "Pending"}
                        </TableCell>
                        <TableCell>
                          {" "}
                          {guests[0]?.acceptedTerms?.general
                            ? "Completed"
                            : "Pending"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
