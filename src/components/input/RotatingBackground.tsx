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
  shanghai: [
    'freeman-zhou-oV9hp8wXkPE-unsplash.jpg',
    'hanny-naibaho-D7InODIWyK4-unsplash.jpg',
    'nuno-alberto-MykFFC5zolE-unsplash.jpg',
    'yifan-cong-GszVE92a5Rs-unsplash.jpg',
    'zhou-xian-7tFFO6Mq5L4-unsplash.jpg',
  ],
  chongqing: [
    'harrison-qi-E9dIbdSd7LU-unsplash.jpg',
    'zhang-qc-EyScjFlzvtg-unsplash.jpg',
    'albert-canite-RG2YD21o81E-unsplash.jpg',
    'albert-canite-vMM4_VA8ogw-unsplash.jpg',
    'andrea-sun-pMnpZayQJFE-unsplash.jpg',
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
  xian: [
    'aoyu-zhang-KNpElyP6R20-unsplash.jpg',
    'jun-ren-m8z_AnmlcpU-unsplash.jpg',
    'jun-ren-GPWtsTz_lOc-unsplash.jpg',
    'yihan-wang-2cvRysXC8Hk-unsplash.jpg',
    'yux-xiang-zvVX7prwg4c-unsplash.jpg',
  ],
  nanjing: [
    'jennifer-chen-Pnc2Uxb7PG0-unsplash.jpg',
    'kenneth-yang-lJWJLkwIsng-unsplash.jpg',
    'tianyang-zheng-OFoheOWxi2Y-unsplash.jpg',
    'dendy-X8EPQsYL754-unsplash.jpg',
    'tianyang-zheng-Oh71Xv1yWHU-unsplash.jpg',
  ],
  changsha: [
    'zhe-zhang-TCaefwd87wE-unsplash.jpg',
    'camillo-corsetti-antonini-3u6BRuwc5-k-unsplash.jpg',
    'bo-zhang-wd4o3QlBsdc-unsplash.jpg',
    'hyory-liu-McnNA_yRjY8-unsplash.jpg',
    'tianyang-zheng-OFoheOWxi2Y-unsplash.jpg',
  ],
  qingdao: [
    'r-hai-BZrJ5tcuJE0-unsplash.jpg',
    'rockcyz-v6ceQ2Lj6b0-unsplash.jpg',
    'guxxxxyz-Fwo8xRfRSfM-unsplash.jpg',
    'hat-trick-obeOYXrKv7w-unsplash.jpg',
    'hat-trick-OQlBGJ4tSSc-unsplash.jpg',
  ],
  guilin: [
    'theodor-lundqvist-WHhbYArwFt8-unsplash.jpg',
    'william-zhang--Qd91Sg6gZ8-unsplash.jpg',
    'chopsticks-on-the-loose-_75I7lCDgY8-unsplash.jpg',
    'manos-koutras-7jxuzSHtVC8-unsplash.jpg',
    'robynne-o-pjsrHjXGnVs-unsplash.jpg',
  ],
};

const CITY_NAME_TO_FOLDER: Record<string, string> = {
  北京: 'beijing',
  上海: 'shanghai',
  重庆: 'chongqing',
  成都: 'chengdu',
  杭州: 'hangzhou',
  西安: 'xian',
  南京: 'nanjing',
  长沙: 'changsha',
  青岛: 'qingdao',
  桂林: 'guilin',
};

const FOLDER_TO_CITY_NAME: Record<string, string> = {
  beijing: '北京',
  shanghai: '上海',
  chongqing: '重庆',
  chengdu: '成都',
  hangzhou: '杭州',
  xian: '西安',
  nanjing: '南京',
  changsha: '长沙',
  qingdao: '青岛',
  guilin: '桂林',
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

/**
 * 取某城市的图片列表（用于给方案卡配图）。
 * 命中城市 → 返回该城市图；未命中（如桂林等暂无素材的城市）→ 返回全部城市图，
 * 并按城市名做确定性轮转，让多张卡片取到不同的国内风景图，且同城每次顺序稳定（不闪烁）。
 */
export function cityImageList(city: string): string[] {
  const entry = Object.entries(CITY_NAME_TO_FOLDER).find(
    ([name, folder]) => city.includes(name) || city.toLowerCase().includes(folder),
  );
  if (entry) {
    const folder = entry[1];
    return CITY_IMAGES[folder].map((f) => `/city/${folder}/${f}`);
  }
  // 未命中：用城市名生成确定性偏移，轮转全部图，保证稳定且不全是同一张
  const seed = Array.from(city).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const offset = seed % ALL_IMAGES.length;
  return [...ALL_IMAGES.slice(offset), ...ALL_IMAGES.slice(0, offset)];
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
