const githubPages = process.env.GITHUB_PAGES === 'true'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(githubPages ? { output: 'export', trailingSlash: true } : {}),
  basePath,
  // Browser JS API credentials from .env.local; retain the existing public aliases.
  env: {
    NEXT_PUBLIC_AMAP_KEY: process.env.AMAP_KEY || process.env.NEXT_PUBLIC_AMAP_KEY || '',
    NEXT_PUBLIC_AMAP_SECURITY_JS_CODE: process.env.AMAP_SECURITY_JS_CODE || process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE || '',
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
