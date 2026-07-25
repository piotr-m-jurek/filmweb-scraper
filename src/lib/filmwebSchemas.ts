import { z } from "zod";

export const votesPageSchema = z.object({
  votes: z.array(
    z.object({
      id: z.object({ id: z.number(), name: z.string() }),
      timestamp: z.number(),
    }),
  ),
  totalCount: z.number(),
});
export type VotesPage = z.infer<typeof votesPageSchema>;

export const filmPreviewSchema = z
  .object({
    year: z.number().nullable().optional(),
    duration: z.number().nullable().optional(),
    title: z.object({ title: z.string() }).optional(),
    originalTitle: z.object({ title: z.string() }).optional(),
    poster: z.object({ path: z.string() }).optional(),
    genres: z.array(z.object({ name: z.object({ text: z.string() }) })).optional(),
    directors: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
    mainCast: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  })
  .passthrough();
export type FilmPreview = z.infer<typeof filmPreviewSchema>;

export const filmVoteSchema = z
  .object({
    voteId: z.string(),
    rate: z.number(),
    user: z.number(),
    entity: z.number(),
    viewDate: z.number().optional(),
    timestamp: z.number(),
    commentsCount: z.number().optional(),
    likesCount: z.number().optional(),
  })
  .passthrough();
export type FilmVote = z.infer<typeof filmVoteSchema>;
