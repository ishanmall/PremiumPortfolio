/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc", 
        foreground: "#0f172a", 
        muted: "#64748b",      
        accent: {
          DEFAULT: "#06b6d4",  
          secondary: "#ec4899",
        }
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"], 
      },

      boxShadow: {
        // Combined the standard '2xl' shadow with the custom pink glow
        'pink-glow': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(236, 72, 153, 0.2)',
        'cyan-glow': '0 0 8px rgba(6, 182, 212, 0.8)',
      },

      transitionTimingFunction: {
        "custom-ease": "cubic-bezier(0.76, 0, 0.24, 1)",
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