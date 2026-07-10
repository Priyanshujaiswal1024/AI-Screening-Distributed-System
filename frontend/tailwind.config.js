/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                border: "var(--border)",
                background: "var(--bg-primary)",
            }
        },
    },
    plugins: [],
}