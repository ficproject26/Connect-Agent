/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f9d453',
          hover: '#cca927',
          light: '#fef9df',
        },
        secondary: {
          DEFAULT: '#1E5AA8',
          hover: '#174786',
          light: '#EAF0F7',
        },
        accent: {
          DEFAULT: '#F28C00',
          hover: '#D67B00',
          light: '#FFF3E0',
        },
        background: {
          DEFAULT: '#F8F9FA',
          dark: '#0B0F19',
          card: '#FFFFFF',
          cardDark: '#161F30',
        },
        forgeGray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        }
      },
      borderRadius: {
        'forge': '20px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'md3-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'md3-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'md3-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.30)',
      },
      backdropBlur: {
        'forge': '16px',
      }
    },
  },
  plugins: [],
}
