import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  GraduationCap,
  Calendar,
  BookOpenCheck,
  CheckSquare,
  Award,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/files", label: "Fichiers & Cours", icon: FolderKanban },
  { to: "/exercises", label: "Exercices", icon: BookOpenCheck },
  { to: "/schedule", label: "Planning", icon: Calendar },
  { to: "/classes", label: "Classes", icon: GraduationCap },
  { to: "/grades", label: "Notes", icon: Award },
  { to: "/todos", label: "À faire", icon: CheckSquare },
  { to: "/settings", label: "Paramètres", icon: Settings },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static z-40 inset-y-0 left-0 w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col transition-transform`}
      >
        <div className="px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900 leading-none">Teacher Hub</div>
              <div className="text-[11px] text-slate-500 leading-none mt-1">Espace enseignant</div>
            </div>
          </button>
          <button
            className="md:hidden btn-icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer la navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-4 py-2 flex-1 overflow-y-auto space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-sky-400 flex items-center justify-center text-white font-semibold">
              {user?.full_name?.[0]?.toUpperCase() ?? "E"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {user?.full_name}
              </div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="btn-icon"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="md:hidden fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer"
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            className="btn-icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir la navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold">Teacher Hub</span>
          </div>
          <div className="w-9" />
        </header>
        <main className="flex-1 min-w-0 p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
