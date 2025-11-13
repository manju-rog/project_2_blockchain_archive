/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle node modules that need to be externalized
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'ipfs-http-client': 'commonjs ipfs-http-client',
        '@pinata/sdk': 'commonjs @pinata/sdk'
      });
    }

    // Fallback for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
    };

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['ipfs-http-client', '@pinata/sdk']
  }
};

export default nextConfig;
