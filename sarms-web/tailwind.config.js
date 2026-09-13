/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC',
        primary: { DEFAULT: '#1E3A8A', hover: '#1D4ED8', active: '#172554' },
        secondary: '#1D4ED8',
        tertiary: '#3B82F6',
        'soft-accent': '#DBEAFE',
        border: '#E2E8F0',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        success: { DEFAULT: '#059669', surface: '#ECFDF5' },
        warning: { DEFAULT: '#D97706', surface: '#FFFBEB' },
        critical: { DEFAULT: '#DC2626', surface: '#FEF2F2' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { sm: '0.25rem', DEFAULT: '0.5rem', lg: '0.75rem' },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        elevated: '0 10px 15px -3px rgba(15, 23, 42, 0.07), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
