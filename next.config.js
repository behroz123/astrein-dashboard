/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // این باعث میشه Next ریشه رو درست تشخیص بده و با توربو کمتر گیر بده
    root: __dirname,
  },
};

module.exports = nextConfig;