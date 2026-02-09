import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 👇 eslint 설정은 삭제했습니다 (이게 원인이었습니다!)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;