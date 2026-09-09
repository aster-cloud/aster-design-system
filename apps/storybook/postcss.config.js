/**
 * PostCSS 配置（Tailwind v4）。
 *
 * v4 把 Tailwind 的 PostCSS 插件拆成独立包：插件名从 `tailwindcss`
 * 改为 `@tailwindcss/postcss`。沿用 v3 的写法会报
 * "trying to use `tailwindcss` directly as a PostCSS plugin"。
 *
 * autoprefixer 保留：v4 内置了 Lightning CSS 的前缀处理，但本项目
 * 的 browserslist 目标由 autoprefixer 决定，先不改动以免影响产物。
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
