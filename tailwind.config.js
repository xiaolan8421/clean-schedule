/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAF9F6',
          dark: '#F3F1EC',
          darker: '#E8E5DE',
        },
        ink: {
          DEFAULT: '#2c2416',
          muted: '#8b8378',
          faint: '#bfb9af',
          light: '#d9d4ca',
        },
        accent: {
          DEFAULT: '#c88d1a',
          soft: 'rgba(200, 141, 26, 0.12)',
          glow: 'rgba(200, 141, 26, 0.25)',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'paper': '0 1px 3px rgba(44, 36, 22, 0.06), 0 1px 2px rgba(44, 36, 22, 0.04)',
        'paper-md': '0 2px 6px rgba(44, 36, 22, 0.07), 0 1px 3px rgba(44, 36, 22, 0.05)',
        'paper-lg': '0 4px 12px rgba(44, 36, 22, 0.08), 0 2px 4px rgba(44, 36, 22, 0.04)',
        'card': '0 1px 2px rgba(44, 36, 22, 0.04)',
        'card-hover': '0 3px 8px rgba(44, 36, 22, 0.08), 0 1px 3px rgba(44, 36, 22, 0.05)',
      },
    },
  },
  plugins: [],
}
