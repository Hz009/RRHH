"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  ClipboardCheck,
  CreditCard,
  Fingerprint,
  FileText,
  Home,
  LogOut,
  Network,
  PanelRight,
  ReceiptText,
  Shield,
  UserRoundPlus,
  UserRound,
  Users,
  UserSquare2,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AppRole = "admin" | "manager" | "employee";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: AppRole[];
  needsLoans?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ["admin", "manager", "employee"] },
  { href: "/employees", label: "Empleados", icon: Users, roles: ["admin", "manager"] },
  { href: "/employees/new", label: "Alta de empleado", icon: UserRoundPlus, roles: ["admin"] },
  { href: "/loans", label: "Prestamos", icon: CreditCard, roles: ["admin", "manager", "employee"], needsLoans: true },
  { href: "/vacations", label: "Vacaciones", icon: ClipboardCheck, roles: ["admin", "manager", "employee"] },
  { href: "/attendance", label: "Fichaje y asistencia", icon: Fingerprint, roles: ["admin"] },
  { href: "/documents", label: "Documentos", icon: FileText, roles: ["admin", "manager", "employee"] },
  { href: "/reports", label: "Pagos", icon: ReceiptText, roles: ["admin"] },
  { href: "/roles", label: "Roles y permisos", icon: Shield, roles: ["admin"] },
  { href: "/audit", label: "Auditoria", icon: Waypoints, roles: ["admin"] },
  { href: "/employee-portal", label: "Portal del empleado", icon: UserSquare2, roles: ["admin", "manager", "employee"] },
  { href: "/orgchart", label: "Organigrama", icon: Network, roles: ["admin", "manager"] },
  { href: "/onboarding", label: "Onboarding", icon: BriefcaseBusiness, roles: ["admin"] },
  { href: "/offboarding", label: "Offboarding", icon: PanelRight, roles: ["admin"] },
  { href: "/notifications", label: "Notificaciones", icon: Bell, roles: ["admin"] },
];

interface SidebarProps {
  role: AppRole;
  profileHref?: string | null;
  loansEnabled?: boolean;
}

export function Sidebar({ role, profileHref = null, loansEnabled = false }: SidebarProps) {
  const items: NavItem[] = profileHref
    ? [
        navItems[0],
        { href: profileHref, label: "My Profile", icon: UserRound, roles: ["manager", "employee"] },
        ...navItems.slice(1),
      ]
    : navItems;
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[17.5rem] shrink-0 flex-col border-r border-lm-dark-teal/10 bg-white/90 backdrop-blur-xl lg:flex">
      <div className="flex h-20 items-center px-6">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-lm-aqua uppercase">LinguaMeeting</p>
          <h1 className="mt-0.5 text-base font-semibold tracking-tight text-lm-dark-teal">HRIS</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items
          .filter((item) => (!item.roles || item.roles.includes(role)) && (!item.needsLoans || role === "admin" || loansEnabled))
          .map((item) => {
          const isActive =
            item.href === profileHref
              ? pathname === item.href
              : item.href === "/employees"
                ? pathname === "/employees" || (pathname.startsWith("/employees/") && pathname !== profileHref)
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-lm-sky font-semibold text-lm-dark-teal"
                  : "text-zinc-500 hover:bg-lm-sky/70 hover:text-lm-dark-teal"
              )}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-lm-orange-light hover:text-lm-orange"
        >
          <LogOut size={14} />
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
