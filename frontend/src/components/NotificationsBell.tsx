import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Notification } from "../lib/types";

const KIND_COLORS: Record<string, string> = {
  info: "text-sky-500 bg-sky-100 dark:bg-sky-500/15",
  success: "text-emerald-500 bg-emerald-100 dark:bg-emerald-500/15",
  warning: "text-amber-500 bg-amber-100 dark:bg-amber-500/15",
  alert: "text-rose-500 bg-rose-100 dark:bg-rose-500/15",
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  return `${days}j`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await api.get<Notification[]>("/api/notifications", {
        params: { limit: 30 },
      });
      setItems(r.data);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function markAll() {
    await api.post("/api/notifications/read-all");
    load();
  }

  async function markOne(id: number) {
    await api.post(`/api/notifications/${id}/read`);
    load();
  }

  async function removeOne(id: number) {
    await api.delete(`/api/notifications/${id}`);
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn-icon relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 surface rounded-xl shadow-soft z-30 animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b divider">
            <div className="font-semibold text-sm">Notifications</div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-brand-600 dark:text-brand-300 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">Aucune notification</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-2 p-3 border-b divider hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !n.read ? "bg-brand-50/40 dark:bg-brand-500/5" : ""
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      KIND_COLORS[n.kind] || KIND_COLORS.info
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium leading-tight">{n.title}</div>
                      <span className="text-[10px] text-muted shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.body && <div className="text-xs text-muted mt-0.5 break-words">{n.body}</div>}
                    {n.link && (
                      <a
                        href={n.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 dark:text-brand-300 hover:underline mt-0.5 inline-block"
                      >
                        Ouvrir →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    {!n.read && (
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => markOne(n.id)}
                        aria-label="Marquer comme lue"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      onClick={() => removeOne(n.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
