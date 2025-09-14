/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{html,ts}",
    ],
    theme: {
      extend: {
        animation: {
          'spin': 'spin 1s linear infinite',
          'typing': 'typing 1.4s infinite ease-in-out',
          'message-slide': 'messageSlide 0.3s ease-out',
        },
        keyframes: {
          typing: {
            '0%, 80%, 100%': { transform: 'scale(0.8)', opacity: '0.5' },
            '40%': { transform: 'scale(1)', opacity: '1' },
          },
          messageSlide: {
            'from': { opacity: '0', transform: 'translateY(10px)' },
            'to': { opacity: '1', transform: 'translateY(0)' },
          }
        },
      },
    },
    plugins: [],
  }