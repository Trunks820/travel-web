import { useEffect, useRef, useState } from "react";
import { fetchHotPlaces, type HotPlace } from "@/services/api";
import type { RequestedCommuteMode, MustIncludeItem } from "@/types/form";

interface MorePreferencesProps {
  city: string;
  mustInclude: MustIncludeItem[];
  onMustIncludeChange: (v: MustIncludeItem[]) => void;
  commuteMode: RequestedCommuteMode;
  onCommuteModeChange: (v: RequestedCommuteMode) => void;
  dailyStart: string;
  dailyEnd: string;
  onDailyStartChange: (v: string) => void;
  onDailyEndChange: (v: string) => void;
}

const COMMUTE_OPTIONS: { value: RequestedCommuteMode; label: string; icon: string }[] = [
  { value: "driving", label: "自驾/打车", icon: "fas fa-car" },
  { value: "transit", label: "公共交通", icon: "fas fa-bus" },
  { value: "cycling", label: "骑行优先", icon: "fas fa-bicycle" },
];

const MAX_MUST_INCLUDE = 5;

export function MorePreferences({
  city,
  mustInclude,
  onMustIncludeChange,
  commuteMode,
  onCommuteModeChange,
  dailyStart,
  dailyEnd,
  onDailyStartChange,
  onDailyEndChange,
}: MorePreferencesProps) {
  const [open, setOpen] = useState(false);
  const [hotPlaces, setHotPlaces] = useState<HotPlace[]>([]);
  const [input, setInput] = useState("");
  // 记录已拉取的城市，城市变了才重新拉；接口失败静默降级为纯手输
  const fetchedCityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !city || fetchedCityRef.current === city) return;
    let cancelled = false;
    fetchedCityRef.current = city;
    fetchHotPlaces(city)
      .then((places) => { if (!cancelled) setHotPlaces(places); })
      .catch(() => { if (!cancelled) setHotPlaces([]); });
    return () => { cancelled = true; };
  }, [open, city]);

  const full = mustInclude.length >= MAX_MUST_INCLUDE;

  function addPlace(name: string, placeId?: number) {
    const trimmed = name.trim();
    if (!trimmed || mustInclude.some((p) => p.name === trimmed) || full) return;
    onMustIncludeChange([
      ...mustInclude,
      placeId != null ? { name: trimmed, place_id: placeId } : { name: trimmed },
    ]);
  }

  function removePlace(name: string) {
    onMustIncludeChange(mustInclude.filter((p) => p.name !== name));
  }

  const selectedCount =
    (mustInclude.length > 0 ? 1 : 0) + (commuteMode !== "driving" ? 1 : 0) +
    (dailyStart !== "09:00" || dailyEnd !== "21:00" ? 1 : 0);

  return (
    <div className="rounded-xl border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded-xl"
      >
        <span className="flex min-w-0 items-center font-bold text-gray-700">
          <i className="fas fa-sliders text-primary-500 mr-2" aria-hidden="true"></i>
          更多偏好
          <span className="font-normal text-gray-400 ml-1">(选填)</span>
          {!open && selectedCount > 0 ? (
            <span className="ml-2 shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600">
              已设置 {selectedCount} 项
            </span>
          ) : (
            !open && (
              <span className="ml-2 truncate text-xs font-normal text-gray-400">
                必去地点 · 出行方式 · 时间习惯
              </span>
            )
          )}
        </span>
        <i
          className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        ></i>
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-100 px-4 py-4">
          {/* 必去地点 */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-gray-700">
              必去地点
              <span className="ml-1.5 font-normal text-gray-400">最多 {MAX_MUST_INCLUDE} 个，会优先安排进行程</span>
            </p>

            {mustInclude.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {mustInclude.map(({ name }) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-2.5 py-1 text-xs text-white"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removePlace(name)}
                      aria-label={`移除 ${name}`}
                      className="p-0.5 -m-0.5 opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // 中文输入法组词中的回车不算确认
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addPlace(input);
                  setInput("");
                }
              }}
              disabled={full}
              placeholder={full ? `最多 ${MAX_MUST_INCLUDE} 个` : "输入地点名，回车添加"}
              aria-label="输入必去地点"
              className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            />

            {hotPlaces.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-500">{city}热门：</span>
                {hotPlaces
                  .filter((p) => !mustInclude.some((m) => m.name === p.name))
                  .slice(0, 10)
                  .map((p) => (
                    <button
                      key={p.place_id}
                      type="button"
                      onClick={() => addPlace(p.name, p.place_id)}
                      disabled={full}
                      className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[11px] text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                    >
                      + {p.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 出行方式（v0.8.10 后端接入中，字段先行） */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-gray-700" id="commute-mode-label">
              市内出行方式
            </p>
            <div className="flex gap-2" role="radiogroup" aria-labelledby="commute-mode-label">
              {COMMUTE_OPTIONS.map(({ value, label, icon }) => {
                const active = commuteMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onCommuteModeChange(value)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                      active
                        ? "border-primary-400 bg-primary-50 text-primary-600 font-medium"
                        : "border-gray-100 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <i className={`${icon} ${active ? "text-primary-500" : "text-gray-400"}`} aria-hidden="true"></i>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 每日时间窗 */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-gray-700">时间习惯</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>每天</span>
              <input
                type="time"
                value={dailyStart}
                onChange={(e) => onDailyStartChange(e.target.value)}
                aria-label="每天出发时间"
                className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span>出发 ·</span>
              <input
                type="time"
                value={dailyEnd}
                onChange={(e) => onDailyEndChange(e.target.value)}
                aria-label="每天结束时间"
                className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span>前结束</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
