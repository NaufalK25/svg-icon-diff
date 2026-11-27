/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Serve the SVG icon at the legacy favicon.ico path browsers auto-request
      { source: '/favicon.ico', destination: '/icon.svg' },
    ];
  },
};

export default nextConfig;
