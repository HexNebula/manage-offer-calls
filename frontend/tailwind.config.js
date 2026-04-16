/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  safelist: [
    'bg-brand-navy',
    'bg-brand-navy-dark',
    'bg-brand-navy-light',
    'bg-brand-red',
    'bg-brand-red-dark',
    'bg-brand-orange',
    'bg-brand-orange-dark',
    'bg-brand-yellow',
    'bg-brand-yellow-dark',
    'text-brand-navy',
    'text-brand-orange',
    'text-brand-red',
    'text-brand-yellow',
    'hover:bg-brand-navy-light',
    'hover:bg-brand-orange-dark',
    'hover:bg-brand-red-dark',
    'focus:ring-brand-navy',
    'focus:ring-brand-orange',
    'focus:ring-brand-red',
    'from-brand-navy-dark',
    'to-brand-navy',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:          '#003049',
          'navy-dark':   '#00202f',
          'navy-light':  '#004a73',
          red:           '#D62828',
          'red-dark':    '#b52020',
          orange:        '#F77F00',
          'orange-dark': '#d96e00',
          yellow:        '#FCBF49',
          'yellow-dark': '#e5a832',
        },
      },
    },
  },
  plugins: [],
};
