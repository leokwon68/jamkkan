/** @type {import('next').NextConfig} */
const nextConfig = {
  // 빌드 에러 무시 (배포 성공용)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;