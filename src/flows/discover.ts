import { env } from "../env.js";
import { db } from "../db/client.js";
import { scrapeQueue } from "../db/schema.js";
import { apiGet, closeApiClient } from "../lib/apiClient.js";
import { votesPageSchema } from "../lib/filmwebSchemas.js";

const PAGE_SIZE = 48;

async function fetchVotesPage(page: number) {
  const path = `/api/v1/users/${env.FILMWEB_USER_ID}/votes/film`;
  const params: Record<string, string | number> = { pageSize: PAGE_SIZE };
  if (page > 1) params.page = page;
  return apiGet(path, votesPageSchema, params);
}

async function main() {
  let page = 1;
  let seen = 0;
  let totalCount = Infinity;

  while (seen < totalCount) {
    const data = await fetchVotesPage(page);
    totalCount = data.totalCount;

    for (const vote of data.votes) {
      await db
        .insert(scrapeQueue)
        .values({
          movieId: vote.id.id,
          votedAt: vote.timestamp,
          updatedAt: Date.now(),
        })
        .onConflictDoUpdate({
          target: scrapeQueue.movieId,
          set: { votedAt: vote.timestamp, updatedAt: Date.now() },
        });
    }

    seen += data.votes.length;
    console.log(`page ${page}: ${seen}/${totalCount} film ids discovered`);

    if (data.votes.length === 0) break; // safety net against an infinite loop
    page += 1;
  }

  console.log(`done — ${seen} film ids in scrape_queue`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeApiClient);
