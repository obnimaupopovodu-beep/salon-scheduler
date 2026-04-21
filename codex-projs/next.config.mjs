import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // не мешает в dev-режиме
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default pwaConfig(nextConfig);