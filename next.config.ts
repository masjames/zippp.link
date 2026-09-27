import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
