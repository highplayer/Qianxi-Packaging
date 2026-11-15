// https://docs.astro.build/en/guides/content-collections/#defining-collections

import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const productsCollection = defineCollection({
  loader: glob({
    pattern: '**/[^_]*.{md,mdx}',
    base: './src/content/products',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    usage: z.string(),
    main: z.object({
      id: z.number(),
      content: z.string(),
      imgCard: z.string().optional(),
      imgMain: z.string().optional(),
      imgAlt: z.string(),
    }),
    specs: z.object({
      material: z.string(),
      fluteType: z.string(),
      // Extra, verifiable production details (omitted when not confirmed).
      structure: z.string().optional(),
      printing: z.string().optional(),
      industries: z.array(z.string()).optional(),
      burstStrength: z.string(),
      edgeCrush: z.string(),
      sizeRange: z.string(),
      moq: z.string().optional(),
    }),
    applications: z.array(z.string()),
    customOptions: z.array(z.string()),
  }),
});

export const collections = {
  products: productsCollection,
};
