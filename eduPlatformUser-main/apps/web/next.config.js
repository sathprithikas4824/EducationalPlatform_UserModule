/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["kafkajs"],
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 430, 768, 1024, 1280, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  turbopack: {
    root: "../../",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com https://educationalplatform-usermodule-2.onrender.com",
              "media-src 'self' blob: data: https://res.cloudinary.com https://*.supabase.co https://educationalplatform-usermodule-2.onrender.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://*.vercel.app https://educationalplatform-usermodule-2.onrender.com",
              "frame-src 'self'",
              "worker-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
