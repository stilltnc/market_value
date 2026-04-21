import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Otimizações de performance
  },
  images: {
    domains: [
      'xsxliznkbqgabcdwohgx.supabase.co',
      'lh3.googleusercontent.com',
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
}

export default nextConfig
