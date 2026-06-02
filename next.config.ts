import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*", "192.168.137.1"],
  turbopack: {},
};

// Apply PWA wrapper first, then add allowedDevOrigins on top
// (withPWA may strip unknown keys, so we add it after)
const finalConfig = {
  ...withPWA(nextConfig),
  allowedDevOrigins: ["*", "192.168.137.1"],
};

export default finalConfig;
