/**
 * Claude.ai-inspired palette: warm cream surfaces, clay-orange accent,
 * warm-gray text. Two themes sharing the same accent.
 */
export interface Theme {
  mode: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  gridLine: string; // thin cell separators on the board
  gridLineBold: string; // 3x3 box separators and board edge
  accent: string;
  accentSoft: string; // tinted fill for highlighted cells / active chips
  accentText: string; // text/icon color on top of accent
  highlight: string; // row/col/box peer highlight
  highlightStrong: string; // same-value highlight
  selected: string; // selected cell background
  error: string;
  errorSoft: string;
  givenText: string; // pre-filled clue numerals
  shadow: string;
}

const CLAY = '#D97757';

export const lightTheme: Theme = {
  mode: 'light',
  background: '#F5F4EE',
  surface: '#FFFFFF',
  surfaceAlt: '#FAF9F5',
  text: '#1F1E1D',
  textMuted: '#6E6B66',
  border: '#E5E1D8',
  gridLine: '#CFCABF',
  gridLineBold: '#57534C',
  accent: CLAY,
  accentSoft: '#F4E3DB',
  accentText: '#FFFFFF',
  highlight: '#EFEDE5',
  highlightStrong: '#EAD9CF',
  selected: '#F1D9CD',
  error: '#C0392B',
  errorSoft: '#F6D9D4',
  givenText: '#1F1E1D',
  shadow: '#00000022',
};

export const darkTheme: Theme = {
  mode: 'dark',
  background: '#1F1E1D',
  surface: '#2A2A28',
  surfaceAlt: '#262624',
  text: '#F5F4EE',
  textMuted: '#A6A29A',
  border: '#3A3A37',
  gridLine: '#4C4C48',
  gridLineBold: '#B8B4AC',
  accent: CLAY,
  accentSoft: '#4A3128',
  accentText: '#1F1E1D',
  highlight: '#2F2F2C',
  highlightStrong: '#473127',
  selected: '#5A3A2C',
  error: '#E8796B',
  errorSoft: '#4A2A26',
  givenText: '#F5F4EE',
  shadow: '#00000055',
};
