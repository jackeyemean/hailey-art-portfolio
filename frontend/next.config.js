/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'hailey-art-portfolio.s3.amazonaws.com',
      'hailey-art-portfolio-uploads.s3.us-east-2.amazonaws.com',
      'localhost',
      '127.0.0.1',
      '*.amazonaws.com'
    ],
  },
}

module.exports = nextConfig 