import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config) => {
    // Force resolution from frontend directory only (root package.json was pulling resolution to repo root)
    config.resolve.modules = [path.resolve(__dirname, 'node_modules')];
    config.resolve.symlinks = false;
    config.resolveLoader = config.resolveLoader || {};
    config.resolveLoader.modules = [path.resolve(__dirname, 'node_modules')];
    return config;
  },
};

export default nextConfig;
