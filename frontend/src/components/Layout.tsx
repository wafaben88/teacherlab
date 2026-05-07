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
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { Onboarding } from "./Onboarding";

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
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen flex">
      <aside
        className={`${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static z-40 inset-y-0 left-0 w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform`}
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
              <div className="font-bold leading-none">Teacher Hub</div>
              <div className="text-[11px] text-muted leading-none mt-1">Espace enseignant</div>
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

        <div className="p-4 border-t divider">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 px-3 py-2 text-sm text-muted transition"
          >
            <span className="flex-1 text-left">Recherche rapide</span>
            <span className="kbd">⌘ K</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="md:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer"
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <main className="flex-1 min-w-0 p-5 md:p-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <Onboarding />
    </div>
  );
}
