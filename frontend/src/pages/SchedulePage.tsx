import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalIcon,
  CalendarDays,
  Trash2,
  Pencil,
  Download,
  ExternalLink,
  Repeat,
  Bell,
} from "lucide-react";
import {
  addDays,
  format,
  startOfWeek,
  isSameDay,
  addWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { api, API_BASE } from "../lib/api";
import type { ScheduleEvent, SchoolClass, Subject } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";

const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i); // 7h - 18h
const EVENT_TYPES = ["cours", "examen", "reunion", "autre"];
const COLORS = [
  "#6366f1",
  "#10b981",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
];

interface FormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  event: ScheduleEvent | null;
  classes: SchoolClass[];
  subjects: Subject[];
  initialStart?: Date | null;
}

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function EventForm({ open, onClose, onSaved, event, classes, subjects, initialStart }: FormProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("cours");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [recurrence, setRecurrence] = useState(0);
  const [reminder, setReminder] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setEventType(event.event_type);
      setClassId(event.class_id ? String(event.class_id) : "");
      setSubjectId(event.subject_id ? String(event.subject_id) : "");
      setStart(toLocalInput(new Date(event.start_time)));
      setEnd(toLocalInput(new Date(event.end_time)));
      setRoom(event.room);
      setColor(event.color);
      setRecurrence(event.recurrence_weeks ?? 0);
      setReminder(event.reminder_minutes ?? 0);
    } else if (open) {
      setTitle("");
      setDescription("");
      setEventType("cours");
      setClassId("");
      setSubjectId("");
      const s = initialStart ?? new Date();
      const e = new Date(s.getTime() + 60 * 60 * 1000);
      setStart(toLocalInput(s));
      setEnd(toLocalInput(e));
      setRoom("");
      setColor("#6366f1");
      setRecurrence(0);
      setReminder(0);
    }
  }, [event, open, initialStart]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title,
      description,
      event_type: eventType,
      class_id: classId ? Number(classId) : null,
      subject_id: subjectId ? Number(subjectId) : null,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      room,
      color,
      recurrence_weeks: recurrence,
      reminder_minutes: reminder,
    };
    try {
      if (event) {
        await api.put(`/api/schedule/${event.id}`, payload);
        toast.push("Événement mis à jour", "success");
      } else {
        await api.post("/api/schedule", payload);
        toast.push("Événement ajouté", "success");
      }
      onClose();
      onSaved();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Erreur de sauvegarde";
      toast.push(detail, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={event ? "Modifier l'événement" : "Nouvel événement"} width="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Salle</label>
            <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Salle 12" />
          </div>
          <div>
            <label className="label">Classe</label>
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— Aucune —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Matière</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">— Aucune —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Début *</label>
            <input
              type="datetime-local"
              className="input"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Fin *</label>
            <input
              type="datetime-local"
              className="input"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" /> Récurrence (semaines)
            </label>
            <input
              type="number"
              min={0}
              max={52}
              className="input"
              value={recurrence}
              onChange={(e) => setRecurrence(Number(e.target.value) || 0)}
              placeholder="0 = pas de récurrence"
            />
            <p className="text-xs text-muted mt-1">Nombre de semaines à répéter (ex. 30 pour un cours hebdo annuel).</p>
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Rappel (minutes avant)
            </label>
            <input
              type="number"
              min={0}
              max={1440}
              className="input"
              value={reminder}
              onChange={(e) => setReminder(Number(e.target.value) || 0)}
              placeholder="0 = pas de rappel"
            />
            <p className="text-xs text-muted mt-1">Inclus dans l'export iCal/Google Calendar.</p>
          </div>
        </div>
        <div>
          <label className="label">Couleur</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition ${
                  color === c ? "border-slate-900 scale-110" : "border-transparent"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "…" : event ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type SchedView = "week" | "month" | "day";

function googleCalendarLink(ev: ScheduleEvent) {
  const fmt = (d: Date) =>
    new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${fmt(new Date(ev.start_time))}/${fmt(new Date(ev.end_time))}`,
    details: ev.description || "",
    location: ev.room || "",
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function SchedulePage() {
  const toast = useToast();
  const [view, setView] = useState<SchedView>("week");
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);

  const range = useMemo(() => {
    if (view === "week") return { start: weekStart, end: addDays(weekStart, 7) };
    if (view === "day") return { start: day, end: addDays(day, 1) };
    return { start: startOfMonth(monthDate), end: addDays(endOfMonth(monthDate), 1) };
  }, [view, weekStart, monthDate, day]);

  async function load() {
    const [e, c, s] = await Promise.all([
      api.get<ScheduleEvent[]>("/api/schedule", {
        params: { start: range.start.toISOString(), end: range.end.toISOString() },
      }),
      api.get<SchoolClass[]>("/api/classes"),
      api.get<Subject[]>("/api/subjects"),
    ]);
    setEvents(e.data);
    setClasses(c.data);
    setSubjects(s.data);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, weekStart, monthDate, day]);

  function downloadIcs() {
    const token = localStorage.getItem("teacher-hub.token");
    fetch(`${API_BASE}/api/schedule/calendar.ics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "teacher-hub.ics";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.push("Fichier iCal téléchargé", "success");
      })
      .catch(() => toast.push("Erreur de téléchargement", "error"));
  }

  const days = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  function eventsForDay(day: Date) {
    return events.filter((ev) => isSameDay(new Date(ev.start_time), day));
  }

  async function onDelete(ev: ScheduleEvent) {
    if (!confirm(`Supprimer "${ev.title}" ?`)) return;
    try {
      await api.delete(`/api/schedule/${ev.id}`);
      toast.push("Supprimé", "success");
      load();
    } catch {
      toast.push("Erreur", "error");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Planning"
        subtitle="Calendrier de tes séances et événements (vues jour/semaine/mois)."
        actions={
          <>
            <div className="inline-flex rounded-lg overflow-hidden border divider">
              {(["day", "week", "month"] as SchedView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    view === v
                      ? "bg-brand-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
                </button>
              ))}
            </div>
            <button
              className="btn-secondary"
              onClick={() => {
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
                setMonthDate(startOfMonth(new Date()));
                setDay(startOfDay(new Date()));
              }}
            >
              Aujourd'hui
            </button>
            <button className="btn-secondary" onClick={downloadIcs} title="Télécharger .ics">
              <Download className="w-4 h-4" /> iCal
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setDefaultStart(new Date());
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> Nouvel événement
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b divider bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <button
              className="btn-icon"
              onClick={() => {
                if (view === "week") setWeekStart(addWeeks(weekStart, -1));
                else if (view === "month") setMonthDate(addMonths(monthDate, -1));
                else setDay(addDays(day, -1));
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="btn-icon"
              onClick={() => {
                if (view === "week") setWeekStart(addWeeks(weekStart, 1));
                else if (view === "month") setMonthDate(addMonths(monthDate, 1));
                else setDay(addDays(day, 1));
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="ml-2 font-semibold">
              {view === "week" && `Semaine du ${format(weekStart, "d MMM yyyy", { locale: fr })}`}
              {view === "month" && format(monthDate, "MMMM yyyy", { locale: fr })}
              {view === "day" && format(day, "EEEE d MMM yyyy", { locale: fr })}
            </div>
          </div>
        </div>

        {view === "week" && (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[900px]"
              style={{ gridTemplateColumns: "60px repeat(6, minmax(0, 1fr))" }}
            >
              <div className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-r divider" />
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="px-3 py-2.5 border-b border-l divider bg-slate-50/50 dark:bg-slate-800/40 text-center"
                >
                  <div className="text-[11px] uppercase tracking-wider text-muted">
                    {format(d, "EEE", { locale: fr })}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      isSameDay(d, new Date()) ? "text-brand-600" : ""
                    }`}
                  >
                    {format(d, "d MMM", { locale: fr })}
                  </div>
                </div>
              ))}

              {HOURS.map((h) => (
                <div className="contents" key={h}>
                  <div className="text-[11px] text-muted px-2 py-1 border-b border-r divider bg-slate-50/30 dark:bg-slate-800/20 text-right">
                    {String(h).padStart(2, "0")}h
                  </div>
                  {days.map((d) => {
                    const slotStart = new Date(d);
                    slotStart.setHours(h, 0, 0, 0);
                    const dayEvents = eventsForDay(d).filter((ev) => {
                      const s = new Date(ev.start_time);
                      return s.getHours() === h;
                    });
                    return (
                      <button
                        key={d.toISOString() + h}
                        onClick={() => {
                          setEditing(null);
                          setDefaultStart(slotStart);
                          setFormOpen(true);
                        }}
                        className="relative h-16 border-b border-l divider hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group text-left"
                      >
                        {dayEvents.map((ev) => {
                          const s = new Date(ev.start_time);
                          const e = new Date(ev.end_time);
                          const minutes = (e.getTime() - s.getTime()) / 60000;
                          const heightPct = Math.max(30, (minutes / 60) * 100);
                          return (
                            <div
                              key={ev.id}
                              onClick={(evt) => {
                                evt.stopPropagation();
                                setEditing(ev);
                                setFormOpen(true);
                              }}
                              className="absolute inset-x-1 top-0.5 rounded-lg p-1.5 text-white text-xs shadow-sm overflow-hidden cursor-pointer hover:scale-[1.02] transition"
                              style={{
                                background: ev.color,
                                height: `calc(${heightPct}% - 4px)`,
                                minHeight: 28,
                              }}
                            >
                              <div className="font-semibold truncate">{ev.title}</div>
                              <div className="opacity-90 truncate text-[10px]">
                                {format(s, "HH:mm")}–{format(e, "HH:mm")}
                                {ev.room && ` • ${ev.room}`}
                              </div>
                            </div>
                          );
                        })}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "day" && (
          <DayGrid
            day={day}
            events={events}
            onSlotClick={(d) => {
              setEditing(null);
              setDefaultStart(d);
              setFormOpen(true);
            }}
            onEventClick={(ev) => {
              setEditing(ev);
              setFormOpen(true);
            }}
          />
        )}

        {view === "month" && (
          <MonthGrid
            monthDate={monthDate}
            events={events}
            onDayClick={(d) => {
              setEditing(null);
              setDefaultStart(d);
              setFormOpen(true);
            }}
            onEventClick={(ev) => {
              setEditing(ev);
              setFormOpen(true);
            }}
          />
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          {view === "month" ? (
            <CalendarDays className="w-5 h-5 text-brand-600" />
          ) : (
            <CalIcon className="w-5 h-5 text-brand-600" />
          )}
          {view === "week" && "Tous les événements de la semaine"}
          {view === "day" && "Événements du jour"}
          {view === "month" && "Événements du mois"}
        </h2>
        {events.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">
            Aucun événement cette semaine. Clique sur une case du calendrier pour en créer un.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((ev) => {
              const s = new Date(ev.start_time);
              const e = new Date(ev.end_time);
              return (
                <div key={ev.id} className="card p-4 group hover:shadow-glow transition">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 self-stretch rounded-full" style={{ background: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{ev.title}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {format(s, "EEEE d MMM, HH:mm", { locale: fr })}–{format(e, "HH:mm")}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ev.school_class && (
                          <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {ev.school_class.name}
                          </span>
                        )}
                        {ev.room && (
                          <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            📍 {ev.room}
                          </span>
                        )}
                        {ev.recurrence_weeks > 0 && (
                          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <Repeat className="w-3 h-3" /> +{ev.recurrence_weeks}sem
                          </span>
                        )}
                        {ev.reminder_minutes > 0 && (
                          <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                            <Bell className="w-3 h-3" /> {ev.reminder_minutes}min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                      <a
                        className="btn-icon"
                        href={googleCalendarLink(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ajouter à Google Calendar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setEditing(ev);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn-icon text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        onClick={() => onDelete(ev)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EventForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setDefaultStart(null);
        }}
        onSaved={load}
        event={editing}
        classes={classes}
        subjects={subjects}
        initialStart={defaultStart}
      />
    </div>
  );
}

interface DayGridProps {
  day: Date;
  events: ScheduleEvent[];
  onSlotClick: (d: Date) => void;
  onEventClick: (ev: ScheduleEvent) => void;
}

function DayGrid({ day, events, onSlotClick, onEventClick }: DayGridProps) {
  const dayEvents = events.filter((ev) => isSameDay(new Date(ev.start_time), day));
  return (
    <div className="overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: "60px 1fr" }}>
        {HOURS.map((h) => {
          const slotStart = new Date(day);
          slotStart.setHours(h, 0, 0, 0);
          const evs = dayEvents.filter((ev) => new Date(ev.start_time).getHours() === h);
          return (
            <div className="contents" key={h}>
              <div className="text-[11px] text-muted px-2 py-1 border-b border-r divider text-right">
                {String(h).padStart(2, "0")}h
              </div>
              <button
                type="button"
                onClick={() => onSlotClick(slotStart)}
                className="relative h-20 border-b divider hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-left"
              >
                {evs.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="absolute inset-x-2 top-1 rounded-lg p-2 text-white text-xs shadow-sm cursor-pointer hover:scale-[1.01] transition"
                    style={{ background: ev.color, minHeight: 32 }}
                  >
                    <div className="font-semibold truncate">{ev.title}</div>
                    <div className="opacity-90 text-[10px]">
                      {format(new Date(ev.start_time), "HH:mm")}–
                      {format(new Date(ev.end_time), "HH:mm")}
                      {ev.room ? ` • ${ev.room}` : ""}
                    </div>
                  </div>
                ))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MonthGridProps {
  monthDate: Date;
  events: ScheduleEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (ev: ScheduleEvent) => void;
}

function MonthGrid({ monthDate, events, onDayClick, onEventClick }: MonthGridProps) {
  const first = startOfMonth(monthDate);
  const last = endOfMonth(monthDate);
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  // 6 rows * 7 days = 42 cells
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[700px]">
        {weekDays.map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 border-b border-r divider bg-slate-50 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider text-muted text-center"
          >
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const isOutside = d < first || d > last;
          const isToday = isSameDay(d, new Date());
          const dayEvents = events.filter((ev) => isSameDay(new Date(ev.start_time), d));
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick(d)}
              className={`min-h-[110px] border-b border-r divider p-1.5 text-left transition group ${
                isOutside
                  ? "bg-slate-50/50 dark:bg-slate-900/40 text-muted"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div
                className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday ? "bg-brand-600 text-white" : ""
                }`}
              >
                {format(d, "d")}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="rounded px-1.5 py-0.5 text-[10px] text-white truncate cursor-pointer"
                    style={{ background: ev.color }}
                  >
                    {format(new Date(ev.start_time), "HH:mm")} {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted">+{dayEvents.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
