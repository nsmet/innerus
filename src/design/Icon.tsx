import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/** Stroke icons from the InnerUs design canvas (24-unit grid, 1.6 stroke). Decorative: always paired with a label. */
const icons = {
  // Gear outline (shape after Lucide "settings", ISC licence). The earlier rays-around-a-dot read as brightness.
  settings: <><Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><Circle cx="12" cy="12" r="3" /></>,
  close: <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  back: <Path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronRight: <Path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevronDown: <Path d="m6 9.5 6 6 6-6" />,
  chevronUp: <Path d="m6 14.5 6-6 6 6" />,
  arrow: <Path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />,
  clock: <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 7.5V12l3 2" /></>,
  lock: <><Rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  check: <Path d="m5.5 12.5 4 4L18.5 7.5" />,
  search: <><Circle cx="11" cy="11" r="6.5" /><Path d="m16 16 4 4" /></>,
  shield: <Path d="M12 3.5 19 6v5.5c0 4.6-3 7.6-7 8.9-4-1.3-7-4.3-7-8.9V6z" />,
  pen: <><Path d="m4.5 19.5 1-4L16 5l3 3L8.5 18.5z" /><Path d="M14 7l3 3" /></>,
  mic: <><Rect x="9" y="3.5" width="6" height="10.5" rx="3" /><Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3" /></>,
  skip: <Path d="M6.5 6.5 14 12l-7.5 5.5zM17.5 6.5v11" />,
  pause: <Path d="M9 5.5v13M15 5.5v13" />,
  play: <Path d="M8 5.5v13l10.5-6.5z" />,
  stop: <Rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  trash: <Path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" />,
  warning: <Path d="M12 4.5 20.5 19.5h-17zM12 10v4M12 16.8v.2" />,
  cloud: <Path d="M7.5 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17.6 9.6 4.2 4.2 0 0 1 17 18z" />,
  cloudCheck: <><Path d="M7.5 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17.6 9.6 4.2 4.2 0 0 1 17 18z" /><Path d="m9.5 13.5 2 2 3.5-3.5" /></>,
  cloudOff: <><Path d="M7.5 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17.6 9.6 4.2 4.2 0 0 1 17 18z" /><Path d="m4 4 16 16" /></>,
  device: <><Rect x="7" y="3" width="10" height="18" rx="2.5" /><Path d="M11 18h2" /></>,
  document: <><Path d="M7 3.5h7l4.5 4.5v12.5H7z" /><Path d="M14 3.5V8h4.5M10 13h5.5M10 16.5h3.5" /></>,
  share: <Path d="M12 15V4M8 8l4-4 4 4M6 12v8h12v-8" />,
  download: <Path d="M12 4.5v11M7.5 11.5 12 16l4.5-4.5M5 20h14" />,
  star: <Path d="m12 4.5 2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" />,
  refresh: <Path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v5h-5" />,
  sliders: <><Path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><Circle cx="16" cy="7" r="2" /><Circle cx="10" cy="17" r="2" /></>,
  globe: <><Circle cx="12" cy="12" r="8.5" /><Path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" /></>,
  help: <><Circle cx="12" cy="12" r="8.5" /><Path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.6M12 16.5v.3" /></>,
  database: <><Ellipse cx="12" cy="6" rx="7" ry="2.8" /><Path d="M5 6v12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6M5 12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8" /></>,
  moon: <Path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z" />,
  bell: <Path d="M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14zM10 20.5h4" />,
  cards: <><Rect x="4" y="7.5" width="11.5" height="13" rx="2" /><Path d="M8.5 4h9.5a2 2 0 0 1 2 2v11" /></>,
  home: <Path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  compass: <><Circle cx="12" cy="12" r="8.5" /><Path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5z" /></>,
  book: <><Path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H18v14H6.5A1.5 1.5 0 0 0 5 19.5z" /><Path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H18v-3" /></>,
} as const;
export type IconName = keyof typeof icons;

export function Icon({ name, color, size = 20, strokeWidth = 1.6, filled = false }: { name: IconName; color: string; size?: number; strokeWidth?: number; filled?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessible={false} importantForAccessibility="no-hide-descendants">
    {icons[name]}
  </Svg>;
}
