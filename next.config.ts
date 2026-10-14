import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // photos are uploaded straight to Supabase Storage; actions only carry metadata
      bodySizeLimit: "2mb",
    },
  },
};

export default withNextIntl(nextConfig);
