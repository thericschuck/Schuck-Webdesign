import type { MetadataRoute } from "next";

const BASE_URL = "https://schuck-webdesign.de";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/leistungen`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/projekte`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ueber-mich`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/kontakt`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/kundenportal`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
