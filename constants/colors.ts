export const COLORS = {
  // Brand Signature — Athletic Volt (High-Tension Stadium Identity)
  primary: '#D8FF00',
  primaryHover: '#C5EB00',
  primaryMuted: 'rgba(216, 255, 0, 0.11)',
  primarySubtle: 'rgba(216, 255, 0, 0.06)',
  primaryBorder: 'rgba(216, 255, 0, 0.34)',
  primaryGlow: 'rgba(216, 255, 0, 0.25)',

  // Architectural Surfaces — Floodlight Pitch & Gunmetal Slate
  background: '#0B0C0E',
  surface: '#13161B',
  surfaceElevated: '#1B1F27',
  surfaceBorder: '#282E3A',
  surfaceBorderHighlight: '#3B4454',

  // Referee Cards & Match Status
  alive: '#B8FF00',
  aliveBg: 'rgba(184, 255, 0, 0.13)',
  dead: '#FF3B1F', // Signal Vermilion (Red Card)
  deadBg: 'rgba(255, 59, 31, 0.14)',
  deadBorder: 'rgba(255, 59, 31, 0.38)',
  warning: '#FFB800', // Referee Yellow Card
  warningBg: 'rgba(255, 184, 0, 0.14)',
  warningBorder: 'rgba(255, 184, 0, 0.38)',
  info: '#4DA6FF', // Continental Floodlight Blue (Bala Europa)
  infoBg: 'rgba(77, 166, 255, 0.14)',

  // Editorial Chalk Typography
  textPrimary: '#F5F2EB',
  textSecondary: '#9BA3B0',
  textMuted: '#5E6778',
  textInverse: '#0B0C0E',

  // Trophies & National Accents
  gold: '#FFD000',
  silver: '#C5CBD6',
  bronze: '#D97736',
  mexicoGreen: '#006847',
  spainRed: '#C8102E',
} as const;
