/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6969',
          500: '#ff3b3b',
          600: '#ff1111',
          700: '#d80000',
          800: '#b20000',
          900: '#930404',
          950: '#510000',
        },
        rescue: {
          500: '#ff6600', // オレンジ（レスキューカラー）
          600: '#e65c00',
        }
      }
    },
  },
  plugins: [],
}
