import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const movies = sqliteTable("movies", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  year: integer("year"),
  duration: integer("duration"),
  posterPath: text("poster_path"),
  genres: text("genres", { mode: "json" }).$type<string[]>(),
  directors: text("directors", { mode: "json" }).$type<string[]>(),
  mainCast: text("main_cast", { mode: "json" }).$type<string[]>(),
  raw: text("raw", { mode: "json" }),
  updatedAt: integer("updated_at").notNull(),
});

export const scores = sqliteTable("scores", {
  movieId: integer("movie_id")
    .primaryKey()
    .references(() => movies.id),
  rate: integer("rate").notNull(),
  viewDate: integer("view_date"),
  voteTimestamp: integer("vote_timestamp"),
  commentsCount: integer("comments_count"),
  likesCount: integer("likes_count"),
  updatedAt: integer("updated_at").notNull(),
});

export const scrapeQueue = sqliteTable("scrape_queue", {
  movieId: integer("movie_id").primaryKey(),
  votedAt: integer("voted_at").notNull(),
  status: text("status", { enum: ["pending", "done", "error"] })
    .notNull()
    .default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  updatedAt: integer("updated_at").notNull(),
});
