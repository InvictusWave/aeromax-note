import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#17211b', mist: '#f4f7f3', leaf: '#2f7d4a', lime: '#dff2b2', line: '#dce6dc' }, boxShadow: { soft: '0 12px 35px rgba(23,33,27,.07)' } } }, plugins: [] } satisfies Config;
