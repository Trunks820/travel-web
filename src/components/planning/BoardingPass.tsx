import type { TripFormData } from "@/types/form";

interface BoardingPassProps {
  city: string;
  formData: TripFormData | null;
}

export function BoardingPass({ city, formData }: BoardingPassProps) {
  const days = formData?.days ?? null;
  const people = formData?.people_count ?? 1;

  return (
    <div className="relative w-[340px] max-w-full rotate-0 sm:rotate-[2deg]">
      <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-white/70 shadow-card overflow-hidden">
        {/* 票根头部 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <p className="text-sm font-bold text-primary-700">云途 · AI 行程</p>
          </div>
          <img src="/logo.svg" alt="" className="h-7 w-7" aria-hidden="true" />
        </div>

        {/* 路线 */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div>
            <p className="text-2xl font-bold text-gray-800 leading-none">出发</p>
          </div>
          <div className="flex-1 mx-3 flex items-center text-primary-500">
            <span className="h-px flex-1 bg-primary-200" />
            <i className="fas fa-plane mx-1 text-xs animate-pulse" aria-hidden="true" />
            <span className="h-px flex-1 bg-primary-200 border-dashed" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600 leading-none">{city}</p>
          </div>
        </div>

        {/* 撕裂分隔线 */}
        <div className="relative">
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-sand-100" />
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-sand-100" />
          <div className="border-t border-dashed border-gray-200 mx-4" />
        </div>

        {/* 票根信息 */}
        <div className="grid grid-cols-3 gap-2 px-6 py-4 text-center">
          <div>
            <p className="text-[10px] text-gray-400">天数</p>
            <p className="text-sm font-bold text-gray-700">{days ? `${days} 天` : "-"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">旅客</p>
            <p className="text-sm font-bold text-gray-700">{people} 人</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">舱位</p>
            <p className="text-sm font-bold text-accent-500">定制</p>
          </div>
        </div>

        {/* 条形码 */}
        <div className="px-6 pb-5">
          <div
            className="h-9 rounded-sm opacity-70"
            style={{
              background:
                "repeating-linear-gradient(90deg, #1f2937 0 2px, transparent 2px 5px, #1f2937 5px 6px, transparent 6px 10px)",
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
