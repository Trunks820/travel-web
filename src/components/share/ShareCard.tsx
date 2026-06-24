import { cityImageList } from "@/components/input/RotatingBackground";
import { isAnchorRole } from "@/constants/places";
import type { TripResult, TripPlan } from "@/types/trip";
import { forwardRef } from "react";

interface ShareCardProps {
  result: TripResult;
  plan?: TripPlan;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ result, plan }, ref) {
    const city = result.city.name;
    const image = cityImageList(city)[0];
    const days = result.request.days;
    const people = result.request.people_count;

    const highlights: string[] = [];
    if (plan) {
      for (const day of plan.days) {
        for (const place of day.places) {
          if (isAnchorRole(place.role) && !highlights.includes(place.name)) {
            highlights.push(place.name);
          }
          if (highlights.length >= 6) break;
        }
        if (highlights.length >= 6) break;
      }
    }

    const title = plan?.title ?? `${city} ${days}日行程`;
    const summary = plan?.summary ?? `为你规划了 ${result.plans.length} 个方案`;

    return (
      <div
        ref={ref}
        style={{ width: 1080, height: 720, fontSize: 16 }}
        className="flex overflow-hidden bg-[#fffcf7] font-sans"
      >
        {/* 左侧城市大图 */}
        <div className="relative" style={{ width: 648, height: 720 }}>
          <img
            src={image}
            alt={city}
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#fffcf7]/80" />
        </div>

        {/* 右侧信息 */}
        <div
          className="flex flex-col justify-between"
          style={{ width: 432, padding: "48px 40px 36px" }}
        >
          {/* 品牌 */}
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" style={{ width: 36, height: 36 }} crossOrigin="anonymous" />
            <div>
              <div className="text-lg font-bold text-gray-800">云途 YunTu</div>
              <div className="text-xs text-gray-400">AI 智能旅行规划</div>
            </div>
          </div>

          {/* 行程信息 */}
          <div className="flex-1 flex flex-col justify-center" style={{ gap: 20 }}>
            <div>
              <div className="text-5xl font-bold text-gray-800 leading-tight">{city}</div>
              <div className="mt-3 flex items-center gap-3 text-base text-gray-500">
                <span>{days} 天</span>
                <span className="h-4 w-px bg-gray-200" />
                <span>{people} 人</span>
                {plan?.pace && (
                  <>
                    <span className="h-4 w-px bg-gray-200" />
                    <span>
                      {plan.pace.level === "RELAXED" ? "轻松" : plan.pace.level === "INTENSIVE" ? "紧凑" : "适中"}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-700 leading-snug">{title}</div>
              <div className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2">{summary}</div>
            </div>
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-lg bg-[#0a8e9a]/10 px-3 py-1.5 text-sm font-medium text-[#0a8e9a]"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 底部 */}
          <div className="flex items-end justify-between">
            <div>
              <div
                className="signature-font text-2xl text-[#0a8e9a] opacity-80"
                style={{ transform: "rotate(-3deg)" }}
              >
                好行程，慢慢挑
              </div>
              <div className="mt-2 text-xs text-gray-400">kakarot8.com</div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
