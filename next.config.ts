import type { NextConfig } from "next";

// En GitHub Pages la web vive en /iecross; en local, en la raíz.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Web 100 % estática (todo se calcula en el navegador): se publica en GitHub Pages.
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
