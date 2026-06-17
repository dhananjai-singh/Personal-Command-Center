import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal Command Center",
    short_name: "Command Center",
    description: "Tasks, habits, fitness, notes, and AI — your personal command center.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1ece1",
    theme_color: "#f1ece1",
    orientation: "portrait",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
