import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import type { TripDay } from "@/types/trip";

interface MapViewProps {
  day: TripDay;
  activePlaceId?: number | null;
  onMarkerClick?: (placeId: number) => void;
}

const MODE_COLOR: Record<string, string> = {
  walking: "#1a8a9a",
  transit: "#3daeba",
  taxi: "#e8854a",
};

export function MapView({ day, activePlaceId, onMarkerClick }: MapViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylinesRef = useRef<any[]>([]);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;

    const key = import.meta.env.VITE_AMAP_KEY;
    if (!key) {
      setError(true);
      return;
    }

    AMapLoader.load({ key, version: "2.0" })
      .then((AMap) => {
        if (destroyed || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: 13,
          viewMode: "2D",
        });
        mapRef.current = map;

        updateMarkers(AMap, map, day, activePlaceId, onMarkerClick, markersRef);
        updatePolylines(AMap, map, day, polylinesRef);
        fitView(map);
      })
      .catch(() => {
        if (!destroyed) setError(true);
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
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute right-2 top-2 rounded-lg bg-white/80 px-2.5 py-1 text-[10px] text-sand-500 backdrop-blur-sm">
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
    const isAnchor = place.role === "anchor";
    const bg = isActive ? "#1a6b7a" : isAnchor ? "#1a8a9a" : "#9a8672";

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

    const polyline = new AMap.Polyline({
      path: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
      strokeColor: MODE_COLOR[leg.mode] ?? "#94a3b8",
      strokeWeight: 3,
      strokeStyle: "dashed",
      strokeOpacity: 0.7,
      strokeDasharray: [8, 4],
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
  setTimeout(() => map.setFitView(null, false, [40, 40, 40, 40]), 100);
}
