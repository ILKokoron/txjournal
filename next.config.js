/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Exclude WASM from being processed by webpack
    config.module.rules.push({
      test: /clay\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@shelby-protocol/sdk',
      '@shelby-protocol/clay-codes',
    ],
  },
};

module.exports = nextConfig;
