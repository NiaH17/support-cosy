/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-pink':   '#F050F8',
        'brand-purple': '#5840FF',
        'brand-navy':   '#100030',
        'brand-cyan':   '#60F0F8',
        'brand-ice':    '#F0FFFF',
        'brand-green':  '#108048',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
