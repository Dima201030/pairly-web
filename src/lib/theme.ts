export const colors = {
  brand: '#D3A58C',
  brandDark: '#B8947A',
  brandLight: '#E8D4C4',
  
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F5',
  
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#999999',
  
  red: '#E53E3E',
  redLight: '#FC8181',
  green: '#38A169',
  greenLight: '#68D391',
  orange: '#DD6B20',
  orangeLight: '#F6AD55',
  yellow: '#D69E2E',
  yellowLight: '#F6E05E',
  
  border: '#E2E8F0',
  divider: '#EDF2F7',
  
  sport: {
    padel: '#00BFA6',
    tennis: '#FFD700',
    badminton: '#E53E3E',
    squash: '#805AD5',
    football: '#3182CE',
    running: '#38A169',
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
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 25px rgba(0,0,0,0.1)',
  xl: '0 20px 40px rgba(0,0,0,0.12)',
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
  padel: '#00BFA6',
  tennis: '#FFD700',
  badminton: '#E53E3E',
  squash: '#805AD5',
  football: '#3182CE',
  running: '#38A169',
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
  user: '#999999',
  moderator: '#D3A58C',
  support: '#38A169',
  host: '#D69E2E',
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