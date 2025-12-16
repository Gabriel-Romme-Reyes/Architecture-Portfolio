import { defineCollection, z } from "astro:content";

const systemsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200),
    date: z.coerce.date(),
    domain: z.enum([
      "infrastructure",
      "data",
      "platform",
      "product",
      "developer-tools",
      "other",
    ]),
    status: z.enum(["shipped", "deprecated", "evolved"]).default("shipped"),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const notesCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  systems: systemsCollection,
  notes: notesCollection,
};
