import path from "path";
import type { NextConfig } from "next";
import { REGION_COOKIE } from "./src/lib/region";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
