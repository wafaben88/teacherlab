import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalIcon,
  Trash2,
  Pencil,
} from "lucide-react";
import { addDays, format, startOfWeek, isSameDay, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../lib/api";
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

export function SchedulePage() {
  const toast = useToast();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);

  async function load() {
    const start = weekStart;
    const end = addDays(weekStart, 7);
    const [e, c, s] = await Promise.all([
      api.get<ScheduleEvent[]>("/api/schedule", {
        params: { start: start.toISOString(), end: end.toISOString() },
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
  }, [weekStart]);

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
        subtitle="Vue hebdomadaire de tes séances et événements."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Aujourd'hui
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button className="btn-icon" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="btn-icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="ml-2 font-semibold text-slate-900">
              Semaine du {format(weekStart, "d MMM yyyy", { locale: fr })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[900px]" style={{ gridTemplateColumns: "60px repeat(6, minmax(0, 1fr))" }}>
            <div className="bg-slate-50/50 border-b border-r border-slate-100" />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className="px-3 py-2.5 border-b border-l border-slate-100 bg-slate-50/50 text-center"
              >
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  {format(d, "EEE", { locale: fr })}
                </div>
                <div className={`text-sm font-semibold ${isSameDay(d, new Date()) ? "text-brand-600" : "text-slate-800"}`}>
                  {format(d, "d MMM", { locale: fr })}
                </div>
              </div>
            ))}

            {HOURS.map((h) => (
              <div className="contents" key={h}>
                <div className="text-[11px] text-slate-400 px-2 py-1 border-b border-r border-slate-100 bg-slate-50/30 text-right">
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
                      className="relative h-16 border-b border-l border-slate-100 hover:bg-slate-50 transition group text-left"
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
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <CalIcon className="w-5 h-5 text-brand-600" /> Tous les événements de la semaine
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
                      <div className="font-semibold text-slate-900 truncate">{ev.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {format(s, "EEEE d MMM, HH:mm", { locale: fr })}–{format(e, "HH:mm")}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ev.school_class && (
                          <span className="badge bg-slate-100 text-slate-700">{ev.school_class.name}</span>
                        )}
                        {ev.room && (
                          <span className="badge bg-slate-100 text-slate-700">📍 {ev.room}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
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
                        className="btn-icon text-rose-500 hover:bg-rose-50"
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
