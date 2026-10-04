import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: path.join(__dirname),
  },
  // spec/wording.md is read with fs at runtime — make sure Vercel traces it
  // into the serverless bundle.
  outputFileTracingIncludes: {
    "/**": ["./spec/wording.md"],
  },
};

export default nextConfig;
