"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/schedule", label: "Расписание", icon: "📅" },
  { href: "/admin/services", label: "Услуги", icon: "✂️" },
  { href: "/admin/specialists", label: "Специалисты", icon: "👤" },
  { href: "/admin/clients", label: "Клиенты", icon: "👥" }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
      <div className="grid w-full max-w-[430px] grid-cols-4 rounded-[28px] bg-white p-2 shadow-lg">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition",
                active ? "bg-accent/10 text-accent" : "text-muted"
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
