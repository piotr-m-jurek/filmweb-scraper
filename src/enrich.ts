import { eq, or } from "drizzle-orm";
import { env } from "./env.js";
import { db } from "./db/client.js";
import { movies, scores, scrapeQueue } from "./db/schema.js";
import { apiGet, closeApiClient, SessionExpiredError } from "./lib/apiClient.js";
import { filmPreviewSchema, filmVoteSchema } from "./lib/filmwebSchemas.js";

const MAX_ATTEMPTS = 3;

async function enrichOne(movieId: number) {
  const [preview, vote] = await Promise.all([
    apiGet(`/api/v1/film/${movieId}/preview`, filmPreviewSchema),
    apiGet(`/api/v1/users/${env.FILMWEB_USER_ID}/votes/film/${movieId}`, filmVoteSchema),
  ]);

  const now = Date.now();
  const title = preview.title?.title ?? preview.originalTitle?.title;
  if (!title) throw new Error(`movie ${movieId} has neither title nor originalTitle`);

  await db
    .insert(movies)
    .values({
      id: movieId,
      title,
      originalTitle: preview.originalTitle?.title,
      year: preview.year,
      duration: preview.duration,
      posterPath: preview.poster?.path,
      genres: preview.genres?.map((g) => g.name.text),
      directors: preview.directors?.map((d) => d.name),
      mainCast: preview.mainCast?.map((c) => c.name),
      raw: preview,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: movies.id,
      set: {
        title,
        originalTitle: preview.originalTitle?.title,
        year: preview.year,
        duration: preview.duration,
        posterPath: preview.poster?.path,
        genres: preview.genres?.map((g) => g.name.text),
        directors: preview.directors?.map((d) => d.name),
        mainCast: preview.mainCast?.map((c) => c.name),
        raw: preview,
        updatedAt: now,
      },
    });

  await db
    .insert(scores)
    .values({
      movieId,
      rate: vote.rate,
      viewDate: vote.viewDate,
      voteTimestamp: vote.timestamp,
      commentsCount: vote.commentsCount,
      likesCount: vote.likesCount,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: scores.movieId,
      set: {
        rate: vote.rate,
        viewDate: vote.viewDate,
        voteTimestamp: vote.timestamp,
        commentsCount: vote.commentsCount,
        likesCount: vote.likesCount,
        updatedAt: now,
      },
    });
}

async function main() {
  const pending = await db
    .select()
    .from(scrapeQueue)
    .where(or(eq(scrapeQueue.status, "pending"), eq(scrapeQueue.status, "error")));

  const todo = pending.filter((row) => row.attempts < MAX_ATTEMPTS);
  console.log(`enriching ${todo.length} movies (${pending.length - todo.length} skipped, over max attempts)`);

  let done = 0;
  await Promise.all(
    todo.map(async (row) => {
      try {
        await enrichOne(row.movieId);
        await db
          .update(scrapeQueue)
          .set({ status: "done", updatedAt: Date.now() })
          .where(eq(scrapeQueue.movieId, row.movieId));
        done += 1;
        if (done % 25 === 0) console.log(`${done}/${todo.length} done`);
      } catch (err) {
        // a dead session fails every in-flight request at once — surface it
        // once and stop, rather than burning each row's retry budget on it
        if (err instanceof SessionExpiredError) throw err;

        await db
          .update(scrapeQueue)
          .set({
            status: "error",
            attempts: row.attempts + 1,
            lastError: err instanceof Error ? err.message : String(err),
            updatedAt: Date.now(),
          })
          .where(eq(scrapeQueue.movieId, row.movieId));
        console.error(`movie ${row.movieId} failed:`, err instanceof Error ? err.message : err);
      }
    }),
  );

  console.log(`done — ${done}/${todo.length} enriched this run`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeApiClient);
