/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            colors: {
                medical: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                enterprise: {
                    50: '#f5f7fa',
                    100: '#e4e7eb',
                    200: '#cbd2d9',
                    300: '#9aa5b1',
                    400: '#7b8794',
                    500: '#616e7c',
                    600: '#52606d',
                    700: '#3e4c59',
                    800: '#323f4b',
                    900: '#1f2933',
                },
            },
            fontFamily: {
                outfit: ['var(--font-outfit)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
