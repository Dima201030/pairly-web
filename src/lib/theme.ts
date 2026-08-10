export const colors = {
  brand: '#00D4AA',
  brandDark: '#00B894',
  brandLight: '#33E8C4',

  brandBlue: '#0096FF',
  brandBlueDark: '#0077CC',
  brandBlueLight: '#33AEFF',

  background: '#0A0F14',
  surface: '#12181F',
  surfaceSecondary: '#1A222D',

  textPrimary: '#F0F4F8',
  textSecondary: '#A0AEC0',
  textTertiary: '#718096',

  red: '#FC8181',
  redLight: '#FEB2B2',
  green: '#68D391',
  greenLight: '#9AE6B4',
  orange: '#F6AD55',
  orangeLight: '#FBD38D',
  yellow: '#F6E05E',
  yellowLight: '#FAF089',

  border: '#2D3748',
  divider: '#1A202C',

  sport: {
    padel: '#00D4AA',
    tennis: '#FFD700',
    badminton: '#FC8181',
    squash: '#B794F4',
    football: '#63B3ED',
    running: '#68D391',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  md: '0 4px 6px rgba(0,0,0,0.4)',
  lg: '0 10px 25px rgba(0,0,0,0.5)',
  xl: '0 20px 40px rgba(0,0,0,0.6)',
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 1.2 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 1.3 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 1.3 },
  h4: { fontSize: 18, fontWeight: '600', lineHeight: 1.4 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 1.5 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 1.5 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 1.4 },
  captionBold: { fontSize: 12, fontWeight: '600', lineHeight: 1.4 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 1.2 },
};

export const sportColors: Record<string, string> = {
  padel: '#00D4AA',
  tennis: '#FFD700',
  badminton: '#FC8181',
  squash: '#B794F4',
  football: '#63B3ED',
  running: '#68D391',
};

export const sportIcons: Record<string, string> = {
  padel: '🎾',
  tennis: '🎾',
  badminton: '🏸',
  squash: '🏓',
  football: '⚽',
  running: '🏃',
};

export const sportNames: Record<string, string> = {
  padel: 'Падл',
  tennis: 'Теннис',
  badminton: 'Бадминтон',
  squash: 'Сквош',
  football: 'Футбол',
  running: 'Бег',
};

export const levelNames: Record<string, string> = {
  any: 'Любой',
  beginner: 'Начальный',
  middle: 'Средний',
  advanced: 'Продвинутый',
};

export const roleNames: Record<string, string> = {
  user: 'Игрок',
  moderator: 'Модератор',
  support: 'Поддержка',
  host: 'Хозяин',
};

export const roleColors: Record<string, string> = {
  user: '#718096',
  moderator: '#00D4AA',
  support: '#68D391',
  host: '#F6E05E',
};

export const reasonNames: Record<string, string> = {
  spam: 'Спам',
  harassment: 'Домогательство',
  cheating: 'Мошенничество',
  inappropriate: 'Неподходящее поведение',
  other: 'Другое',
};

export const tournamentStatusNames: Record<string, string> = {
  open: 'Регистрация открыта',
  finished: 'Завершён',
  cancelled: 'Отменён',
};