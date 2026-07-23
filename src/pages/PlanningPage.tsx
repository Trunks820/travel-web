/**
 * 等待页：左进度 + 右「城市明信片散开 → 合拢 → 登机牌扫光」
 * 图源：public/city/{城}/ 与首页轮播同源
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { ProgressTimeline } from '@/components/planning/ProgressTimeline';
import { BoardingPass } from '@/components/planning/BoardingPass';
import {
  RotatingBackground,
  useRotatingBackground,
  getCityPhotoUrls,
} from '@/components/input/RotatingBackground';
import { useTripStore } from '@/stores/tripStore';
import { pollJobStatus, submitTrip, fetchResult, ApiRequestError } from '@/services/api';
import { useJobProgress } from '@/hooks/useJobProgress';
import { webErrorMessage } from '@/constants/errors';
import type { StageCode, JobResponse } from '@/types/trip';

const STAGES: StageCode[] = ['ANALYZING', 'PLANNING', 'COMPOSING', 'FINALIZING'];

const FAN_OUT = [
  { x: -118, y: 28, rotate: -18, scale: 1 },
  { x: -42, y: -18, rotate: -6, scale: 1.02 },
  { x: 42, y: -14, rotate: 7, scale: 1.02 },
  { x: 118, y: 32, rotate: 16, scale: 1 },
];

const GATHER = [
  { x: -10, y: 4, rotate: -4, scale: 0.92 },
  { x: -3, y: -2, rotate: -1, scale: 0.94 },
  { x: 3, y: -2, rotate: 1, scale: 0.94 },
  { x: 10, y: 4, rotate: 4, scale: 0.92 },
];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stageIndexOf(code: StageCode | null): number {
  if (!code) return 0;
  const i = STAGES.indexOf(code);
  return i < 0 ? 0 : i;
}

type CardPhase = 'collect' | 'gather' | 'pass';

function PostcardStage({
  city,
  stageIndex,
  phase,
  failed,
}: {
  city: string;
  stageIndex: number;
  phase: CardPhase;
  failed: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const photos = useMemo(() => getCityPhotoUrls(city, 4), [city]);
  const lastPhase = useRef<string>('');

  useEffect(() => {
    if (!wrapRef.current) return;
    const cards = Array.from(wrapRef.current.querySelectorAll<HTMLElement>('.mag-card'));
    if (!cards.length) return;

    const reduce = prefersReducedMotion();
    gsap.killTweensOf(cards);
    const visible = Math.min(Math.max(stageIndex + 1, 1), cards.length);

    if (reduce) {
      cards.forEach((card, i) => {
        if (phase === 'pass' || i >= visible) {
          gsap.set(card, { opacity: 0, x: 0, y: 0, scale: 0.5 });
        } else if (phase === 'gather') {
          gsap.set(card, { opacity: 1, ...GATHER[i] });
        } else {
          gsap.set(card, { opacity: 1, ...FAN_OUT[i] });
        }
      });
      return;
    }

    if (phase === 'collect') {
      cards.forEach((card, i) => {
        if (i < visible) {
          const isNew = i === visible - 1;
          gsap.to(card, {
            opacity: 1,
            x: FAN_OUT[i].x,
            y: FAN_OUT[i].y,
            rotate: FAN_OUT[i].rotate,
            scale: FAN_OUT[i].scale,
            duration: isNew ? 0.85 : 0.55,
            delay: isNew ? 0.05 : 0,
            ease: isNew ? 'power3.out' : 'power2.out',
          });
        } else {
          gsap.set(card, {
            opacity: 0,
            x: 100 + i * 20,
            y: 160,
            rotate: 22,
            scale: 0.75,
          });
        }
      });
    }

    if (phase === 'gather') {
      cards.forEach((card, i) => {
        gsap.set(card, {
          opacity: 1,
          x: FAN_OUT[i].x,
          y: FAN_OUT[i].y,
          rotate: FAN_OUT[i].rotate,
          scale: FAN_OUT[i].scale,
        });
      });
      gsap
        .timeline()
        .to(cards, {
          x: (i) => GATHER[i as number].x,
          y: (i) => GATHER[i as number].y,
          rotate: (i) => GATHER[i as number].rotate,
          scale: (i) => GATHER[i as number].scale,
          duration: 0.7,
          stagger: 0.04,
          ease: 'power2.inOut',
        })
        .to(cards, {
          x: 0,
          y: 8,
          rotate: 0,
          scale: 0.72,
          duration: 0.45,
          stagger: 0.03,
          ease: 'power2.in',
        });
    }

    if (phase === 'pass' && lastPhase.current !== 'pass') {
      gsap.to(cards, {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 0.35,
        opacity: 0,
        duration: 0.45,
        stagger: 0.04,
        ease: 'power2.in',
      });
    }

    if (failed && phase !== 'pass') {
      gsap.to(cards, {
        x: '+=7',
        duration: 0.07,
        yoyo: true,
        repeat: 5,
        ease: 'power1.inOut',
      });
    }

    lastPhase.current = phase;
  }, [stageIndex, phase, failed, photos.length]);

  useEffect(() => {
    if (!wrapRef.current || prefersReducedMotion()) return;
    const cards = wrapRef.current.querySelectorAll<HTMLElement>('.mag-card');
    gsap.set(cards, { opacity: 0, x: 90, y: 170, rotate: 20, scale: 0.78 });
    if (cards[0]) {
      gsap.to(cards[0], {
        opacity: 1,
        x: FAN_OUT[0].x,
        y: FAN_OUT[0].y,
        rotate: FAN_OUT[0].rotate,
        scale: FAN_OUT[0].scale,
        duration: 0.95,
        delay: 0.35,
        ease: 'power3.out',
      });
    }
  }, [photos.join('|')]);

  const caption =
    phase === 'pass'
      ? '行程票已就绪'
      : phase === 'gather'
        ? '正在收成行程…'
        : failed
          ? '已中断'
          : `正在收集 ${city} 的风景…`;

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto flex h-[280px] w-full max-w-lg items-center justify-center sm:h-[320px] lg:h-[380px]"
    >
      {photos.map((src) => (
        <div
          key={src}
          className="mag-card absolute h-52 w-36 overflow-hidden rounded-xl border border-white/90 bg-white p-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.24)] sm:h-60 sm:w-44 lg:h-72 lg:w-52"
        >
          <img src={src} alt="" className="h-full w-full rounded-lg object-cover" />
          <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-md bg-black/40 px-2 py-1 text-center text-[10px] text-white/95 backdrop-blur-[2px]">
            {city}
          </div>
        </div>
      ))}
      <p className="absolute -bottom-1 text-[10px] tracking-[0.18em] text-gray-500 sm:bottom-0 sm:text-xs">
        {caption}
      </p>
    </div>
  );
}

export default function PlanningPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const setJob = useTripStore((s) => s.setJob);
  const setResult = useTripStore((s) => s.setResult);
  const clearResult = useTripStore((s) => s.clearResult);
  const formData = useTripStore((s) => s.formData);

  const destination = formData?.to_city ?? '目的地';

  const stageQuotes: Record<StageCode, string[]> = useMemo(
    () => ({
      ANALYZING: [
        `正在读懂你的偏好与节奏…`,
        `正在对齐 ${destination} 的行程边界…`,
        `正在为你翻阅 ${destination} 的当地指南…`,
      ],
      PLANNING: [
        `正在筛选 ${destination} 高口碑地点…`,
        `正在计算景点之间的通勤成本…`,
        `正在收集 ${destination} 的风景与路线…`,
      ],
      COMPOSING: [
        `正在把风景收进日程…`,
        `正在把必去点嵌进可走的路线…`,
        `正在编排每日路线与用餐节奏…`,
      ],
      FINALIZING: [
        `正在校验合理性与节奏…`,
        `快好了，正在整理成可跟着走的路书…`,
        `正在做最后的检查…`,
      ],
    }),
    [destination],
  );

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [stageCode, setStageCode] = useState<StageCode | null>(null);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [networkUnstable, setNetworkUnstable] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [cardPhase, setCardPhase] = useState<CardPhase>('collect');
  const [showPass, setShowPass] = useState(false);

  const stageIndex = stageIndexOf(stageCode);

  const { current: bgImage, incoming: bgIncoming } = useRotatingBackground(
    destination ? [destination] : [],
    'static',
  );

  const titleRef = useRef<HTMLHeadingElement>(null);
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const timelineWrapRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const passWrapRef = useRef<HTMLDivElement>(null);
  const passShineRef = useRef<HTMLDivElement>(null);
  const albumWrapRef = useRef<HTMLDivElement>(null);
  const signRef = useRef<HTMLParagraphElement>(null);
  const footerHintRef = useRef<HTMLParagraphElement>(null);

  const introTl = useRef<gsap.core.Timeline | null>(null);
  const quoteTween = useRef<gsap.core.Timeline | null>(null);
  const stageTween = useRef<gsap.core.Timeline | null>(null);
  const morphTl = useRef<gsap.core.Timeline | null>(null);
  const shineTween = useRef<gsap.core.Timeline | null>(null);
  const morphingRef = useRef(false);

  const quotes = stageCode ? stageQuotes[stageCode] : stageQuotes.ANALYZING;

  const title = failed
    ? '这次规划没能完成'
    : timedOut
      ? '生成时间比预期长'
      : `正在规划你的 ${destination} 之旅`;

  const quoteText = failed
    ? '可以调整需求后重新规划'
    : timedOut
      ? '请稍后刷新查看，或重新规划'
      : quotes[quoteIndex % quotes.length];

  const playPassGloss = useCallback(() => {
    if (prefersReducedMotion() || !passWrapRef.current) return;
    shineTween.current?.kill();
    const soft = passShineRef.current;
    const blade = passWrapRef.current.querySelector<HTMLElement>('.pass-gloss-blade');
    const tl = gsap.timeline();
    if (soft) {
      gsap.set(soft, { opacity: 1, xPercent: -130, yPercent: -15 });
      tl.to(soft, { xPercent: 130, yPercent: 15, duration: 0.58, ease: 'power2.inOut' }, 0);
      tl.set(soft, { opacity: 0, xPercent: -130 }, '>');
    }
    if (blade) {
      gsap.set(blade, { opacity: 0.95, left: '-35%', top: '-20%' });
      tl.to(blade, { left: '110%', top: '10%', duration: 0.48, ease: 'power3.inOut' }, 0.06);
      tl.set(blade, { opacity: 0, left: '-35%' }, '>');
    }
    shineTween.current = tl;
  }, []);

  const runMorphToPass = useCallback(
    (reduce: boolean) => {
      if (morphingRef.current || (showPass && cardPhase === 'pass')) return;
      morphingRef.current = true;
      setCardPhase('pass');

      if (reduce) {
        setShowPass(true);
        morphingRef.current = false;
        return;
      }

      morphTl.current?.kill();
      morphTl.current = gsap.timeline({
        onComplete: () => {
          morphingRef.current = false;
        },
      });

      if (albumWrapRef.current) {
        morphTl.current.to(albumWrapRef.current, {
          scale: 0.88,
          opacity: 0.85,
          duration: 0.25,
          ease: 'power1.in',
        });
        morphTl.current.to(albumWrapRef.current, {
          scale: 0.4,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        });
      }
      morphTl.current.add(() => {
        setShowPass(true);
        requestAnimationFrame(() => {
          if (!passWrapRef.current) return;
          gsap.fromTo(
            passWrapRef.current,
            { opacity: 0, y: 40, rotate: 12, scale: 0.82 },
            {
              opacity: 1,
              y: 0,
              rotate: 0,
              scale: 1,
              duration: 0.7,
              ease: 'power3.out',
              onComplete: () => playPassGloss(),
            },
          );
        });
      }, '-=0.15');
    },
    [showPass, cardPhase, playPassGloss],
  );

  const playIntro = useCallback(() => {
    const reduce = prefersReducedMotion();
    introTl.current?.kill();
    const leftEls = [
      titleRef.current,
      quoteRef.current,
      timelineWrapRef.current,
      footerHintRef.current,
    ].filter(Boolean) as HTMLElement[];

    if (reduce) {
      gsap.set([...leftEls, rightRef.current, signRef.current], {
        clearProps: 'all',
        opacity: 1,
        y: 0,
        scale: 1,
      });
      return;
    }

    gsap.set(leftEls, { opacity: 0, y: 20 });
    gsap.set(rightRef.current, { opacity: 0, y: 24, scale: 0.97 });
    gsap.set(signRef.current, { opacity: 0, y: 12 });

    introTl.current = gsap.timeline({ defaults: { ease: 'power2.out' } });
    introTl.current
      .to(titleRef.current, { opacity: 1, y: 0, duration: 0.5 })
      .to(quoteRef.current, { opacity: 1, y: 0, duration: 0.4 }, '-=0.22')
      .to(timelineWrapRef.current, { opacity: 1, y: 0, duration: 0.45 }, '-=0.18')
      .to(rightRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.6 }, '-=0.35')
      .to(signRef.current, { opacity: 1, y: 0, duration: 0.4 }, '-=0.2')
      .to(footerHintRef.current, { opacity: 1, y: 0, duration: 0.3 }, '-=0.15');
  }, []);

  useEffect(() => {
    playIntro();
    return () => {
      introTl.current?.kill();
      quoteTween.current?.kill();
      stageTween.current?.kill();
      morphTl.current?.kill();
      shineTween.current?.kill();
    };
  }, [playIntro]);

  // 真实 stage → 明信片相位（成票只在 COMPLETED 时触发，见 onData）
  useEffect(() => {
    if (failed || timedOut) return;
    const idx = stageIndexOf(stageCode);

    // 规划过程中始终用明信片叙事，不提前变登机牌
    if (idx < 2) {
      if (cardPhase !== 'collect') {
        setCardPhase('collect');
        setShowPass(false);
        morphingRef.current = false;
        if (albumWrapRef.current) {
          gsap.set(albumWrapRef.current, { clearProps: 'all', opacity: 1, scale: 1 });
        }
      }
    } else {
      // COMPOSING / FINALIZING：继续叠明信片，最多 4 张，合拢留到真正完成
      if (cardPhase === 'pass' || showPass) {
        // 若之前异常成票，拉回收集态（不应发生）
        setShowPass(false);
        setCardPhase(idx >= 2 ? 'collect' : 'collect');
        morphingRef.current = false;
      } else if (cardPhase !== 'collect') {
        setCardPhase('collect');
      }
    }

    if (prefersReducedMotion() || !timelineWrapRef.current) return;
    stageTween.current?.kill();
    stageTween.current = gsap.timeline();
    const dots = timelineWrapRef.current.querySelectorAll('li > span.absolute');
    const active = timelineWrapRef.current.querySelector(
      'li h3.text-primary-600, li h3.text-accent-600, li .text-primary-600, li .text-accent-600',
    );
    if (dots.length) {
      stageTween.current.fromTo(
        dots,
        { scale: 0.88 },
        { scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.7)' },
      );
    }
    if (active) {
      stageTween.current.fromTo(
        active,
        { x: -6, opacity: 0.65 },
        { x: 0, opacity: 1, duration: 0.32 },
        '-=0.25',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCode, failed, timedOut]);

  // 文案轮播
  useEffect(() => {
    if (failed || timedOut) return;
    const id = window.setInterval(() => {
      setQuoteIndex((i) => (i + 1) % Math.max(1, quotes.length));
    }, 5500);
    return () => clearInterval(id);
  }, [quotes.length, failed, timedOut, stageCode]);

  useEffect(() => {
    if (!quoteRef.current || prefersReducedMotion()) return;
    quoteTween.current?.kill();
    quoteTween.current = gsap.timeline();
    quoteTween.current.fromTo(
      quoteRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    );
  }, [quoteIndex, title, failed, timedOut, stageCode]);

  useEffect(() => {
    if (!failed || !timelineWrapRef.current || prefersReducedMotion()) return;
    gsap.fromTo(
      timelineWrapRef.current,
      { x: 0 },
      { duration: 0.45, keyframes: { x: [-6, 6, -4, 4, 0] }, ease: 'power1.inOut' },
    );
  }, [failed]);

  const onData = useCallback(
    (data: JobResponse): boolean => {
      if (data.stage_progress) {
        setStageCode(data.stage_progress.code);
        setJob(jobId!, data.status, data.stage_progress);
      }

      if (data.status === 'COMPLETED' && data.result_record_id) {
        const recordId = data.result_record_id;
        const reduce = prefersReducedMotion();
        // 登机牌动画期间并行预取结果，跳转时大概率已缓存
        const prefetch = fetchResult(recordId, jobId!)
          .then((res) => { setResult(recordId, jobId!, res); return res; })
          .catch(() => null);
        const go = async () => {
          const res = await prefetch;
          const target =
            res && res.plans.length === 1
              ? `/plan/${recordId}/${res.plans[0].plan_id}?job_id=${jobId}`
              : `/result/${recordId}?job_id=${jobId}`;
          navigate(target, { replace: true });
        };

        // 完成瞬间：合拢 → 成票扫光（约 1s）→ 跳详情
        if (!showPass && !morphingRef.current) {
          setCardPhase('gather');
          window.setTimeout(() => {
            runMorphToPass(reduce);
            window.setTimeout(go, reduce ? 200 : 1000);
          }, reduce ? 0 : 350);
        } else if (showPass) {
          playPassGloss();
          window.setTimeout(go, reduce ? 100 : 700);
        } else {
          // 正在 morph 中：等扫光结束再跳
          window.setTimeout(go, reduce ? 200 : 1100);
        }
        return true;
      }

      if (data.status === 'FAILED') {
        setFailed(true);
        setErrorMessage(webErrorMessage(data.error?.code, data.error?.message));
        return true;
      }

      return false;
    },
    [jobId, navigate, setJob, setResult, showPass, runMorphToPass, playPassGloss],
  );

  const onTimeout = useCallback(() => setTimedOut(true), []);
  const onConsecutiveErrors = useCallback((count: number) => {
    setNetworkUnstable(count >= 3);
  }, []);

  const { stop } = useJobProgress({
    jobId,
    onData,
    onTimeout,
    onConsecutiveErrors,
    consecutiveErrorThreshold: 3,
    enabled: !!jobId && !failed && !timedOut,
  });

  useEffect(() => () => stop(), [stop]);

  function handleRetry() {
    setFailed(false);
    setTimedOut(false);
    setErrorMessage(null);
    navigate('/');
  }

  async function handleRefresh() {
    if (!jobId) return;
    try {
      const data = await pollJobStatus(jobId);
      if (data.status === 'COMPLETED' && data.result_record_id) {
        navigate(`/result/${data.result_record_id}?job_id=${jobId}`, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : '查询失败';
      setErrorMessage(msg);
    }
  }

  async function handleRetrySame() {
    if (!formData || retrying) return;
    setRetrying(true);
    setErrorMessage(null);
    clearResult();
    try {
      const res = await submitTrip(formData);
      setFailed(false);
      setTimedOut(false);
      setStageCode(null);
      setCardPhase('collect');
      setShowPass(false);
      morphingRef.current = false;
      if (albumWrapRef.current) {
        gsap.set(albumWrapRef.current, { clearProps: 'all', opacity: 1, scale: 1 });
      }
      navigate(`/planning/${res.job_id}`, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : '重试失败，请稍后再试';
      setErrorMessage(msg);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <RotatingBackground current={bgImage} incoming={bgIncoming} />
      <div className="pointer-events-none fixed inset-0 z-0 bg-white/55" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-2 lg:gap-12">
        {/* 左：进度 */}
        <div className="order-2 lg:order-1">
          <h1
            ref={titleRef}
            className="mb-2 text-2xl font-bold text-gray-800 sm:text-3xl xl:text-4xl"
          >
            {title}
          </h1>
          <p ref={quoteRef} className="mb-8 min-h-[1.25rem] text-sm text-gray-600">
            {quoteText}
          </p>

          <div ref={timelineWrapRef} aria-live="polite" aria-atomic="true">
            <ProgressTimeline currentCode={stageCode} failed={failed} />
          </div>

          {errorMessage && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {networkUnstable && !failed && !timedOut && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <i className="fas fa-wifi text-amber-400" aria-hidden="true" />
              网络不稳定，正在持续尝试连接...
            </p>
          )}

          {(failed || timedOut) && (
            <div className="mt-8 flex gap-3">
              {failed && (
                <button
                  type="button"
                  onClick={handleRetrySame}
                  disabled={retrying || !formData}
                  className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
                >
                  {retrying ? '正在重试...' : '再试一次'}
                </button>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className={
                  failed
                    ? 'rounded-xl border border-primary-200 bg-white px-6 py-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50'
                    : 'rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2'
                }
              >
                重新规划
              </button>
              {timedOut && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded-xl border border-primary-200 bg-white px-6 py-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                >
                  刷新查看
                </button>
              )}
            </div>
          )}

          {!failed && !timedOut && (
            <p
              ref={footerHintRef}
              className="mt-10 flex items-center gap-1.5 text-xs text-gray-500"
            >
              <i className="fas fa-shield-alt" aria-hidden="true" />
              请勿关闭页面 · 完成后自动跳转
            </p>
          )}
        </div>

        {/* 右：明信片 → 登机牌 */}
        <div
          ref={rightRef}
          className="order-1 flex flex-col items-center justify-center lg:order-2"
        >
          <div className="relative w-full min-h-[300px] sm:min-h-[340px] lg:min-h-[400px]">
            <div
              ref={albumWrapRef}
              className={
                showPass ? 'pointer-events-none absolute inset-0 flex items-center' : ''
              }
              style={{ visibility: showPass ? 'hidden' : 'visible' }}
            >
              <PostcardStage
                city={destination}
                stageIndex={stageIndex}
                phase={cardPhase}
                failed={failed}
              />
            </div>
            <div
              ref={passWrapRef}
              className="flex w-full flex-col items-center justify-center"
              style={{
                opacity: showPass ? 1 : 0,
                pointerEvents: showPass ? 'auto' : 'none',
                position: showPass ? 'relative' : 'absolute',
                inset: showPass ? undefined : 0,
              }}
            >
              <div className="relative isolate w-[340px] max-w-full overflow-hidden rounded-2xl">
                <BoardingPass city={destination} formData={formData} />
                <div
                  ref={passShineRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 opacity-0"
                  style={{
                    background:
                      'linear-gradient(115deg, transparent 0%, transparent 38%, rgba(255,255,255,0.08) 42%, rgba(255,248,230,0.55) 48%, rgba(255,255,255,0.35) 52%, rgba(255,255,255,0.06) 58%, transparent 62%, transparent 100%)',
                    mixBlendMode: 'soft-light',
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl"
                >
                  <div
                    className="pass-gloss-blade absolute -inset-y-8 w-[28%] -skew-x-12 opacity-0"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), rgba(255,236,179,0.35), transparent)',
                      filter: 'blur(0.5px)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <p
            ref={signRef}
            className="signature-font mt-6 -rotate-3 text-2xl text-primary-500 opacity-80 sm:mt-8"
          >
            {failed ? '下次一定顺利' : '好行程值得稍等片刻'}
          </p>
        </div>
      </div>
    </div>
  );
}
