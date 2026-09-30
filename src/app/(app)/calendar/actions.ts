"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type DayMark, moveOnto } from "@/lib/calendar";
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
      // Half a day of rest is stored as "R" with its half, half a day of
      // ferie as "H": a whole rest is "R" with no half.
      const values = {
        code: data.code === "H" && data.kind === "R" ? "R" : data.code,
        services: data.code === "L" || data.code === "H" ? data.services : null,
        noticeHours: data.code === "F" ? data.notice : null,
        halfDay: data.code === "H" ? data.half : null,
        trial:
          Boolean(trial) &&
          (data.code === "L" || data.code === "H") &&
          data.services > 0,
      };
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
