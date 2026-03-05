import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Home } from "lucide-react";

export default function ImmobilienSubmenu({ pathname }: { pathname: string }) {
  const [isOpen, setIsOpen] = useState(pathname.startsWith("/immobilien") || 
    pathname.startsWith("/auszuege") || 
    pathname.startsWith("/einzuege") || 
    pathname.startsWith("/wohnung-checken") ||
    pathname.startsWith("/schluesseluebergabe") ||
    pathname.startsWith("/mietvertrag") ||
    pathname.startsWith("/strom-vertrag") ||
    pathname.startsWith("/wasser-vertrag") ||
    pathname.startsWith("/untermietvertrag"));

  const submenuItems = [
    { href: "/immobilien", label: "Übersicht" },
    { href: "/auszuege", label: "Auszüge" },
    { href: "/einzuege", label: "Einzüge" },
    { href: "/wohnung-checken", label: "Wohnung Checken" },
    { href: "/schluesseluebergabe", label: "Schlüsselübergabe" },
    { href: "/mietvertrag", label: "Mietvertrag" },
    { href: "/strom-vertrag", label: "Strom Vertrag" },
    { href: "/wasser-vertrag", label: "Wasser Vertrag" },
    { href: "/untermietvertrag", label: "Untermietvertrag" },
  ];

  const isActive = pathname === "/immobilien" || submenuItems.some(item => pathname.startsWith(item.href));

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-2xl px-4 py-3 text-sm transition-all duration-200 border flex items-center justify-between group ${
          isActive
            ? "link-active text-white border-white/10 shadow-lg shadow-white/5"
            : "text-white/75 hover:text-white hover:bg-white/5 border-transparent"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Home className={`w-4 h-4 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
          <span className="font-medium">Immobilien</span>
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-300 ease-in-out ${isOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-1 ml-4 space-y-0.5 py-1">
          {submenuItems.map((item, index) => {
            const isItemActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  transitionDelay: isOpen ? `${index * 20}ms` : "0ms",
                }}
                className={`block rounded-xl px-4 py-2.5 text-sm transition-all duration-200 transform ${
                  isItemActive
                    ? "bg-gradient-to-r from-white/15 to-white/5 text-white font-semibold border-l-2 border-white/60 shadow-sm translate-x-0"
                    : "text-white/65 hover:text-white hover:bg-white/10 border-l-2 border-transparent hover:border-white/30 hover:translate-x-1"
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
