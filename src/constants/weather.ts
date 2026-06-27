/** 后端 weather.days[].icon_code → emoji。后端取值集见 hermes-travel。 */
const WEATHER_ICON_EMOJI: Record<string, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  partly_cloudy: "⛅",
  overcast: "🌥️",
  rain: "🌧️",
  heavy_rain: "⛈️",
  snow: "🌨️",
  unknown: "🌡️",
};

/** 取天气 emoji，未知 code 回退到 unknown */
export function weatherIcon(code: string | null | undefined): string {
  if (!code) return WEATHER_ICON_EMOJI.unknown;
  return WEATHER_ICON_EMOJI[code] ?? WEATHER_ICON_EMOJI.unknown;
}
