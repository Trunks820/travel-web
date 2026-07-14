import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiCitySelect } from '../components/input/MultiCitySelect';
import { DateRangeInput } from '../components/input/DateRangeInput';
import { BudgetSlider } from '../components/input/BudgetSlider';
import { MorePreferences } from '../components/input/MorePreferences';
import { RotatingBackground, useRotatingBackground, cityNameOfImage } from '../components/input/RotatingBackground';
import { submitTrip, ApiRequestError } from '../services/api';
import { useTripStore } from '../stores/tripStore';
import type { RequestedCommuteMode, MustIncludeItem } from '../types/form';

// 节奏滑块映射出的标签，与兴趣偏好同存于 preferences；回填时需从兴趣中剔除
const PACE_TAGS = ['轻松', '适中', '紧凑'];

const PREFERENCE_OPTIONS = [
  { label: '自然风光', icon: 'fas fa-mountain' },
  { label: '文化历史', icon: 'fas fa-university' },
  { label: '美食', icon: 'fas fa-utensils' },
  { label: '亲子', icon: 'fas fa-child' },
  { label: '购物', icon: 'fas fa-shopping-bag' },
  { label: 'citywalk', icon: 'fas fa-walking' },
  { label: '拍照', icon: 'fas fa-camera' },
  { label: '夜景', icon: 'fas fa-moon' },
];

function PreferenceBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
        active
          ? 'bg-primary-50 border-primary-400 text-primary-700 font-medium'
          : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <i className={`${icon} ${active ? 'text-primary-500' : 'text-gray-400'}`} aria-hidden="true"></i>
      <span>{label}</span>
      {active && (
        <i className="fas fa-check text-primary-500 ml-1 text-xs" aria-hidden="true"></i>
      )}
    </button>
  );
}

function isoDateAfter(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export default function InputPage() {
  const navigate = useNavigate();
  const setFormData = useTripStore((s) => s.setFormData);
  const clearResult = useTripStore((s) => s.clearResult);
  // 一次性读取上次提交的表单（来自 sessionStorage），用于失败/返回首页后回填，
  // 避免用户丢掉已填的选择。getState() 只读不订阅，不会触发额外重渲染。
  const stored = useMemo(() => useTripStore.getState().formData, []);
  const storedPrefs = stored?.preferences ?? null;
  const [cities, setCities] = useState<string[]>(
    stored?.to_city ? [stored.to_city] : ['重庆'],
  );
  // 默认：明天出发，共 3 天行程
  const [startDate, setStartDate] = useState(() => stored?.start_date || isoDateAfter(1));
  const [endDate, setEndDate] = useState(() => stored?.end_date || isoDateAfter(3));
  const [preferences, setPreferences] = useState<string[]>(
    storedPrefs
      ? storedPrefs.filter((p) => !PACE_TAGS.includes(p))
      : ['自然风光'],
  );
  const [people, setPeople] = useState(stored?.people_count ?? 1);
  const [pace, setPace] = useState(
    storedPrefs?.includes('轻松') ? 20 : storedPrefs?.includes('紧凑') ? 80 : 60,
  );
  const [notes, setNotes] = useState(stored?.notes ?? '');
  const [budget, setBudget] = useState(stored?.budget ?? 5000);
  // v0.8.9 更多偏好（折叠区，选填）。commute_mode 由 v0.8.10 后端接入，字段先行
  const [mustInclude, setMustInclude] = useState<MustIncludeItem[]>(stored?.must_include ?? []);
  // 旧 stored formData 可能含已废弃的 "walking"，降级到 "driving"
  const storedCommute = stored?.commute_mode;
  const [commuteMode, setCommuteMode] = useState<RequestedCommuteMode>(
    storedCommute === "driving" || storedCommute === "transit" || storedCommute === "cycling"
      ? storedCommute
      : "driving",
  );
  // v0.8.12：时间偏好默认为空（无固定时间）。空字符串 = 未设置，
  // 提交时不发对应字段，绝不折算成 09:00/21:00 之类的默认钟点
  const [dailyStart, setDailyStart] = useState(stored?.daily_start ?? '');
  const [dailyEnd, setDailyEnd] = useState(stored?.daily_end ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | undefined>(undefined);

  // 目的城市变更时清空必去地点：已选地点绑定于上个城市（如重庆洪崖洞），
  // 换城后语义失效，直接清空，避免带到新城市造成脏数据
  const handleCitiesChange = (next: string[]) => {
    if (next[0] !== cities[0]) setMustInclude([]);
    setCities(next);
  };

  const togglePreference = (pref: string) => {
    setPreferences(prev => {
      const next = prev.includes(pref)
        ? prev.filter(p => p !== pref)
        : [...prev, pref];
      return next;
    });
    // 亲子默认至少 1 大人 + 1 小孩：勾选"亲子"且当前仅 1 人时，自动顶到 2 人，
    // 化解"1 人却带亲子"的语义悖论。取消勾选不回退人数（用户可能确有 2 人）。
    if (pref === '亲子' && !preferences.includes('亲子') && people < 2) {
      setPeople(2);
    }
  };

  // 实时计算行程天数，超过 7 天时给出提示（不阻断，提交时按 7 天处理）
  const overLimit = useMemo(() => {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (isNaN(ms) || ms < 0) return false;
    return Math.round(ms / 86400000) + 1 > 7;
  }, [startDate, endDate]);

  const { current: bgImage, incoming: bgIncoming } = useRotatingBackground(cities);
  const polaroidImage = bgImage;
  const polaroidCity = cityNameOfImage(bgImage);

  const handleSubmit = async () => {
    if (submitting) return;

    if (cities.length === 0) {
      setCityError('请至少选择一个目的地');
      return;
    }
    setCityError(undefined);

    const dayMs =
      new Date(endDate).getTime() - new Date(startDate).getTime();
    if (!startDate || !endDate || isNaN(dayMs) || dayMs < 0) {
      setSubmitError('请选择有效的旅行时间（返程不能早于出发）');
      return;
    }
    const rawDays = Math.round(dayMs / 86400000) + 1;
    const days = Math.min(7, rawDays);

    setSubmitting(true);
    setSubmitError(null);
    // 节奏滑块映射为后端真正消费的 preferences 标签（后端按关键词识别）。
    // 三档都显式传达，让"适中"也是一个明确选择，而非"未表态"。
    const paceTag = pace < 34 ? '轻松' : pace > 67 ? '紧凑' : '适中';
    const formData = {
      to_city: cities[0],
      start_date: startDate,
      end_date: endDate,
      days,
      people_count: people,
      preferences: [...preferences, paceTag],
      avoid: [],
      // 仅发用户在「特殊需求」里输入的真实文本；
      // 节奏走 preferences、多城市后端暂不支持
      notes: notes.trim(),
      // 人均预算上限，来自预算滑块；后端是否解析由后端决定，前端先发
      budget,
      // v0.8.9 更多偏好：仅在用户改过默认值时携带，未设置不发（契约：选填）
      ...(mustInclude.length > 0 && { must_include: mustInclude }),
      ...(commuteMode !== 'driving' && { commute_mode: commuteMode }),
      // v0.8.12：开始/结束时间各自独立，填了才发；都不填即"无固定时间"
      ...(dailyStart && { daily_start: dailyStart }),
      ...(dailyEnd && { daily_end: dailyEnd }),
    };
    setFormData(formData);
    clearResult(); // 清掉上一条 job 的结果，避免 loading 阶段闪现旧城市
    try {
      const res = await submitTrip(formData);
      navigate(`/planning/${res.job_id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiRequestError ? err.message : '提交失败，请稍后重试'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen -mt-14 pt-14">
      {/* 固定背景图（随目的地/定时轮换） */}
      <RotatingBackground current={bgImage} incoming={bgIncoming} />

      {/* 主体内容 */}
      <main className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-8 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-8 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-12 lg:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pt-16">
        {/* 左侧：品牌与特性（窄屏简化：保留标题，隐藏特性列表与签名） */}
        <div className="lg:pt-12 animate-slide-up">
          <div className="mb-6 lg:mb-12">
            <h1 className="mb-3 text-3xl font-bold leading-tight text-gray-800 sm:text-4xl lg:mb-4 xl:text-5xl">
              放下攻略，随时出发
              <br />
              <span className="text-primary-500">路线和走法，我们来排</span>
            </h1>
            <p className="text-base text-gray-600 sm:text-xl">云途 YunTu · 你的旅行管家</p>
          </div>

          <p className="mb-8 hidden text-lg leading-relaxed text-gray-600 lg:block">
            填好城市和节奏，生成可跟着走的行程。
          </p>

          <div className="relative mt-20 hidden lg:inline-block">
            <p className="signature-font text-4xl text-primary-500 opacity-80 transform -rotate-6">
              在路上，才是正经事
            </p>
          </div>
        </div>

        {/* 右侧：表单卡片 */}
        <div className="journal-card relative overflow-hidden rounded-3xl p-5 pl-8 animate-slide-up-delay-1 sm:p-8 sm:pl-10">
          <div className="mb-6 flex items-start justify-between sm:mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
                定制你的路书
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                告诉我们你的期待，剩下的交给我们
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {/* 目的地 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-gray-700 font-bold flex items-center text-sm">
                  <i className="fas fa-map-marker-alt text-primary-500 mr-2" aria-hidden="true"></i> 目的地
                </label>
              </div>
              <MultiCitySelect value={cities} onChange={handleCitiesChange} multiCity={false} error={cityError} />
            </div>

            {/* 旅行时间 */}
            <div>
              <label className="text-gray-700 font-bold flex items-center text-sm mb-3">
                <i className="far fa-calendar-alt text-primary-500 mr-2" aria-hidden="true"></i> 旅行时间
              </label>
              <DateRangeInput
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
              />
              <div aria-live="polite">
                {overLimit && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <i className="fas fa-circle-info" aria-hidden="true"></i>
                    当前仅支持最多 7 天行程，将按 7 天为你规划
                  </p>
                )}
              </div>
            </div>

            {/* 出行人数 */}
            <div>
              <label className="text-gray-700 font-bold flex items-center text-sm mb-3" id="people-label">
                <i className="fas fa-user-group text-primary-500 mr-2" aria-hidden="true"></i> 出行人数
              </label>
              <div className="flex items-center gap-4" role="group" aria-labelledby="people-label">
                <button
                  type="button"
                  onClick={() => setPeople(p => Math.max(1, p - 1))}
                  disabled={people <= 1}
                  aria-label="减少人数"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                  <i className="fas fa-minus text-xs" aria-hidden="true"></i>
                </button>
                <span className="min-w-[3rem] text-center text-lg font-bold text-gray-800" aria-live="polite">
                  {people} <span className="text-sm font-normal text-gray-400">人</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPeople(p => Math.min(10, p + 1))}
                  disabled={people >= 10}
                  aria-label="增加人数"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                  <i className="fas fa-plus text-xs" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            {/* 旅行偏好 */}
            <div>
              <label className="text-gray-700 font-bold flex items-center text-sm mb-3">
                <i className="far fa-id-card text-primary-500 mr-2" aria-hidden="true"></i> 旅行偏好
                <span className="font-normal text-gray-400 ml-1">(可选多选)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PREFERENCE_OPTIONS.map(({ label, icon }) => (
                  <PreferenceBtn
                    key={label}
                    icon={icon}
                    label={label}
                    active={preferences.includes(label)}
                    onClick={() => togglePreference(label)}
                  />
                ))}
              </div>
            </div>

            {/* 节奏偏好 */}
            <div>
              <div className="flex items-center mb-3">
                <label className="text-gray-700 font-bold flex items-center text-sm" id="pace-label">
                  <i className="fas fa-walking text-primary-500 mr-2" aria-hidden="true"></i> 节奏偏好
                </label>
                <span className="text-xs text-gray-400 ml-3 font-normal">
                  想要多紧凑的行程安排？
                </span>
              </div>
              <div className="flex items-center space-x-4 px-2">
                <div className="text-gray-600 flex flex-col items-center shrink-0" aria-hidden="true">
                  <i className="fas fa-umbrella-beach text-sm mb-1"></i>
                  <span className="text-[10px]">轻松悠闲</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pace}
                  onChange={e => setPace(Number(e.target.value))}
                  aria-labelledby="pace-label"
                  aria-valuetext={pace < 34 ? '轻松悠闲' : pace < 67 ? '适中' : '紧凑充实'}
                  className="flex-1 accent-primary-500 cursor-pointer"
                />
                <div className="text-gray-600 flex flex-col items-center shrink-0" aria-hidden="true">
                  <i className="fas fa-running text-sm mb-1"></i>
                  <span className="text-[10px]">紧凑充实</span>
                </div>
              </div>
            </div>

            {/* 预算范围 */}
            <div>
              <div className="flex items-center mb-3">
                <label className="text-gray-700 font-bold flex items-center text-sm" id="budget-label">
                  <i className="far fa-money-bill-alt text-primary-500 mr-2" aria-hidden="true"></i> 预算范围
                  <span className="font-normal text-gray-400 ml-1">(人均)</span>
                </label>
                <span className="text-xs text-gray-400 ml-3 font-normal">不含往返大交通</span>
              </div>
              <div className="px-2">
                <BudgetSlider min={1000} max={12000} value={budget} onChange={setBudget} labelId="budget-label" />
              </div>
            </div>

            {/* 更多偏好（v0.8.9：必去地点/出行方式/时间窗，默认折叠） */}
            <MorePreferences
              city={cities[0] ?? ''}
              mustInclude={mustInclude}
              onMustIncludeChange={setMustInclude}
              commuteMode={commuteMode}
              onCommuteModeChange={setCommuteMode}
              dailyStart={dailyStart}
              dailyEnd={dailyEnd}
              onDailyStartChange={setDailyStart}
              onDailyEndChange={setDailyEnd}
            />

            {/* 特殊需求 */}
            <div>
              <div className="flex items-center mb-3 flex-wrap">
                <label className="text-gray-700 font-bold flex items-center text-sm" htmlFor="trip-notes">
                  <i className="far fa-comment-dots text-primary-500 mr-2" aria-hidden="true"></i> 特殊需求
                  <span className="font-normal text-gray-400 ml-1">(选填)</span>
                </label>
                <span className="text-xs text-gray-400 ml-3 font-normal">
                  例如：无障碍设施、素食、宠物友好等
                </span>
              </div>
              <textarea
                id="trip-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[60px] resize-none"
                placeholder="如：无障碍、素食、带娃别太赶"
              ></textarea>
            </div>

            {/* 生成按钮 */}
            <div aria-live="polite">
              {submitError && (
                <p className="text-sm text-red-500 text-center">{submitError}</p>
              )}
            </div>
            
            <style>{`
              @keyframes shimmer-sweep {
                0% { transform: translateX(-150%) skewX(-15deg); }
                100% { transform: translateX(250%) skewX(-15deg); }
              }
              .animate-shimmer-sweep {
                animation: shimmer-sweep 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
              }
            `}</style>
            
            <button
              type="submit"
              disabled={submitting}
              className="relative overflow-hidden group w-full bg-accent-500 hover:bg-accent-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-accent-200 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
            >
              {!submitting && (
                <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-sweep" />
              )}
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                  <span>正在提交...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-magic" aria-hidden="true"></i>
                  <span>帮我排行程</span>
                </>
              )}
            </button>

            <div className="text-center text-xs text-gray-600 flex items-center justify-center space-x-1 pt-2">
              <i className="fas fa-shield-alt" aria-hidden="true"></i>
              <span>信息仅用于行程规划</span>
            </div>
          </form>
        </div>
      </main>

      {/* 右下角拍立得装饰 */}
      <div className="fixed bottom-12 right-12 z-20 pointer-events-none hidden xl:block" aria-hidden="true">
        <div className="relative transform rotate-6">
          <div className="bg-white p-3 pb-12 polaroid-shadow rounded-sm w-48">
            <div
              className="aspect-square bg-cover bg-center transition-[background-image] duration-700"
              style={{ backgroundImage: `url('${polaroidImage}')` }}
            ></div>
            <div className="mt-4 signature-font text-2xl text-gray-400 text-center opacity-60">
              {polaroidCity ?? 'YunTu'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
