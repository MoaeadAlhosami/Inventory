/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // تفعيل التبديل بين الفاتح والداكن عبر زر التحكم
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Cairo"', 'sans-serif'],
        arabic: ['"Cairo"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        vag: {
          red: '#DC2626',      // أحمر VAGLOGIC الأساسي
          darkRed: '#B91C1C',  // أحمر داكن عند التمرير
          charcoal: '#18181B', // فحمي
        },
        // درجات الثيم الفاتح: بديل هادئ للأبيض الناصع
        light: {
          canvas: '#e8ebef',  // خلفية الصفحة
          surface: '#f4f5f7', // البطاقات والهيدر والجداول والنوافذ
          muted: '#eceef2',   // رؤوس الجداول والحقول وتمرير الصفوف
          subtle: '#e2e6eb',  // الأزرار الثانوية وشريط التبويبات
        }
      }
    },
  },
  plugins: [],
}