import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/quote", label: "Get Quote" },
  ];

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center">
                <span className="text-2xl font-bold text-primary">HandyPro</span>
              </a>
            </Link>
          </div>
          
          <div className="hidden sm:flex sm:items-center">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <a
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium",
                    location === link.href
                      ? "text-primary"
                      : "text-gray-600 hover:text-primary"
                  )}
                >
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
