import type { TripDay } from "@/types/trip";
import { PlaceItem } from "./PlaceItem";
import { CommuteLeg } from "./CommuteLeg";

interface DayCardProps {
  day: TripDay;
  activePlaceId?: number | null;
  onPlaceClick?: (placeId: number) => void;
}

export function DayCard({ day, activePlaceId, onPlaceClick }: DayCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-primary-50 px-5 py-4">
        <h3 className="font-display text-sm font-bold text-primary-800">
          Day {day.day}
          <span className="ml-2 font-normal text-sand-500">{day.title}</span>
        </h3>
      </div>

      <div className="px-2 py-2">
        {day.places.map((place, i) => {
          const leg = day.commute_legs.find(
            (l) => l.from_place_id === place.place_id,
          );
          return (
            <div key={place.place_id}>
              <PlaceItem
                place={place}
                index={i}
                isActive={activePlaceId === place.place_id}
                isLast={i === day.places.length - 1}
                onClick={() => onPlaceClick?.(place.place_id)}
              />
              {leg && <CommuteLeg leg={leg} />}
            </div>
          );
        })}
      </div>

      {day.commute_summary && (
        <div className="border-t border-primary-50 px-5 py-3">
          <p className="text-xs text-sand-400">{day.commute_summary}</p>
        </div>
      )}

      {day.narrative && (
        <div className="border-t border-primary-50 px-5 py-3.5">
          <p className="text-sm leading-relaxed text-primary-700">
            {day.narrative}
          </p>
        </div>
      )}
    </div>
  );
}
