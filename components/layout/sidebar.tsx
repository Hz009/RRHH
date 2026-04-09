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
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ["admin", "manager", "employee"] },
  { href: "/employees", label: "Empleados", icon: Users, roles: ["admin", "manager", "employee"] },
  { href: "/employees/new", label: "Alta de empleado", icon: UserRoundPlus, roles: ["admin"] },
  { href: "/loans", label: "Prestamos", icon: CreditCard, roles: ["admin", "manager", "employee"] },
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
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-72 border-r border-lm-aqua/20 bg-lm-sidebar lg:block">
      <div className="flex h-16 items-center border-b border-lm-aqua/15 px-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-lm-aqua uppercase">LinguaMeeting</p>
          <h1 className="text-base font-semibold text-lm-dark-teal">HRIS Back Office</h1>
        </div>
      </div>

      <nav className="space-y-0.5 p-3">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(role))
          .map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-lm-sky text-lm-dark-teal font-semibold ring-1 ring-lm-aqua/25"
                  : "text-zinc-600 hover:bg-lm-sky hover:text-lm-dark-teal"
              )}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-lm-aqua/15 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-lm-orange/10 px-3 py-2 text-sm font-medium text-lm-orange transition-colors hover:bg-lm-orange/20"
        >
          <LogOut size={14} />
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
