import { useEffect, useMemo, useRef, useState } from 'react';

const FALLBACK_IMAGE = '/hero-bg.jpg';
const ROTATE_INTERVAL_MS = 15000;
const FADE_MS = 1500;

const CITY_IMAGES: Record<string, string[]> = {
  beijing: [
    'hanson-lu-_8EFj6ISA08-unsplash.jpg',
    'victor-he-0xn9T2cEigE-unsplash.jpg',
    'zhang-kaiyv-alGTmO0KvJI-unsplash.jpg',
    'zhang-kaiyv-yT_9tsThivo-unsplash.jpg',
    'zhang-kaiyv-z4whdrqkO40-unsplash.jpg',
  ],
  chengdu: [
    'bamboo-joe-EoVw0eEM4lQ-unsplash.jpg',
    'kev1n-z-794u6VhyNws-unsplash.jpg',
    'lingbo-huang-6xqN2TCCmvA-unsplash.jpg',
    'theodor-lundqvist-6Ox3fPG-qvo-unsplash.jpg',
    'will-cook-A3hWcvH1mpc-unsplash.jpg',
  ],
  hangzhou: [
    'luobing-egNgMn5CS18-unsplash.jpg',
    'ming-han-low-5UjoDKlGETs-unsplash.jpg',
    'ming-han-low-DPbmezddUp0-unsplash.jpg',
    'zhao-yangjun-FCi_wNGm9_Y-unsplash.jpg',
    'zhu-edward-peq-khnWDbg-unsplash.jpg',
  ],
  shanghai: [
    'freeman-zhou-oV9hp8wXkPE-unsplash.jpg',
    'hanny-naibaho-D7InODIWyK4-unsplash.jpg',
    'nuno-alberto-MykFFC5zolE-unsplash.jpg',
    'yifan-cong-GszVE92a5Rs-unsplash.jpg',
    'zhou-xian-7tFFO6Mq5L4-unsplash.jpg',
  ],
};

const CITY_NAME_TO_FOLDER: Record<string, string> = {
  北京: 'beijing',
  成都: 'chengdu',
  杭州: 'hangzhou',
  上海: 'shanghai',
};

const FOLDER_TO_CITY_NAME: Record<string, string> = {
  beijing: '北京',
  chengdu: '成都',
  hangzhou: '杭州',
  shanghai: '上海',
};

const ALL_IMAGES = Object.entries(CITY_IMAGES).flatMap(([folder, files]) =>
  files.map((f) => `/city/${folder}/${f}`)
);

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function resolveCityPool(cities: string[]): string[] {
  return cities.flatMap((city) => {
    const entry = Object.entries(CITY_NAME_TO_FOLDER).find(
      ([name, folder]) =>
        city.includes(name) || city.toLowerCase().includes(folder)
    );
    if (!entry) return [];
    const folder = entry[1];
    return CITY_IMAGES[folder].map((f) => `/city/${folder}/${f}`);
  });
}

export function cityNameOfImage(url: string): string | null {
  const match = url.match(/^\/city\/([^/]+)\//);
  return match ? (FOLDER_TO_CITY_NAME[match[1]] ?? null) : null;
}

/** 取某城市的图片列表（用于给方案卡配图）；无匹配返回 fallback 单图 */
export function cityImageList(city: string): string[] {
  const entry = Object.entries(CITY_NAME_TO_FOLDER).find(
    ([name, folder]) => city.includes(name) || city.toLowerCase().includes(folder),
  );
  if (!entry) return [FALLBACK_IMAGE];
  const folder = entry[1];
  return CITY_IMAGES[folder].map((f) => `/city/${folder}/${f}`);
}

export function useRotatingBackground(cities: string[], fallbackMode: 'shuffle' | 'static' = 'shuffle') {
  const pool = useMemo(() => {
    const cityPool = resolveCityPool(cities);
    if (cityPool.length > 0) return cityPool;
    if (fallbackMode === 'static') return [FALLBACK_IMAGE];
    return shuffle([FALLBACK_IMAGE, ...ALL_IMAGES]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities.join('|'), fallbackMode]);

  const [current, setCurrent] = useState(FALLBACK_IMAGE);
  const [incoming, setIncoming] = useState<string | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // 减少动态模式下不轮换，仅在城市图池变化时换一次
      if (!pool.includes(currentRef.current)) {
        const url = pool[0];
        const img = new Image();
        img.onload = () => setCurrent(url);
        img.src = url;
      }
      return;
    }

    let cancelled = false;
    let idx = 0;

    const advance = () => {
      let url = pool[idx % pool.length];
      idx++;
      if (url === currentRef.current && pool.length > 1) {
        url = pool[idx % pool.length];
        idx++;
      }
      if (url === currentRef.current) return;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setIncoming(url);
      };
      img.src = url;
    };

    // 城市切换后当前图不在池中时，立即换一张
    if (!pool.includes(currentRef.current)) advance();

    const timer = setInterval(advance, ROTATE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pool]);

  useEffect(() => {
    if (!incoming) return;
    const t = setTimeout(() => {
      setCurrent(incoming);
      setIncoming(null);
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [incoming]);

  return { current, incoming };
}

export function RotatingBackground({
  current,
  incoming,
}: {
  current: string;
  incoming: string | null;
}) {
  return (
    <div className="fixed inset-0 z-0">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${current}')` }}
      />
      {incoming && (
        <div
          className="absolute inset-0 bg-cover bg-center animate-bg-fade-in"
          style={{ backgroundImage: `url('${incoming}')` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/55 to-white/10" />
    </div>
  );
}
