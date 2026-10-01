"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  bearerLabel,
  type CalendarDay,
  DAY_MARKS,
  hidesTotal,
  type DayMark,
  markLabel,
  markSign,
  monthLabel,
  runningTotals,
} from "@/lib/calendar";
import type { Bearer } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { DAY_FORMAT, MarkGlyph, MarkOptions, utc } from "./mark-menu";

export const key = (bearerId: string, date: string) => `${bearerId}|${date}`;

/**
 * The month as the paper sheet lays it out: a yellow heading with the days,
 * Sundays in red, one shaded row per bearer. The colours are classes in
 * globals.css because print has to force them back to the light version.
 *
 * Narrower than the month, the days scroll sideways under the name and the
 * total, which stay put.
 *
 * The rows are dragged into order by the grip beside the name, and only by
 * that: the cells stay free to open their menu.
 */
export function CalendarGrid({
  month,
  bearers,
  calendar,
  marks,
  today,
  onChoose,
  onReorder,
}: {
  month: string;
  bearers: Bearer[];
  calendar: CalendarDay[];
  marks: Map<string, DayMark>;
  today: string;
  onChoose: (bearerId: string, date: string, mark: DayMark | null) => void;
  onReorder: (bearerId: string, overId: string) => void;
}) {
  // One menu open at a time, so the grid tracks which cell has it.
  const [openCell, setOpenCell] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Opens on today when the month does not fit: the days that matter are
  // the recent ones, not the 1st.
  useEffect(() => {
    const box = scroller.current;
    const cell = box?.querySelector<HTMLElement>("[data-today]");
    if (!box || !cell || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = cell.offsetLeft - box.clientWidth / 2;
  }, []);

  // The total up to today has a column of its own, in the current month only:
  // in a past one it is the Tot., in a future one nothing.
  const todayIndex = calendar.findIndex((d) => d.date === today);
  const thisMonth = todayIndex >= 0;

  const sensors = useSensors(
    // A few pixels before a drag starts, so a tap on the grip is not one.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = bearers.map((b) => b.id);

  function drop({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  function choose(
    bearerId: string,
    date: string,
    mark: DayMark | null,
    keepOpen = false,
  ) {
    if (!keepOpen) setOpenCell(null);
    onChoose(bearerId, date, mark);
  }

  return (
    // Outside the table: it renders a hidden <div> for screen readers, which a
    // <table> cannot hold. A fixed id, because the generated one differs
    // between server and client and breaks hydration.
    <DndContext
      id="calendar-order"
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={drop}
    >
      <div>
        <div
          ref={scroller}
          className="overflow-x-auto overscroll-x-contain print:overflow-visible"
        >
          <table
            className={cn(
              "calendar w-full table-fixed text-xs print:min-w-0",
              thisMonth ? "min-w-[68.5rem]" : "min-w-[66rem]",
            )}
            // Print stretches the rows to fill the sheet, so it needs the count.
            style={{ "--calendar-rows": bearers.length } as CSSProperties}
          >
            <colgroup>
              <col className="w-56" />
              {thisMonth && <col className="w-10 print:hidden" />}
              {calendar.map((d) => (
                <col key={d.day} />
              ))}
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="calendar-head">
                <th className="calendar-sunday sticky left-0 z-10 bg-inherit px-1.5 py-1.5 text-left font-semibold print:static">
                  {monthLabel(month)}
                </th>
                {thisMonth && (
                  <th
                    className="calendar-today sticky left-56 z-10 bg-inherit py-1.5 text-center font-semibold print:hidden"
                    title="Totale fino a oggi: le ferie ancora da venire non contano"
                  >
                    Oggi
                  </th>
                )}
                {calendar.map((d) => (
                  <th
                    key={d.day}
                    data-today={d.date === today || undefined}
                    className={cn(
                      "py-1.5 text-center font-semibold",
                      d.isHoliday && "calendar-sunday",
                    )}
                  >
                    {/* Today in a coloured disc, its column tinted below. */}
                    <span
                      className={cn(
                        d.date === today &&
                          "inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground print:size-auto print:bg-transparent print:text-inherit",
                      )}
                    >
                      {d.day}
                    </span>
                  </th>
                ))}
                <th
                  className="calendar-total sticky right-0 z-10 py-1.5 text-center font-semibold print:static"
                  title="Servizi del mese"
                >
                  Tot.
                </th>
              </tr>
            </thead>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <tbody>
                {bearers.map((b, i) => {
                  const contract = b.hasContract;
                  const rowMarks = calendar.map((d) =>
                    marks.get(key(b.id, d.date)),
                  );
                  const totals = runningTotals(rowMarks, calendar, contract);
                  return (
                    <SortableRow
                      key={b.id}
                      id={b.id}
                      className={
                        i % 2 ? "calendar-row-even" : "calendar-row-odd"
                      }
                    >
                      {(grip) => (
                        <>
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-inherit py-1 pr-1.5 pl-0.5 text-left font-semibold print:static print:px-1.5"
                          >
                            <div className="flex items-center gap-0.5">
                              {grip(`Sposta ${b.name}`)}
                              <div className="min-w-0">
                                <p className="truncate" title={bearerLabel(b)}>
                                  {bearerLabel(b)}
                                </p>
                                {/* Screen only: the printed sheet goes on a
                                    wall. */}
                                {b.note && (
                                  <p
                                    data-bearer-note
                                    className="truncate text-[10px] leading-tight font-normal text-muted-foreground print:hidden"
                                    title={b.note}
                                  >
                                    {b.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </th>
                          {thisMonth && (
                            <td
                              data-total-today
                              className="calendar-today sticky left-56 z-10 bg-inherit text-center font-bold print:hidden"
                            >
                              {totals[todayIndex] || ""}
                            </td>
                          )}
                          {calendar.map((d, j) => {
                            const k = key(b.id, d.date);
                            const mark = rowMarks[j];
                            // No points to show in the corner of a contract's
                            // ferie or of a rest.
                            const showTotal =
                              mark && !hidesTotal(mark, contract);
                            const day = DAY_FORMAT.format(utc(d.date));
                            return (
                              <td
                                key={d.day}
                                className={cn(
                                  "p-0",
                                  d.isHoliday && "calendar-holiday",
                                  d.date === today && "calendar-today",
                                )}
                              >
                                <Popover
                                  open={openCell === k}
                                  onOpenChange={(open) =>
                                    setOpenCell(open ? k : null)
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={`${b.name}, ${day}: ${mark ? markLabel(mark, contract).toLowerCase() : "nulla segnato"}`}
                                      className="calendar-cell relative block h-7 w-full font-bold whitespace-nowrap hover:bg-foreground/10"
                                    >
                                      {mark && (
                                        <MarkGlyph
                                          mark={mark}
                                          isHoliday={d.isHoliday}
                                          hasContract={contract}
                                        />
                                      )}
                                      {/* The month's total so far, in the corner. */}
                                      {showTotal && (
                                        <span className="calendar-corner absolute right-0.5 bottom-0 text-[8px] leading-none font-medium">
                                          {totals[j]}
                                        </span>
                                      )}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-52 gap-0 p-1"
                                    align="start"
                                  >
                                    <p className="px-2 py-1 text-xs text-muted-foreground">
                                      {b.name}, {day}
                                    </p>
                                    <MarkOptions
                                      bearer={b}
                                      day={d}
                                      mark={mark}
                                      onPick={(m, keepOpen) =>
                                        choose(b.id, d.date, m, keepOpen)
                                      }
                                    />
                                  </PopoverContent>
                                </Popover>
                              </td>
                            );
                          })}
                          <td
                            data-total
                            className="calendar-total sticky right-0 z-10 text-center font-bold print:static"
                          >
                            {totals.at(-1) || ""}
                          </td>
                        </>
                      )}
                    </SortableRow>
                  );
                })}
              </tbody>
            </SortableContext>
          </table>
        </div>
        <p className="calendar-legend mt-1 flex flex-wrap gap-x-8 gap-y-0.5 border-t pt-1 text-[10px] font-medium uppercase">
          {thisMonth && (
            <span className="print:hidden">
              Oggi = totale fino a oggi, senza le ferie ancora da venire
            </span>
          )}
          <span>Ferie avviso 48 ore = F1 (festivo F4)</span>
          <span>Ferie avviso 24 ore = F2 (festivo F8)</span>
          <span>
            Ferie mezza giornata = F piccola in alto (mattina) o in basso
            (pomeriggio): 1 punto (festivo 4)
          </span>
          <span>Necrofori con contratto: ferie = F, senza punti</span>
          <span>Malattia = M, tutta la giornata, senza punti</span>
          <span>
            Viaggio = V, tutta la giornata o V piccola in alto (mattina) o in
            basso (pomeriggio): senza punti, per tutti
          </span>
          <span>
            Servizi in prova = P, PP, PPP (non per chi ha il contratto)
          </span>
          <span>
            Riposo (solo contratto) = R, mezza giornata R piccola in alto o in
            basso: senza punti
          </span>
          {DAY_MARKS.filter((m) => m.code === "L").map((m) => (
            <span key={markLabel(m)}>
              {markLabel(m)} = {markSign(m, false)}
            </span>
          ))}
          <span>Servizi di domeniche e festivi non contano nel totale</span>
        </p>
      </div>
    </DndContext>
  );
}

/**
 * A calendar row that can be dragged. The grip is handed to the cells rather
 * than put in the row itself, so the name cell decides where it goes.
 */
function SortableRow({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: (grip: (label: string) => ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      data-bearer-row={id}
      className={cn(className, isDragging && "relative z-20 opacity-80")}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children((label) => (
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={label}
          className="shrink-0 cursor-grab touch-none rounded text-muted-foreground hover:text-foreground active:cursor-grabbing print:hidden"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
      ))}
    </tr>
  );
}
