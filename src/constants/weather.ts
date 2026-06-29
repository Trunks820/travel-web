/** 后端 weather.days[].icon_code → emoji。后端取值集见 hermes-travel。 */
const WEATHER_ICON_EMOJI: Record<string, string> = {
  sunny: "☀️",
  clear: "☀️",
  cloudy: "☁️",
  partly_cloudy: "⛅",
  overcast: "🌥️",
  rain: "🌧️",
  light_rain: "🌦️",
  moderate_rain: "🌧️",
  heavy_rain: "⛈️",
  thunderstorm: "⛈️",
  thunder: "⛈️",
  snow: "🌨️",
  light_snow: "🌨️",
  heavy_snow: "❄️",
  sleet: "🌨️",
  fog: "🌫️",
  haze: "😶‍🌫️",
  windy: "💨",
  unknown: "🌡️",
};

/** 取天气 emoji，未知 code 回退到 unknown */
export function weatherIcon(code: string | null | undefined): string {
  if (!code) return WEATHER_ICON_EMOJI.unknown;
  return WEATHER_ICON_EMOJI[code] ?? WEATHER_ICON_EMOJI.unknown;
}
