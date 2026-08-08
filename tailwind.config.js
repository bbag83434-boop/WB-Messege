/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        ink: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-border) / <alpha-value>)',
        positive: 'rgb(var(--color-success) / <alpha-value>)',
        caution: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-error) / <alpha-value>)'
      },
      borderRadius: {
        app: 'var(--radius-app)',
        control: 'var(--radius-control)'
      },
      boxShadow: {
        float: 'var(--shadow-float)',
        soft: 'var(--shadow-soft)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
