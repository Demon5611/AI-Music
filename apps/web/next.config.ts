import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@waveform-playlist/browser",
    "@waveform-playlist/playout",
    "@waveform-playlist/engine",
    "tone",
    "three",
    "@react-three/fiber",
    "@react-three/drei",
  ],
};

export default nextConfig;
