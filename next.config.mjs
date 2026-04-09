/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel's Next.js integration expects the default `.next` output dir.
  // Locally, `.next-build` avoids webpack/OneDrive sync issues under this folder.
  distDir: process.env.VERCEL ? ".next" : ".next-build",
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid filesystem cache corruption in OneDrive-synced folders.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
