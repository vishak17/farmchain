export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        farm: {
          green: '#16a34a', 'green-light': '#22c55e', 'green-dark': '#15803d',
          amber: '#d97706', 'amber-light': '#f59e0b',
          red: '#dc2626', 'red-light': '#ef4444',
          blue: '#1d4ed8', 'blue-light': '#3b82f6',
          purple: '#7c3aed', 'purple-light': '#a78bfa',
          surface: '#1e293b', 'surface-2': '#273449', 'surface-3': '#334155',
          bg: '#0f172a', border: '#334155', text: '#e2e8f0', muted: '#94a3b8'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
