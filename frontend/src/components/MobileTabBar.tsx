import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";
import { useI18n } from "../lib/i18n";

interface Props {
  onOpenMore: () => void;
}

const TABS = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/files", labelKey: "nav.files", icon: FolderKanban },
  { to: "/schedule", labelKey: "nav.schedule", icon: Calendar },
  { to: "/classes", labelKey: "nav.classes", icon: GraduationCap },
];

export function MobileTabBar({ onOpenMore }: Props) {
  const { t } = useI18n();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t divider px-1 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale mobile"
    >
      <div className="flex items-stretch justify-around">
        {TABS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-2 py-2 flex-1 text-[11px] font-medium ${
                isActive
                  ? "text-brand-600 dark:text-brand-300"
                  : "text-slate-500 dark:text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "scale-110 transition-transform" : ""
                  }`}
                />
                <span className="truncate max-w-full">{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 flex-1 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          aria-label="Plus"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Plus</span>
        </button>
      </div>
    </nav>
  );
}
