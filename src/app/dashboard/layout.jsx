"use client";
import Link from "next/link";
import * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, Settings, HelpCircle, LogOut } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { useRouter } from "next/navigation";
export default function DashboardLayout({ children }) {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user, logout } = useAuth();
  const router = useRouter();

  const auth = async () => {
    const getLocalData = await localStorage.getItem("token");
    const data = JSON.parse(getLocalData);
    if (data) {
      setIsAuth(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    auth();
  }, []);

  if (!isAuth) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center font-poppins pt-24">
          You are not authorized to access this page. &nbsp;{" "}
          <Link href="/login">
            <u>
              <b>Click Here</b>
            </u>
          </Link>
          &nbsp; to log in now to access.
        </div>
      </>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-20 w-20 animate-spin rounded-full border-b-2 border-current"></div>
      </div>
    );
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen overflow-hidden w-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          <header className="flex h-14 lg:h-[60px] w-full items-center gap-4 border-b bg-muted/40 px-6">
            <div className="flex flex-1 items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
              <form className="flex-1 sm:flex-initial">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                  />
                </div>
              </form>
              <Button size="icon" variant="ghost">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatars/01.png" alt="@username" />
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        username
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        m@example.com
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();

                      localStorage.clear();
                      router.push("/");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span on>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
