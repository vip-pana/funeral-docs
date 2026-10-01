/**
 * Picking the bearers for a funeral: pure helpers, no database, so the page
 * can run them in the browser as the inputs change.
 *
 * Two things matter. The coffin has to ride level, so the bearers should be
 * of a similar height at the shoulder. And the work has to be shared out
 * fairly: whoever has the lowest month's total (the Tot. column) goes first,
 * so that by the end of the month everyone has done about the same.
 */

import {
  type DayMark,
  HALF_DAY_LABEL,
  HALF_KIND_LABEL,
  TRAVEL_LABEL,
} from "@/lib/calendar";

export type Availability =
  { available: true; note?: string } | { available: false; reason: string };

/** Whether a bearer can take one more funeral on a day holding `mark`. */
export function availability(mark: DayMark | undefined): Availability {
  if (!mark) return { available: true };
  switch (mark.code) {
    case "F":
      return { available: false, reason: "Ferie" };
    case "R":
      return { available: false, reason: "Riposo" };
    case "M":
      return { available: false, reason: "Malattia" };
    case "V":
      return { available: false, reason: TRAVEL_LABEL };
    case "L":
    case "H": {
      if (mark.services === 3) {
        return { available: false, reason: "Già 3 servizi" };
      }
      const notes = [];
      if (mark.code === "H") {
        notes.push(
          `${HALF_KIND_LABEL[mark.kind]} ${HALF_DAY_LABEL[mark.half].toLowerCase()}`,
        );
      }
      if (mark.travel) {
        notes.push(
          `${TRAVEL_LABEL} ${HALF_DAY_LABEL[mark.travel].toLowerCase()}`,
        );
      }
      if (mark.services) notes.push(servicesNote(mark.services));
      const note = notes.join(", ");
      return note ? { available: true, note } : { available: true };
    }
  }
}

const servicesNote = (n: number) =>
  n === 1 ? "1 servizio già segnato" : `${n} servizi già segnati`;

/**
 * The day with one more service: the half day off, the travel and the trial
 * flag stay. Null when the day has no room for it.
 */
export function plusOneService(mark: DayMark | undefined): DayMark | null {
  if (!mark) return { code: "L", services: 1 };
  if (mark.code === "L" || mark.code === "H") {
    if (mark.services === 3) return null;
    return { ...mark, services: (mark.services + 1) as 1 | 2 | 3 };
  }
  return null;
}

export type Candidate = {
  id: string;
  /** Shoulder height in centimetres. */
  height: number;
  /** The month's total so far, as in the Tot. column. */
  total: number;
};

export type Team = {
  ids: string[];
  /** Tallest less shortest, in centimetres. */
  spread: number;
  /** No team of that size fitted the tolerance: this is the closest one. */
  widened: boolean;
};

/**
 * The best team of `size`: the lowest sum of totals among those whose heights
 * lie within `tolerance` centimetres of one another; on a tie, the one of the
 * closest heights, then the one first in the list. When no team fits, the one
 * of the closest heights, flagged as `widened`. Fewer than `size` candidates
 * all go in.
 */
export function pickTeam(
  candidates: Candidate[],
  size: number,
  tolerance: number,
): Team {
  return rankTeams(candidates, size, tolerance, 1)[0];
}

/** How many teams a band of equal totals may offer: enough for a choice. */
const TIES_PER_BAND = 50;

/**
 * The teams worth proposing, best first, as `pickTeam` ranks them: the first
 * is its answer, the next ones are what "Ricalcola" moves on to — those with
 * the same totals first, swapped among people on the same score, then the
 * next fairest.
 *
 * Every band of heights [low, high] is tried. Within a band the lowest totals
 * are the best choice; when several people share the total at the cut, each
 * way of picking among them is a team of its own, and leaving out one member
 * of the best team gives the next fairest. With a few dozen bearers that
 * stays in the low thousands.
 */
export function rankTeams(
  candidates: Candidate[],
  size: number,
  tolerance: number,
  limit = 20,
): Team[] {
  if (size <= 0) return [{ ids: [], spread: 0, widened: false }];
  const spreadOf = (team: Candidate[]) => {
    const hs = team.map((c) => c.height);
    return hs.length ? Math.max(...hs) - Math.min(...hs) : 0;
  };
  if (candidates.length <= size) {
    const spread = spreadOf(candidates);
    return [
      {
        ids: candidates.map((c) => c.id),
        spread,
        widened: spread > tolerance,
      },
    ];
  }

  const order = new Map(candidates.map((c, i) => [c.id, i]));
  const heights = [...new Set(candidates.map((c) => c.height))].sort(
    (a, b) => a - b,
  );
  // Lowest total first, then the one earlier in the list.
  const byTotal = [...candidates].sort(
    (a, b) => a.total - b.total || order.get(a.id)! - order.get(b.id)!,
  );

  type Found = { team: Candidate[]; sum: number; spread: number; rank: number };
  const found = new Map<string, Found>();
  const add = (team: Candidate[]) => {
    const key = team
      .map((c) => c.id)
      .sort()
      .join(",");
    if (found.has(key)) return;
    found.set(key, {
      team,
      sum: team.reduce((s, c) => s + c.total, 0),
      spread: spreadOf(team),
      rank: team.reduce((s, c) => s + order.get(c.id)!, 0),
    });
  };

  for (let i = 0; i < heights.length; i++) {
    for (let j = i; j < heights.length; j++) {
      const band = byTotal.filter(
        (c) => c.height >= heights[i] && c.height <= heights[j],
      );
      if (band.length < size) continue;
      const cut = band[size - 1].total;
      const sure = band.filter((c) => c.total < cut);
      const tied = band.filter((c) => c.total === cut);
      for (const pick of combinations(
        tied,
        size - sure.length,
        TIES_PER_BAND,
      )) {
        add([...sure, ...pick]);
      }
      // The next fairest: the band's best team with one of them left out.
      const best = band.slice(0, size);
      for (const out of best) {
        const rest = band.filter((c) => c !== out);
        if (rest.length >= size) add(rest.slice(0, size));
      }
    }
  }

  const all = [...found.values()];
  const within = all.filter((f) => f.spread <= tolerance);
  const compare = (spreadFirst: boolean) => (a: Found, b: Found) =>
    spreadFirst
      ? a.spread - b.spread || a.sum - b.sum || a.rank - b.rank
      : a.sum - b.sum || a.spread - b.spread || a.rank - b.rank;
  const ranked = within.length
    ? within.sort(compare(false))
    : all.sort(compare(true));
  return ranked.slice(0, limit).map((f) => ({
    // In the order of the list, whatever order they were picked in.
    ids: [...f.team]
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
      .map((c) => c.id),
    spread: f.spread,
    widened: within.length === 0,
  }));
}

/** Up to `max` ways of taking `k` of `items`, in the order of the list. */
function* combinations<T>(items: T[], k: number, max: number): Generator<T[]> {
  if (k <= 0) {
    yield [];
    return;
  }
  const idx = Array.from({ length: k }, (_, i) => i);
  for (let n = 0; n < max; n++) {
    yield idx.map((i) => items[i]);
    // The next combination: the rightmost index that can still move.
    let p = k - 1;
    while (p >= 0 && idx[p] === items.length - k + p) p--;
    if (p < 0) return;
    idx[p]++;
    for (let q = p + 1; q < k; q++) idx[q] = idx[q - 1] + 1;
  }
}
