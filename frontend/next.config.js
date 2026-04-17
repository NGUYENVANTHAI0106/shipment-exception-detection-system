const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:8000";
const n8nTarget = process.env.N8N_PROXY_TARGET || "http://localhost:5679";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`
      },
      {
        source: "/n8n/:path*",
        destination: `${n8nTarget}/n8n/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
