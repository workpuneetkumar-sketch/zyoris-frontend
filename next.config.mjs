/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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