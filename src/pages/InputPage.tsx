/**
 * 云途首页：桌面左图右表（hybrid 表面）+ 手机上图下表 + sticky CTA
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiCitySelect } from '../components/input/MultiCitySelect';
import { DateRangeInput } from '../components/input/DateRangeInput';
import { BudgetSlider } from '../components/input/BudgetSlider';
import { MorePreferences } from '../components/input/MorePreferences';
import { useRotatingBackground, cityNameOfImage } from '../components/input/RotatingBackground';
import { submitTrip, ApiRequestError } from '../services/api';
import { useTripStore } from '../stores/tripStore';
import type { RequestedCommuteMode, MustIncludeItem } from '../types/form';

const PACE_TAGS = ['轻松', '适中', '紧凑'];

const PREFERENCE_OPTIONS = [
  '自然风光',
  '文化历史',
  '美食',
  '亲子',
  '购物',
  'citywalk',
  '拍照',
  '夜景',
];

/** 细密低对比噪点，叠在米色上像特种纸 */
const PAPER_NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

function PreferenceBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
        active
          ? 'border-primary-500 bg-primary-50 font-medium text-primary-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

function isoDateAfter(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

/** 从左图采样主色，供右栏左缘环境光 */
function useImageAmbientColor(imageUrl: string | undefined, alpha = 0.12): string {
  const [color, setColor] = useState(`rgba(15, 118, 110, ${alpha})`);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          const lum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
          if (lum < 28 || lum > 235) continue;
          r += pr;
          g += pg;
          b += pb;
          n += 1;
        }
        if (n === 0) return;
        r = Math.round(r / n);
        g = Math.round(g / n);
        b = Math.round(b / n);
        const max = Math.max(r, g, b);
        const boost = 1.06;
        if (max === r) r = Math.min(255, Math.round(r * boost));
        if (max === g) g = Math.min(255, Math.round(g * boost));
        if (max === b) b = Math.min(255, Math.round(b * boost));
        if (!cancelled) setColor(`rgba(${r}, ${g}, ${b}, ${alpha})`);
      } catch {
        /* keep previous */
      }
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, alpha]);

  return color;
}

/**
 * PC 右栏 hybrid 表面：路书纸 + 轻噪点 + 左缘环境光
 * 必须 fixed 钉在视口右半，不能 absolute 塞进右侧滚动容器——
 * 否则展开「更多偏好」后背景会跟着内容滚走，露出底部白断层。
 */
function HybridPanelSurface({ ambientColor }: { ambientColor: string }) {
  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-0 hidden h-screen w-5/12 overflow-hidden lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[#f5f2ec]" />
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-multiply"
        style={{
          backgroundImage: PAPER_NOISE_SVG,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(110%_70%_at_8%_0%,rgba(255,255,255,0.45)_0%,transparent_50%)]" />
      <div
        className="editorial-ambient absolute inset-0 transition-[background] duration-1000 ease-out"
        style={{
          background: `
            linear-gradient(90deg, ${ambientColor} 0%, transparent 18%),
            radial-gradient(55% 65% at 0% 40%, ${ambientColor} 0%, transparent 70%)
          `,
        }}
      />
      <div className="absolute inset-y-0 left-0 w-px bg-black/[0.055]" />
    </div>
  );
}

export default function InputPage() {
  const navigate = useNavigate();
  const setFormData = useTripStore((s) => s.setFormData);
  const clearResult = useTripStore((s) => s.clearResult);
  // 一次性读取上次提交的表单（sessionStorage），失败/返回后回填
  const stored = useMemo(() => useTripStore.getState().formData, []);
  const storedPrefs = stored?.preferences ?? null;

  const [cities, setCities] = useState<string[]>(
    stored?.to_city ? [stored.to_city] : ['杭州'],
  );
  const [startDate, setStartDate] = useState(() => stored?.start_date || isoDateAfter(1));
  const [endDate, setEndDate] = useState(() => stored?.end_date || isoDateAfter(3));
  const [preferences, setPreferences] = useState<string[]>(
    storedPrefs ? storedPrefs.filter((p) => !PACE_TAGS.includes(p)) : ['自然风光'],
  );
  const [people, setPeople] = useState(stored?.people_count ?? 2);
  const [pace, setPace] = useState(
    storedPrefs?.includes('轻松') ? 20 : storedPrefs?.includes('紧凑') ? 80 : 60,
  );
  const [budget, setBudget] = useState(stored?.budget ?? 5000);
  const [notes, setNotes] = useState(stored?.notes ?? '');

  const [mustInclude, setMustInclude] = useState<MustIncludeItem[]>(stored?.must_include ?? []);
  const storedCommute = stored?.commute_mode;
  const [commuteMode, setCommuteMode] = useState<RequestedCommuteMode>(
    storedCommute === 'driving' || storedCommute === 'transit' || storedCommute === 'cycling'
      ? storedCommute
      : 'driving',
  );
  const [dailyStart, setDailyStart] = useState(stored?.daily_start ?? '');
  const [dailyEnd, setDailyEnd] = useState(stored?.daily_end ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | undefined>(undefined);

  const { current: bgImage, incoming: bgIncoming } = useRotatingBackground(cities);
  const polaroidCity = cityNameOfImage(bgImage);
  const displayCity = polaroidCity || cities[0] || '目的地';
  const ambientColor = useImageAmbientColor(bgImage, 0.12);

  const handleCitiesChange = (next: string[]) => {
    if (next[0] !== cities[0]) setMustInclude([]);
    setCities(next);
  };

  const togglePreference = (pref: string) => {
    setPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
    // 亲子默认至少 2 人
    if (pref === '亲子' && !preferences.includes('亲子') && people < 2) {
      setPeople(2);
    }
  };

  const overLimit = useMemo(() => {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (isNaN(ms) || ms < 0) return false;
    return Math.round(ms / 86400000) + 1 > 7;
  }, [startDate, endDate]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (cities.length === 0) {
      setCityError('请至少选择一个目的地');
      setSubmitError(null);
      document.getElementById('field-destination')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setCityError(undefined);

    const dayMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (!startDate || !endDate || isNaN(dayMs) || dayMs < 0) {
      setSubmitError('请选择有效的旅行时间');
      document.getElementById('field-dates')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const days = Math.min(7, Math.round(dayMs / 86400000) + 1);

    setSubmitting(true);
    setSubmitError(null);
    const paceTag = pace < 34 ? '轻松' : pace > 67 ? '紧凑' : '适中';

    const formData = {
      to_city: cities[0],
      start_date: startDate,
      end_date: endDate,
      days,
      people_count: people,
      preferences: [...preferences, paceTag],
      avoid: [],
      notes: notes.trim(),
      budget,
      ...(mustInclude.length > 0 && { must_include: mustInclude }),
      ...(commuteMode !== 'driving' && { commute_mode: commuteMode }),
      ...(dailyStart && { daily_start: dailyStart }),
      ...(dailyEnd && { daily_end: dailyEnd }),
    };

    setFormData(formData);
    clearResult();
    try {
      const res = await submitTrip(formData);
      navigate(`/planning/${res.job_id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : '提交失败，请稍后重试');
      setSubmitting(false);
    }
  };

  const submitBtnClass =
    'flex w-full items-center justify-center rounded-2xl bg-accent-500 py-4 font-bold text-white shadow-lg shadow-accent-200 transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-sand-50 font-body text-gray-800 lg:flex-row">
      {/* 左栏 / 手机顶部图 */}
      <div className="relative h-[38vh] min-h-[220px] max-h-[320px] w-full shrink-0 overflow-hidden lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:max-h-none lg:min-h-0 lg:w-7/12">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center transition-transform duration-[20000ms] ease-linear motion-reduce:transition-none motion-reduce:scale-100"
          style={{ backgroundImage: `url('${bgImage}')` }}
          role="img"
          aria-label={`${displayCity}风景`}
        />
        {bgIncoming && (
          <div
            className="absolute inset-0 animate-bg-fade-in bg-cover bg-center motion-reduce:animate-none"
            style={{ backgroundImage: `url('${bgIncoming}')` }}
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
        <div
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent lg:hidden"
          aria-hidden="true"
        />

        <div className="absolute left-5 top-4 text-white lg:left-12 lg:top-12">
          <p className="font-display text-xl font-bold tracking-[0.16em] lg:text-3xl lg:tracking-[0.18em]">
            YUNTU
          </p>
          <p className="mt-1 text-xs text-white/85 lg:mt-2 lg:text-sm">在路上，才是正经事</p>
          <p className="mt-3 text-sm font-medium tracking-wide text-white/95 lg:hidden">{displayCity}</p>
        </div>

        <div className="absolute bottom-12 left-12 hidden items-center gap-4 text-white/85 lg:flex">
          <div className="h-px w-8 bg-white/60" aria-hidden="true" />
          <span className="text-sm tracking-widest">{displayCity}</span>
        </div>
      </div>

      {/* PC 右栏画册背景：fixed 钉在视口，不随表单滚动 */}
      <HybridPanelSurface ambientColor={ambientColor} />

      {/* 右栏 / 手机表单（仅内容滚动） */}
      {/* 手机底部 sticky CTA 较高，多留一点，避免展开「更多偏好」后最后几项被挡住 */}
      <div className="relative z-10 w-full bg-sand-50 px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 lg:ml-[58.333333%] lg:h-screen lg:w-5/12 lg:overflow-y-auto lg:overscroll-contain lg:bg-transparent lg:px-12 lg:pb-16 lg:pt-14">
        <div className="relative z-[1]">
          <div className="mb-6 lg:mb-10">
            <h1 className="font-display text-2xl font-bold leading-snug text-gray-800 sm:text-3xl lg:text-4xl">
              定制你的路书
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">告诉我们你的期待，剩下的交给我们</p>
          </div>

          <form
            className="mx-auto w-full max-w-md space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            noValidate
          >
            <div id="field-destination" className="scroll-mt-24 lg:scroll-mt-8">
              <label className="mb-3 block text-sm font-bold text-gray-700">目的地</label>
              <MultiCitySelect
                value={cities}
                onChange={handleCitiesChange}
                multiCity={false}
                error={cityError}
              />
            </div>

            <div id="field-dates" className="scroll-mt-24 lg:scroll-mt-8">
              <label className="mb-3 block text-sm font-bold text-gray-700">旅行时间</label>
              <DateRangeInput
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
              />
              <div aria-live="polite">
                {overLimit && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <i className="fas fa-circle-info" aria-hidden="true" />
                    当前仅支持最多 7 天行程，将按 7 天为你规划
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700" id="people-label">
                出行人数
              </label>
              <div className="flex items-center gap-4" role="group" aria-labelledby="people-label">
                <button
                  type="button"
                  onClick={() => setPeople((p) => Math.max(1, p - 1))}
                  disabled={people <= 1}
                  aria-label="减少人数"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                  <i className="fas fa-minus text-xs" aria-hidden="true" />
                </button>
                <span className="min-w-[3rem] text-center text-lg font-bold text-gray-800" aria-live="polite">
                  {people} <span className="text-sm font-normal text-gray-400">人</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPeople((p) => Math.min(10, p + 1))}
                  disabled={people >= 10}
                  aria-label="增加人数"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                  <i className="fas fa-plus text-xs" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">
                旅行偏好
                <span className="ml-1 font-normal text-gray-400">(可多选)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PREFERENCE_OPTIONS.map((label) => (
                  <PreferenceBtn
                    key={label}
                    label={label}
                    active={preferences.includes(label)}
                    onClick={() => togglePreference(label)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center">
                <label className="text-sm font-bold text-gray-700" id="pace-label">
                  节奏偏好
                </label>
                <span className="ml-3 text-xs font-normal text-gray-400">想要多紧凑的行程安排？</span>
              </div>
              <div className="flex items-center gap-3 px-1">
                <span className="shrink-0 text-[11px] text-gray-500">轻松</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pace}
                  onChange={(e) => setPace(Number(e.target.value))}
                  aria-labelledby="pace-label"
                  aria-valuetext={pace < 34 ? '轻松悠闲' : pace < 67 ? '适中' : '紧凑充实'}
                  className="custom-slider flex-1 cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--color-accent-400) 0%, var(--color-accent-400) ${pace}%, var(--color-sand-100) ${pace}%, var(--color-sand-100) 100%)`,
                  }}
                />
                <span className="shrink-0 text-[11px] text-gray-500">紧凑</span>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center">
                <label className="text-sm font-bold text-gray-700" id="budget-label">
                  预算范围
                </label>
                <span className="ml-3 text-xs font-normal text-gray-400">不含往返大交通</span>
              </div>
              <div className="px-2">
                <BudgetSlider
                  min={1000}
                  max={12000}
                  value={budget}
                  onChange={setBudget}
                  labelId="budget-label"
                />
              </div>
            </div>

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

            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700" htmlFor="trip-notes">
                特殊需求
                <span className="ml-1 font-normal text-gray-400">(选填)</span>
              </label>
              <textarea
                id="trip-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px] w-full resize-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="选填，补充你的出行说明"
                rows={2}
              />
            </div>

            <div className="hidden pt-2 lg:block">
              <div aria-live="polite">
                {submitError && (
                  <p className="mb-3 text-center text-sm text-red-500" role="alert">
                    {submitError}
                  </p>
                )}
              </div>
              <button type="submit" disabled={submitting} aria-busy={submitting} className={submitBtnClass}>
                {submitting ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    正在提交...
                  </>
                ) : (
                  '帮我排行程'
                )}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-gray-600">
                <i className="fas fa-shield-alt" aria-hidden="true" />
                信息仅用于行程规划
              </p>
            </div>

            <p className="flex items-center justify-center gap-1 text-center text-xs text-gray-500 lg:hidden">
              <i className="fas fa-shield-alt" aria-hidden="true" />
              信息仅用于行程规划
            </p>
          </form>
        </div>
      </div>

      {/* 手机 sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,118,110,0.08)] backdrop-blur-md lg:hidden">
        <div aria-live="polite">
          {submitError && (
            <p className="mb-2 text-center text-sm text-red-500" role="alert">
              {submitError}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={submitting}
          aria-busy={submitting}
          onClick={handleSubmit}
          className={submitBtnClass}
        >
          {submitting ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              正在提交...
            </>
          ) : (
            '帮我排行程'
          )}
        </button>
      </div>
    </div>
  );
}
