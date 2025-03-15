import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const links = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/book", label: "Book Now" },
    { href: "/quote", label: "Get Quote" },
    { href: "/dashboard", label: "Dashboard" },
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
            {user ? (
              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
                className="text-sm font-medium text-gray-600 hover:text-primary"
              >
                Logout
              </Button>
            ) : (
              <Link
                href="/auth"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-primary"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}