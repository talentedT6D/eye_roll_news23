/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: no server, no API routes. Deployable to any static host
  // (GitHub Pages, Netlify, S3, Cloudflare Pages, Vercel).
  output: "export",
  images: {
    // next/image optimisation needs a server. Static export disables the
    // optimiser and renders <img> with no transforms. Required for `output: export`.
    unoptimized: true,
  },
};

export default nextConfig;
