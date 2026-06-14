import type { TripDay } from "@/types/trip";

/**
 * 前端推算每个地点的近似到达/离开时刻。
 *
 * ⚠️ 后端 ResultPlace 目前不返回真实时刻与停留时长，这里按经验值估算，
 * 仅用于时间线视觉呈现。后端补充真实 schedule 字段后应替换本函数。
 *
 * 规则：从 DAY_START 起，锚点类停留 ANCHOR_STAY、其余 FILLER_STAY，
 * 每段之间加上对应 commute_leg 的真实 duration_minutes。
 */

const DAY_START_MIN = 9 * 60; // 09:00
const ANCHOR_STAY = 90; // 锚点类停留分钟
const FILLER_STAY = 45; // 次要点停留分钟

const ANCHOR_ROLES = new Set(["anchor", "anchor_activity", "secondary_activity"]);

export interface PlaceSchedule {
  placeId: number;
  /** "09:00" */
  arrive: string;
  /** "11:30" */
  leave: string;
}

function fmt(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function computeSchedule(day: TripDay): Map<number, PlaceSchedule> {
  const result = new Map<number, PlaceSchedule>();
  let cursor = DAY_START_MIN;

  day.places.forEach((place) => {
    const stay = ANCHOR_ROLES.has(place.role) ? ANCHOR_STAY : FILLER_STAY;
    const arrive = cursor;
    const leave = cursor + stay;
    result.set(place.place_id, {
      placeId: place.place_id,
      arrive: fmt(arrive),
      leave: fmt(leave),
    });

    cursor = leave;
    // 加上从本点出发的通勤时间
    const leg = day.commute_legs.find((l) => l.from_place_id === place.place_id);
    if (leg) cursor += leg.duration_minutes;
  });

  return result;
}
