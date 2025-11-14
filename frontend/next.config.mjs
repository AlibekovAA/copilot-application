/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Важно для Docker
  /* config options here */
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
