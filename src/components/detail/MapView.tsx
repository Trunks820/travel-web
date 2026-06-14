import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import type { TripDay } from "@/types/trip";
import { decodePolyline } from "@/utils/polyline";
import { isAnchorRole } from "@/constants/places";

interface MapViewProps {
  day: TripDay;
  activePlaceId?: number | null;
  onMarkerClick?: (placeId: number) => void;
}

const MODE_COLOR: Record<string, string> = {
  walking: "#0f766e",
  transit: "#1d9e91",
  taxi: "#f97316",
};

export function MapView({ day, activePlaceId, onMarkerClick }: MapViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satelliteRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylinesRef = useRef<any[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"standard" | "satellite">("standard");
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleView(next: "standard" | "satellite") {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map || next === view) return;
    if (next === "satellite") {
      if (!satelliteRef.current) satelliteRef.current = new AMap.TileLayer.Satellite();
      map.add(satelliteRef.current);
      baseRef.current?.hide();
    } else {
      satelliteRef.current?.hide();
      baseRef.current?.show();
    }
    setView(next);
  }

  useEffect(() => {
    let destroyed = false;

    const key = import.meta.env.VITE_AMAP_KEY;
    if (!key) {
      setError(true);
      return;
    }

    // 新版高德 Web JS API 需要安全密钥配对（本地明文，上线改后端代理）
    const security = import.meta.env.VITE_AMAP_SECURITY;
    if (security) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._AMapSecurityConfig = { securityJsCode: security };
    }

    AMapLoader.load({ key, version: "2.0" })
      .then((AMap) => {
        if (destroyed || !containerRef.current) return;

        amapRef.current = AMap;
        // 显式挂栅格底图，避免 2.0 默认矢量底图在部分环境 WebGL 渲染失败导致白屏
        const baseLayer = new AMap.TileLayer();
        baseRef.current = baseLayer;
        const map = new AMap.Map(containerRef.current, {
          zoom: 13,
          viewMode: "2D",
          layers: [baseLayer],
        });
        mapRef.current = map;

        updateMarkers(AMap, map, day, activePlaceId, onMarkerClick, markersRef);
        updatePolylines(AMap, map, day, polylinesRef);
        fitView(map);
        setLoading(false);
      })
      .catch(() => {
        if (!destroyed) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      destroyed = true;
      mapRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY || "",
      version: "2.0",
    }).then((AMap) => {
      clearOverlays(markersRef, polylinesRef);
      updateMarkers(AMap, map, day, activePlaceId, onMarkerClick, markersRef);
      updatePolylines(AMap, map, day, polylinesRef);
      fitView(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, activePlaceId]);

  if (error) return null;

  return (
    <div className="card relative h-full w-full overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-50/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />

      {/* 图层切换 */}
      <div className="absolute right-2 top-2 flex overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleView("standard")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "standard" ? "bg-primary-50 text-primary-600" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          地图
        </button>
        <button
          type="button"
          onClick={() => toggleView("satellite")}
          className={`border-l border-gray-100 px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "satellite" ? "bg-primary-50 text-primary-600" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          卫星
        </button>
      </div>

      <div className="absolute bottom-2 right-2 rounded-lg bg-white/80 px-2.5 py-1 text-[10px] text-sand-500 backdrop-blur-sm">
        路线顺序示意图
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateMarkers(AMap: any, map: any, day: TripDay, activePlaceId: number | null | undefined, onMarkerClick: ((id: number) => void) | undefined, markersRef: React.MutableRefObject<any[]>) {
  day.places.forEach((place, i) => {
    if (!place.longitude || !place.latitude) return;

    const isActive = place.place_id === activePlaceId;
    const isAnchor = isAnchorRole(place.role);
    const bg = isActive ? "#0c625b" : isAnchor ? "#0f766e" : "#9a8672";

    const marker = new AMap.Marker({
      position: [place.longitude, place.latitude],
      content: `<div style="width:24px;height:24px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.25);border:2px solid #fff">${i + 1}</div>`,
      offset: new AMap.Pixel(-12, -12),
    });

    marker.on("click", () => onMarkerClick?.(place.place_id));
    map.add(marker);
    markersRef.current.push(marker);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updatePolylines(AMap: any, map: any, day: TripDay, polylinesRef: React.MutableRefObject<any[]>) {
  day.commute_legs.forEach((leg) => {
    const from = day.places.find((p) => p.place_id === leg.from_place_id);
    const to = day.places.find((p) => p.place_id === leg.to_place_id);
    if (!from?.longitude || !to?.longitude) return;

    let path: [number, number][];
    let strokeStyle: "solid" | "dashed" = "dashed";

    if (leg.encoded_polyline) {
      try {
        path = decodePolyline(leg.encoded_polyline);
        strokeStyle = "solid";
      } catch {
        path = [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ];
      }
    } else {
      path = [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ];
    }

    const polyline = new AMap.Polyline({
      path,
      strokeColor: MODE_COLOR[leg.mode] ?? "#94a3b8",
      strokeWeight: strokeStyle === "solid" ? 4 : 3,
      strokeStyle,
      strokeOpacity: strokeStyle === "solid" ? 0.8 : 0.7,
      strokeDasharray: strokeStyle === "dashed" ? [8, 4] : undefined,
    });

    map.add(polyline);
    polylinesRef.current.push(polyline);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clearOverlays(markersRef: React.MutableRefObject<any[]>, polylinesRef: React.MutableRefObject<any[]>) {
  markersRef.current.forEach((m) => m.setMap(null));
  polylinesRef.current.forEach((p) => p.setMap(null));
  markersRef.current = [];
  polylinesRef.current = [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fitView(map: any) {
  setTimeout(() => {
    map.setFitView(null, false, [40, 40, 40, 40], 300);
  }, 100);
}
