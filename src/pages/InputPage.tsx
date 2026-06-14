import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiCitySelect } from '../components/input/MultiCitySelect';
import { DateRangeInput } from '../components/input/DateRangeInput';
import { BudgetSlider } from '../components/input/BudgetSlider';
import { RotatingBackground, useRotatingBackground, cityNameOfImage } from '../components/input/RotatingBackground';
import { submitTrip, ApiRequestError } from '../services/api';
import { useTripStore } from '../stores/tripStore';

const FEATURES = [
  {
    icon: 'fas fa-robot',
    color: 'bg-primary-500',
    title: 'AI 智能推荐',
    desc: '基于大模型与偏好分析，生成个性化行程',
  },
  {
    icon: 'fas fa-map-marked-alt',
    color: 'bg-primary-400',
    title: '行程高效合理',
    desc: '景点路线优化，节省时间不走回头路',
  },
  {
    icon: 'fas fa-heart',
    color: 'bg-accent-400',
    title: '体验地道精彩',
    desc: '发现小众玩法，深入当地文化体验',
  },
  {
    icon: 'fas fa-shield-alt',
    color: 'bg-primary-600',
    title: '实时动态调整',
    desc: '天气、交通变化实时感知，行程灵活调整',
  },
];

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

function FeatureItem({ icon, color, title, desc }: (typeof FEATURES)[number]) {
  return (
    <div className="flex items-start space-x-4">
      <div className={`${color} w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0`}>
        <i className={icon} aria-hidden="true"></i>
      </div>
      <div>
        <h3 className="font-bold text-gray-800">{title}</h3>
        <p className="text-gray-500 text-sm">{desc}</p>
      </div>
    </div>
  );
}

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
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
          active
            ? 'bg-primary-50 border-primary-400 text-primary-600'
            : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'
        }`}
      >
        <i className={`${icon} ${active ? 'text-primary-500' : 'text-gray-400'}`} aria-hidden="true"></i>
        <span>{label}</span>
      </button>
      {active && (
        <div className="absolute -top-1 -right-1 bg-primary-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] border-2 border-white pointer-events-none">
          <i className="fas fa-check" aria-hidden="true"></i>
        </div>
      )}
    </div>
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
  const [cities, setCities] = useState<string[]>(['重庆']);
  const [multiCity, setMultiCity] = useState(false);
  const [startDate, setStartDate] = useState(() => isoDateAfter(7));
  const [endDate, setEndDate] = useState(() => isoDateAfter(13));
  const [preferences, setPreferences] = useState<string[]>(['自然风光']);
  const [pace, setPace] = useState(60);
  const [budget, setBudget] = useState<[number, number]>([1000, 5000]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | undefined>(undefined);

  const togglePreference = (pref: string) => {
    setPreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

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
    const days = Math.min(7, Math.round(dayMs / 86400000) + 1);

    setSubmitting(true);
    setSubmitError(null);
    const formData = {
      to_city: cities[0],
      days,
      people_count: 1,
      preferences,
      avoid: [],
      notes: [
        multiCity && cities.length > 1 ? `多城市：${cities.join('、')}` : '',
        notes,
        `节奏:${pace}`,
        `预算:人均¥${budget[0]}-¥${budget[1]}`,
      ]
        .filter(Boolean)
        .join('；'),
    };
    setFormData(formData);
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
      <main className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-8 px-4 pb-16 pt-8 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-12 lg:pb-24 lg:pt-16">
        {/* 左侧：品牌与特性（窄屏简化：保留标题，隐藏特性列表与签名） */}
        <div className="lg:pt-12 animate-slide-up">
          <div className="mb-6 lg:mb-12">
            <h1 className="mb-3 text-3xl font-bold leading-tight text-gray-800 sm:text-4xl lg:mb-4 xl:text-5xl">
              <span className="relative inline-block">
                AI 智能规划
                <span className="absolute -top-4 -right-6 text-2xl text-accent-400" aria-hidden="true">✦</span>
              </span>
              <br />
              <span className="text-primary-500">更懂你的每一次旅行</span>
            </h1>
            <p className="text-base text-gray-600 sm:text-xl">云途 YunTu · 让旅行更简单，更美好</p>
          </div>

          <div className="hidden space-y-8 lg:block">
            {FEATURES.map(f => (
              <FeatureItem key={f.title} {...f} />
            ))}
          </div>

          <div className="relative mt-20 hidden lg:inline-block">
            <p className="signature-font text-4xl text-primary-500 opacity-80 transform -rotate-6">
              探索世界，遇见更好的自己
            </p>
            <span className="absolute -top-4 -right-12 text-primary-200 text-2xl" aria-hidden="true">✦</span>
          </div>
        </div>

        {/* 右侧：表单卡片 */}
        <div className="glass-card relative overflow-hidden rounded-3xl p-5 animate-slide-up-delay-1 sm:p-8">
          <div className="mb-6 flex items-start justify-between sm:mb-8">
            <div>
              <h2 className="flex items-center text-xl font-bold text-gray-800 sm:text-2xl">
                <span className="text-accent-400 mr-2" aria-hidden="true">✦</span>
                生成你的专属行程
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                告诉我们你的喜好，AI 为你量身打造完美旅程
              </p>
            </div>
            <button
              type="button"
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <i className="far fa-lightbulb" aria-hidden="true"></i>
              <span>行程灵感</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* 目的地 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-gray-700 font-bold flex items-center text-sm">
                  <i className="fas fa-map-marker-alt text-primary-500 mr-2" aria-hidden="true"></i> 目的地
                </label>
                <label className="flex items-center text-xs text-gray-500 cursor-pointer">
                  <span>多地旅行</span>
                  <input
                    type="checkbox"
                    checked={multiCity}
                    onChange={e => {
                      const on = e.target.checked;
                      setMultiCity(on);
                      if (!on && cities.length > 1) setCities([cities[0]]);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 peer-checked:bg-primary-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 rounded-full ml-2 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4"></div>
                </label>
              </div>
              <MultiCitySelect value={cities} onChange={setCities} multiCity={multiCity} error={cityError} />
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
                <div className="text-gray-500 flex flex-col items-center shrink-0" aria-hidden="true">
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
                  className="custom-slider flex-1"
                  style={{
                    background: `linear-gradient(to right, #fb923c 0%, #fb923c ${pace}%, #f3f4f6 ${pace}%, #f3f4f6 100%)`,
                  }}
                />
                <div className="text-gray-500 flex flex-col items-center shrink-0" aria-hidden="true">
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
                <BudgetSlider min={1000} max={12000} onChange={setBudget} labelId="budget-label" />
              </div>
            </div>

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
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[60px] resize-none"
                placeholder="请输入你的特殊需求..."
              ></textarea>
            </div>

            {/* 生成按钮 */}
            {submitError && (
              <p className="text-sm text-red-500 text-center">{submitError}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-accent-500 hover:bg-accent-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-accent-200 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
            >
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                  <span>正在提交...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-magic" aria-hidden="true"></i>
                  <span>生成专属行程</span>
                </>
              )}
            </button>

            <div className="text-center text-xs text-gray-500 flex items-center justify-center space-x-1 pt-2">
              <i className="fas fa-shield-alt" aria-hidden="true"></i>
              <span>信息安全保障 · 仅用于行程规划</span>
            </div>
          </div>
        </div>
      </main>

      {/* 右下角拍立得装饰 */}
      <div className="fixed bottom-12 right-12 z-20 pointer-events-none hidden xl:block" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-400 rounded-full opacity-60 blur-sm -z-10"></div>

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

        {/* 纸飞机虚线轨迹 */}
        <div className="absolute -top-32 -left-20 pointer-events-none opacity-40">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 180C40 160 100 170 140 100C160 60 140 30 180 10"
              stroke="#0f766e"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <path d="M180 10L165 15M180 10L175 25" stroke="#0f766e" strokeWidth="1.5" />
            <circle cx="180" cy="10" r="2" fill="#0f766e" />
          </svg>
          <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2">
            <i className="fas fa-paper-plane text-accent-400 transform -rotate-12"></i>
          </div>
        </div>
      </div>

      {/* 漂浮光晕 */}
      <div className="fixed top-1/3 -right-20 w-64 h-64 bg-primary-300/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
      <div className="fixed top-20 left-20 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
    </div>
  );
}
