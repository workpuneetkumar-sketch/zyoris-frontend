/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['framer-motion'],
  reactStrictMode: true,
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    KEY_ID: process.env.KEY_ID,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://zyoris.onrender.com";
    return {
      fallback: [
        {
          source: "/:path*",
          destination: `${backendUrl}/:path*`,
        },
      ],
    };
  },
};
export default nextConfig;