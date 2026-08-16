/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep space background used in the 3D portfolio
        background: "#050511", 
        foreground: "#f8fafc", // slate-50 for crisp text
        muted: "#94a3b8",      // slate-400 for secondary text
        accent: {
          DEFAULT: "#22d3ee",  // cyan-400
          secondary: "#d946ef",// fuchsia-500
        }
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        // Added mono for the tech/code elements in the portfolio
        mono: ["JetBrains Mono", "Fira Code", "monospace"], 
      },

      transitionTimingFunction: {
        "custom-ease": "cubic-bezier(0.76, 0, 0.24, 1)",
        // Added a springy easing for highly interactive hover effects
        "spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)", 
      },
      
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};