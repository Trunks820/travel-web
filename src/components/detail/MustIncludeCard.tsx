import type { TripMustInclude } from "@/types/trip";

interface MustIncludeCardProps {
  items: TripMustInclude[];
}

/** 状态 → 徽标文案与配色。未排入项必须显式露出，不得隐藏或伪装成已安排 */
function statusBadge(item: TripMustInclude): { text: string; className: string; icon: string } {
  switch (item.status) {
    case "scheduled":
      return { text: "已安排", className: "bg-primary-50 text-primary-600", icon: "fa-circle-check" };
    case "not_scheduled":
      return { text: "未能安排", className: "bg-amber-50 text-amber-600", icon: "fa-circle-exclamation" };
    case "cross_city":
      return { text: "不在本城市", className: "bg-gray-100 text-gray-500", icon: "fa-location-arrow" };
    case "recorded_unmatched":
      return { text: "未匹配到地点", className: "bg-gray-100 text-gray-500", icon: "fa-circle-question" };
    case "recorded_candidate":
    default:
      return { text: "已记录", className: "bg-gray-100 text-gray-500", icon: "fa-circle-info" };
  }
}

export function MustIncludeCard({ items }: MustIncludeCardProps) {
  if (items.length === 0) return null;
  const unscheduled = items.filter((i) => i.status !== "scheduled").length;

  return (
    <div className="rounded-xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">必去地点</h2>
        {unscheduled > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
            {unscheduled} 项未安排
          </span>
        )}
      </div>
      <ul className="space-y-2.5">
        {items.map((item) => {
          const badge = statusBadge(item);
          return (
            <li key={`${item.name}-${item.status}`} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-gray-700">{item.name}</span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
                >
                  <i className={`fa-solid ${badge.icon} text-[9px]`} aria-hidden="true" />
                  {badge.text}
                </span>
              </div>
              {/* 后端返回的原因原样展示，前端不改写、不猜测 */}
              {item.status !== "scheduled" && item.reason && (
                <p className="mt-1 leading-relaxed text-gray-500">{item.reason}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
