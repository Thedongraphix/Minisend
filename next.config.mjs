/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Node.js-level compression to prevent Z_BUF_ERROR on server-to-server
  // webhook calls (Blockradar). Vercel CDN handles browser compression separately.
  compress: false,
  // Allow local network access for mobile testing
  allowedDevOrigins: [
    'http://192.168.100.57',
    'http://192.168.100.57:3000',
    '192.168.100.57',
  ],
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Prevent Vercel edge CDN from compressing webhook responses —
  // Blockradar's axios v1.2.1 fails to decompress Brotli (Z_BUF_ERROR)
  async headers() {
    return [
      {
        source: '/api/blockradar/webhook',
        headers: [
          { key: 'Content-Encoding', value: 'identity' },
        ],
      },
    ];
  },
};

export default nextConfig;
