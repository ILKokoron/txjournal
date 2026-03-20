/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Copy WASM files to output
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    if (isServer) {
      config.externals = [...(config.externals || []), '@shelby-protocol/sdk'];
    }

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@shelby-protocol/sdk', '@shelby-protocol/clay-codes'],
  },
};

module.exports = nextConfig;
