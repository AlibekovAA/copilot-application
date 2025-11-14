/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Важно для Docker
  /* config options here */
  turbopack: {
    root: process.cwd(),
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
