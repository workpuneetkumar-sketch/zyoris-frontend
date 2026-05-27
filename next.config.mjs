/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      fallback: [
        {
          source: "/:path*",
          destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/:path*`,
        },
      ],
    };
  },
};
export default nextConfig;