import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        // @imgly/background-removal 모델 파일 프록시 (CORS 우회)
        // staticimgly.com에 CORS 헤더가 없어서 서버 사이드 프록시 필요
        source: '/models-proxy/:path*',
        destination: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/:path*',
      },
    ];
  },
};

export default nextConfig;
