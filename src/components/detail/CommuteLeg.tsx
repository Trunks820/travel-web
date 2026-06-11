import type { CommuteLeg as CommuteLegType } from "@/types/trip";
import { commuteModeName, formatMinutes, formatDistance } from "@/utils/format";

interface CommuteLegProps {
  leg: CommuteLegType;
}

const MODE_ICON: Record<string, string> = {
  walking: "🚶",
  transit: "🚌",
  taxi: "🚕",
};

export function CommuteLeg({ leg }: CommuteLegProps) {
  return (
    <div className="ml-[22px] flex items-center gap-2 border-l border-dashed border-primary-200 py-1.5 pl-5">
      <span className="inline-flex items-center gap-1 rounded-full bg-sand-50 px-2 py-0.5 text-[11px] text-sand-500">
        {MODE_ICON[leg.mode] ?? "→"} {commuteModeName(leg.mode)}{" "}
        {formatMinutes(leg.duration_minutes)} · {formatDistance(leg.distance_meters)}
      </span>
    </div>
  );
}
