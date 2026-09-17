"use client";

import Link from "next/link";
import {
  Calendar,
  BookOpen,
  LayoutDashboard,
  Home,
  Menu,
  Receipt,
  User,
  MessageCircle,
  Star,
  FileText,
  HousePlus,
  Building2,
  ChartNoAxesColumn,
  Landmark,
  HelpingHand,
  LogOut,
  LandmarkIcon,
  StarIcon,
  Book,
  Contact,
  Headset,
  Settings,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { isSectionActive } from "@/lib/nav-active";
const navItems = [
  { name: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Property", icon: Building2, href: "/dashboard/properties" },
  { name: "Bookings", icon: BookOpen, href: "/dashboard/bookings" },
  { name: "Users", icon: User, href: "/dashboard/guests" },
];
//MessageCircle
export default function AdminBottomNavigation() {
  const { logout } = useAuth();
  // Derived from the URL rather than click state. The previous local `useState`
  // was seeded with "Dashboard", which matches none of the navItems names, so
  // the active highlight never rendered on load and was lost on every refresh
  // or back-navigation. Matches the isActive() helper in sidebar.tsx.
  const pathname = usePathname();
  const isActive = (href: string) => isSectionActive(pathname, href);

  const router = useRouter();
  const handleLogout = () => {
    logout();

    localStorage.clear();
    router.push("/");
  };
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border py-2 px-0 md:hidden z-50">
      <ul className="flex justify-between items-center">
        {navItems.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
                isActive(item.href) ? "text-primary" : "text-muted-foreground"
              } hover:text-primary hover:bg-accent`}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          </li>
        ))}
        <li>
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center p-2 rounded-lg transition-colors duration-200 text-muted-foreground hover:text-primary hover:bg-accent">
                <Menu className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetTitle className="text-lg font-semibold mb-4">
                Menu
              </SheetTitle>
              <nav className="flex flex-col space-y-4">
                {/* <Link
                  href="/"
                  className="flex  text-primaryGreen hover:text-brightGreen items-center space-x-2 text-sm"
                >
                  <User className="w-4 h-4" />
                  <span className="  ">Switch to Guest</span>
                </Link> */}
                <Link
                  href="/dashboard/booking-history"
                  className="flex items-center space-x-2 text-sm"
                >
                  <Book className="w-4 h-4" />
                  <span>Booking History</span>
                </Link>
                <Link
                  href="/dashboard/host-history"
                  className="flex items-center space-x-2 text-sm"
                >
                  <Contact className="w-4 h-4" />
                  <span>Host History</span>
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="flex items-center space-x-2 text-sm"
                >
                  <ChartNoAxesColumn className="w-4 h-4" />
                  <span>Analytics</span>
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className="flex items-center space-x-2 text-sm"
                >
                  <Landmark className="w-4 h-4" />
                  <span>Transactions</span>
                </Link>
                {/* <Link
                  href="/dashboard/transcations"
                  className="flex items-center space-x-2 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reviews</span>
                </Link> */}
                {/* <Link href="/host/dashboard/complaints" className="flex items-center space-x-2 text-sm">
                  <MessageCircle className="w-4 h-4" />
                  <span>Complaints</span>
                </Link> */}
                {/* <Link
                  href="/host/dashboard/invoices"
                  className="flex items-center space-x-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Invoices</span>
                </Link> */}
                <Link
                  href="/dashboard/reviews"
                  className="flex items-center space-x-2 text-sm"
                >
                  <Star className="w-4 h-4" />
                  <span>Reviews</span>
                </Link>
                {/* Support Chat and Settings live in the desktop sidebar. Below
                    `md` that sidebar can only be reached via the header's
                    SidebarTrigger, so without these entries the two pages were
                    effectively unreachable on a phone. */}
                <Link
                  href="/dashboard/support-chat"
                  className="flex items-center space-x-2 text-sm"
                >
                  <Headset className="w-4 h-4" />
                  <span>Support Chat</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center space-x-2 text-sm"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
                <Button
                  onClick={handleLogout}
                  className="px-4 py-2 text-left font-normal text-sm rounded-md hover:bg-gray-100 transition-colors bg-gray-100 shadow-none border-none text-gray-700"
                >
                  Logout
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
