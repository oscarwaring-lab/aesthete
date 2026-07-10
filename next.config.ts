import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /auth/callback route reads src/emails/welcome.html at runtime to send
  // the welcome email. @vercel/nft can't statically trace a path built from
  // process.cwd(), so include the template explicitly in that route's server
  // trace. Keys are route paths; values are globs resolved from the project root.
  outputFileTracingIncludes: {
    "/auth/callback": ["./src/emails/welcome.html"],
  },
};

export default nextConfig;
