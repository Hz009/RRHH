/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next-build",
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid filesystem cache corruption in OneDrive-synced folders.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
