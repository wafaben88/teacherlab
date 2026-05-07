import { Menu, Sparkles, Search, Sun, Moon, Monitor, LogOut } from "lucide-react";
import { useTheme, type ThemeMode } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  onOpenMobileNav: () => void;
  onOpenCommand: () => void;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Clair", Icon: Sun },
  { mode: "dark", label: "Sombre", Icon: Moon },
  { mode: "auto", label: "Auto", Icon: Monitor },
];

function ThemeMenu() {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = THEME_OPTIONS.find((o) => o.mode === mode) ?? THEME_OPTIONS[2];
  const CurrentIcon = current.Icon;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn-icon"
        onClick={() => setOpen((o) => !o)}
        title={`Thème : ${current.label}`}
        aria-label="Choisir le thème"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-44 surface rounded-xl shadow-soft p-1 z-30 animate-fade-in">
          {THEME_OPTIONS.map((o) => {
            const active = o.mode === mode;
            return (
              <button
                key={o.mode}
                type="button"
                onClick={() => {
                  setMode(o.mode);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <o.Icon className="w-4 h-4" />
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;
  const initial = user.full_name?.[0]?.toUpperCase() ?? "E";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pr-2 pl-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        aria-label="Menu utilisateur"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-sky-400 flex items-center justify-center text-white font-semibold text-sm">
          {initial}
        </div>
        <div className="hidden md:block text-left max-w-[140px] min-w-0">
          <div className="text-sm font-semibold truncate">{user.full_name}</div>
          <div className="text-xs text-muted truncate">{user.email}</div>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-60 surface rounded-xl shadow-soft p-1 z-30 animate-fade-in">
          <div className="px-3 py-2 border-b divider">
            <div className="text-sm font-semibold truncate">{user.full_name}</div>
            <div className="text-xs text-muted truncate">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 mt-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({ onOpenMobileNav, onOpenCommand }: HeaderProps) {
  const isMac =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  return (
    <header className="sticky top-0 z-20 surface/95 backdrop-blur-xl border-b divider px-4 md:px-6 py-3 flex items-center gap-3">
      <button
        className="md:hidden btn-icon"
        onClick={onOpenMobileNav}
        aria-label="Ouvrir la navigation"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="md:hidden flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 flex items-center justify-center text-white">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="font-bold">Teacher Hub</span>
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        className="hidden md:flex flex-1 max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white/60 hover:bg-white dark:bg-slate-900/60 dark:border-slate-800 dark:hover:bg-slate-900 px-3 py-2 text-sm text-muted transition"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">Rechercher (cours, exos, classes…)</span>
        <span className="kbd">{isMac ? "⌘" : "Ctrl"}</span>
        <span className="kbd">K</span>
      </button>
      <button
        type="button"
        onClick={onOpenCommand}
        className="md:hidden btn-icon"
        aria-label="Rechercher"
      >
        <Search className="w-5 h-5" />
      </button>

      <div className="ms-auto flex items-center gap-1.5">
        <ThemeMenu />
        <UserMenu />
      </div>
    </header>
  );
}
