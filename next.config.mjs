/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep production builds resilient to lint nitpicks.
  eslint: { ignoreDuringBuilds: true },
  // To export a fully static build (e.g. for GitHub Pages), uncomment:
  // output: "export",
};

export default nextConfig;
