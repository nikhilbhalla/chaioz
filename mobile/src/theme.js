export const colors = {
  cream: '#FAF5EC',
  creamDeep: '#F2EADB',
  teal: '#0F4C4A',
  tealDim: 'rgba(15,76,74,0.62)',
  tealMute: 'rgba(15,76,74,0.35)',
  saffron: '#E8A84A',
  saffronHover: '#D79A3E',
  line: '#E0DACE',
  white: '#FFFFFF',
  danger: '#C7533C',
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = (n) => n * 4;

export const font = {
  serif: 'serif', // Brioche replacement — use system serif; swap to loaded font later
  sans: 'System',
};

export const text = {
  h1: { fontSize: 36, fontWeight: '500', color: colors.teal, fontFamily: font.serif },
  h2: { fontSize: 26, fontWeight: '500', color: colors.teal, fontFamily: font.serif },
  h3: { fontSize: 20, fontWeight: '500', color: colors.teal, fontFamily: font.serif },
  body: { fontSize: 15, color: colors.teal },
  bodyDim: { fontSize: 14, color: colors.tealDim },
  small: { fontSize: 12, color: colors.tealDim, textTransform: 'uppercase', letterSpacing: 1 },
};
