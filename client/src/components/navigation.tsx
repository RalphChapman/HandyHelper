import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function Navigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/book", label: "Book Now" },
    { href: "/quote", label: "Get Quote" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/supplies", label: "Supplies" },
  ];

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary">HandyPro</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex sm:items-center space-x-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium",
                  location === link.href
                    ? "text-primary"
                    : "text-gray-600 hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
                className="text-sm font-medium text-gray-600 hover:text-primary"
              >
                Logout
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600"
              onClick={() => setIsOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-2">
            <div className="flex flex-col space-y-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium",
                    location === link.href
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    logoutMutation.mutate();
                    setIsOpen(false);
                  }}
                  className="text-sm font-medium text-gray-600 hover:text-primary justify-start"
                >
                  Logout
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}