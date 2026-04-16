/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com'],
    unoptimized: true, // Para desarrollo, permite imágenes locales sin optimización
  }
}

module.exports = nextConfig
