import path from "path";
import type { NextConfig } from "next";
import { REGION_COOKIE } from "./src/lib/region";

const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? [process.env.ZIPPP_LOCAL_PREVIEW_HOST, process.env.ZIPPP_LOCAL_DUMMY_HOST].filter(
          (host): host is string => Boolean(host),
        )
      : [],
  agentRules: false,
  turbopack: {
    root: path.join(__dirname),
  },
  // spec/wording.txt is read with fs at runtime — make sure Vercel traces it
  // into the serverless bundle.
  outputFileTracingIncludes: {
    "/**": ["./spec/wording.txt"],
  },
  // Indonesian visitors land on `/id`. The `missing` cookie check keeps it to
  // one redirect: once the region cookie is set (including a visitor who picked
  // Worldwide), `/` is served as-is. Runs at Vercel's edge before middleware.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/rn", destination: "/rn/index.html" },
        { source: "/rn/inbox", destination: "/rn/inbox.html" },
        { source: "/rn/capture", destination: "/rn/capture.html" },
        { source: "/rn/sheet", destination: "/rn/sheet.html" },
        { source: "/rn/settings", destination: "/rn/settings.html" },
        { source: "/rn/join", destination: "/rn/join.html" },
        { source: "/rn/space", destination: "/rn/space.html" },
        { source: "/rn/topup", destination: "/rn/topup.html" },
        { source: "/rn/topup/qris/:id", destination: "/rn/topup/qris/[id].html" },
        { source: "/rn/topup/order/:id", destination: "/rn/topup/order/[id].html" },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [
          { type: "header", key: "x-vercel-ip-country", value: "ID" },
        ],
        missing: [{ type: "cookie", key: REGION_COOKIE }],
        destination: "/id",
        permanent: false,
      },
      { source: "/join", destination: "/rn/join", permanent: false },
      { source: "/app/topup/qris/:id", destination: "/rn/topup/qris/:id", permanent: false },
    ];
  },
};

export default nextConfig;
