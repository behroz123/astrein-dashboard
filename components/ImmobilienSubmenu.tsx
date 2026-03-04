import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export default function ImmobilienSubmenu({ pathname }: { pathname: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const submenuItems = [
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
        className={`w-full rounded-2xl px-4 py-3 text-sm transition border flex items-center justify-between ${
          isActive
            ? "link-active text-white border-white/10"
            : "text-white/75 hover:text-white hover:bg-white/5 border-transparent"
        }`}
      >
        <span>Immobilien</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="ml-2 space-y-1 pl-3 border-l border-white/10">
          {submenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block rounded-xl px-3 py-2 text-xs transition border ${
                pathname === item.href
                  ? "bg-white/10 text-white border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
