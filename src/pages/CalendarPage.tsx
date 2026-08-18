import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { sv } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePlantBoard } from "@/hooks/usePlantBoard";
import { useAllCareTasksQuery, useAllHarvestsQuery, usePlantsWithSpecies } from "@/hooks/queries";
import { TASK_TYPE_LABELS, type Priority } from "@/types/domain";
import { toDateOnly, todayDateOnly } from "@/lib/date";

interface CalendarItem {
  date: string;
  label: string;
  priority: Priority;
  emoji: string;
}

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-[var(--color-urgent)]",
  medium: "bg-[var(--color-soon)]",
  low: "bg-[var(--color-ok)]",
};

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayDateOnly());

  const { actions } = usePlantBoard();
  const { data: plants } = usePlantsWithSpecies();
  const tasksQuery = useAllCareTasksQuery();
  const harvestsQuery = useAllHarvestsQuery();

  const plantById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);

  const items = useMemo<CalendarItem[]>(() => {
    const fromActions = actions.map((a) => ({
      date: a.dueDate,
      label: `${a.plantName} – ${a.title}`,
      priority: a.priority,
      emoji: a.emoji,
    }));
    const fromManualTasks = (tasksQuery.data ?? [])
      .filter((t) => !t.completedAt && t.source === "manual")
      .map((t) => ({
        date: t.dueDate,
        label: `${plantById.get(t.plantId)?.name ?? "Växt"} – ${t.title || TASK_TYPE_LABELS[t.taskType]}`,
        priority: t.priority,
        emoji: plantById.get(t.plantId)?.emoji ?? "🌱",
      }));
    const fromHarvests = (harvestsQuery.data ?? []).map((h) => ({
      date: h.harvestDate,
      label: `Skörd: ${plantById.get(h.plantId)?.name ?? "Växt"}${h.cropName ? ` (${h.cropName})` : ""}`,
      priority: "low" as Priority,
      emoji: "🧺",
    }));
    return [...fromActions, ...fromManualTasks, ...fromHarvests];
  }, [actions, tasksQuery.data, harvestsQuery.data, plantById]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedItems = itemsByDate.get(selected) ?? [];

  return (
    <div>
      <PageHeader title="Kalender" subtitle="Vattning, gödsling, beskärning, skörd och mer" />

      <Card className="p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <button onClick={() => setCursor((c) => subMonths(c, 1))} className="rounded-full p-2 hover:bg-[var(--color-surface-muted)]" aria-label="Föregående månad">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-display font-medium capitalize">{format(cursor, "MMMM yyyy", { locale: sv })}</p>
          <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-full p-2 hover:bg-[var(--color-surface-muted)]" aria-label="Nästa månad">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-ink-muted)]">
          {["M", "T", "O", "T", "F", "L", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateStr = toDateOnly(day);
            const dayItems = itemsByDate.get(dateStr) ?? [];
            const inMonth = isSameMonth(day, cursor);
            return (
              <button
                key={dateStr}
                onClick={() => setSelected(dateStr)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-start gap-0.5 rounded-xl pt-1 text-xs",
                  !inMonth && "opacity-30",
                  isSameDay(day, new Date(selected)) && "bg-[var(--color-primary-light)]",
                  isToday(day) && "font-semibold text-[var(--color-primary)]",
                )}
              >
                {format(day, "d")}
                <span className="flex gap-0.5">
                  {dayItems.slice(0, 3).map((item, i) => (
                    <span key={i} className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[item.priority])} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <section className="mt-5">
        <h2 className="mb-2 font-display text-lg font-semibold">
          {format(new Date(selected), "d MMMM", { locale: sv })}
        </h2>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Inga aktiviteter denna dag.</p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item, i) => (
              <Card key={i} className="flex items-center gap-3 p-3">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[item.priority])} />
                <span className="text-lg">{item.emoji}</span>
                <span className="text-sm">{item.label}</span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
