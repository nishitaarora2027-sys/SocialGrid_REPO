import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SocialGrid",
    short_name: "SocialGrid",
    description: "Social media posts for your business",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf3",
    theme_color: "#d9480f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
