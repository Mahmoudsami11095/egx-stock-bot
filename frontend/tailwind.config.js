/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        darkCard: '#111827',
        darkBorder: '#1f2937',
        emeraldAccent: '#10b981',
        amberAccent: '#f59e0b',
        cyanAccent: '#06b6d4',
        roseAccent: '#f43f5e',
      },
      fontFamily: {
        cairo: ['Cairo', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
