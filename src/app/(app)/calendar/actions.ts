"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type DayMark, moveOnto, toMark } from "@/lib/calendar";
import { availability, plusOneService } from "@/lib/extraction";
import { db, schema } from "@/lib/db";
import { isoDate } from "@/lib/validation";

const dayMark = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("F"),
    notice: z.union([z.literal(48), z.literal(24)]),
  }),
  z.object({ code: z.literal("R") }),
  z.object({ code: z.literal("M") }),
  z.object({
    code: z.literal("L"),
    services: z.number().int().min(1).max(3),
    trial: z.literal(true).optional(),
  }),
  z.object({
    code: z.literal("H"),
    kind: z.enum(["F", "R"]),
    half: z.enum(["M", "P"]),
    services: z.number().int().min(0).max(3),
    trial: z.literal(true).optional(),
  }),
]);

/**
 * A mark as the columns of its row. Half a day of rest is stored as "R" with
 * its half, half a day of ferie as "H": a whole rest is "R" with no half.
 */
function rowValues(mark: DayMark) {
  const services =
    mark.code === "L" || mark.code === "H" ? mark.services : null;
  return {
    code: mark.code === "H" && mark.kind === "R" ? "R" : mark.code,
    services,
    noticeHours: mark.code === "F" ? mark.notice : null,
    halfDay: mark.code === "H" ? mark.half : null,
    trial:
      (mark.code === "L" || mark.code === "H") &&
      mark.trial === true &&
      Boolean(services),
  };
}

/**
 * Records what a bearer did on a day, replacing whatever was there. `null`
 * clears the day.
 */
export async function setDay(
  bearerId: string,
  date: string,
  mark: DayMark | null,
): Promise<{ error?: string }> {
  if (!isoDate.safeParse(date).success) return { error: "Data non valida." };
  const parsed = mark === null ? null : dayMark.safeParse(mark);
  if (parsed && !parsed.success) return { error: "Scelta non valida." };

  // Rest is for bearers on a contract, the trial period for everyone else:
  // the menu offers each to them alone, and the server holds the line too.
  const data = parsed?.data;
  const rest =
    data && (data.code === "R" || (data.code === "H" && data.kind === "R"));
  const trial = data && (data.code === "L" || data.code === "H") && data.trial;
  if (rest || trial) {
    const [bearer] = await db
      .select({ hasContract: schema.bearers.hasContract })
      .from(schema.bearers)
      .where(eq(schema.bearers.id, bearerId))
      .limit(1);
    if (rest && !bearer?.hasContract) {
      return { error: "Il riposo è solo per chi ha il contratto." };
    }
    if (trial && bearer?.hasContract) {
      return { error: "La prova non è per chi ha il contratto." };
    }
  }

  try {
    if (!data) {
      await db
        .delete(schema.bearerDays)
        .where(
          and(
            eq(schema.bearerDays.bearerId, bearerId),
            eq(schema.bearerDays.date, date),
          ),
        );
    } else {
      const values = rowValues(data as DayMark);
      await db
        .insert(schema.bearerDays)
        .values({ bearerId, date, ...values })
        .onConflictDoUpdate({
          target: [schema.bearerDays.bearerId, schema.bearerDays.date],
          set: values,
        });
    }
  } catch {
    // A bearer deleted meanwhile fails the foreign key.
    return { error: "Impossibile salvare il giorno." };
  }

  revalidatePath("/calendar");
  return {};
}

/**
 * Moves a bearer to where `overId` is on the calendar, shifting the others.
 *
 * The move rather than the whole list: the order is re-read here, so a page
 * opened before someone else moved a row, or added a bearer, does not
 * overwrite what they did.
 */
export async function moveBearer(
  id: string,
  overId: string,
): Promise<{ error?: string }> {
  try {
    // better-sqlite3 is synchronous, and so is its transaction callback.
    db.transaction((tx) => {
      const rows = tx
        .select({ id: schema.bearers.id })
        .from(schema.bearers)
        .orderBy(asc(schema.bearers.position), asc(schema.bearers.name))
        .all();
      moveOnto(rows, id, overId).forEach((row, position) =>
        tx
          .update(schema.bearers)
          .set({ position })
          .where(eq(schema.bearers.id, row.id))
          .run(),
      );
    });
  } catch {
    return { error: "Impossibile salvare l'ordine." };
  }

  revalidatePath("/calendar");
  return {};
}

/**
 * One more funeral service on `date` for each of the bearers picked for it.
 * Each day is re-read here: whoever has meanwhile been marked off, or already
 * has 3 services, is skipped and reported rather than overwritten.
 */
export async function addService(
  date: string,
  bearerIds: string[],
): Promise<{ error?: string; added?: string[]; skipped?: string[] }> {
  if (!isoDate.safeParse(date).success) return { error: "Data non valida." };
  const ids = z.array(z.string().min(1)).min(1).safeParse(bearerIds);
  if (!ids.success) return { error: "Scegli almeno un necroforo." };

  const added: string[] = [];
  const skipped: string[] = [];
  try {
    // better-sqlite3 is synchronous, and so is its transaction callback.
    db.transaction((tx) => {
      for (const id of new Set(ids.data)) {
        const [bearer] = tx
          .select({ name: schema.bearers.name })
          .from(schema.bearers)
          .where(eq(schema.bearers.id, id))
          .limit(1)
          .all();
        if (!bearer) continue;
        const [row] = tx
          .select()
          .from(schema.bearerDays)
          .where(
            and(
              eq(schema.bearerDays.bearerId, id),
              eq(schema.bearerDays.date, date),
            ),
          )
          .limit(1)
          .all();
        const current = row ? toMark(row) : undefined;
        const next = plusOneService(current);
        if (!next) {
          const status = availability(current);
          skipped.push(
            `${bearer.name} (${status.available ? "giorno pieno" : status.reason.toLowerCase()})`,
          );
          continue;
        }
        const values = rowValues(next);
        tx.insert(schema.bearerDays)
          .values({ bearerId: id, date, ...values })
          .onConflictDoUpdate({
            target: [schema.bearerDays.bearerId, schema.bearerDays.date],
            set: values,
          })
          .run();
        added.push(bearer.name);
      }
    });
  } catch {
    return { error: "Impossibile segnare il servizio." };
  }

  revalidatePath("/calendar", "layout");
  return { added, skipped };
}
