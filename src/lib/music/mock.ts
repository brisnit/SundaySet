import type { Genre } from "@/generated/prisma/enums";

import type { ExternalSong, SearchOptions, SongSearchProvider } from "./types";

/**
 * A tiny fixed catalogue, used by tests and by any environment without a
 * MUSICBRAINZ_CONTACT set.
 *
 * It exists so search is always demonstrable and always testable without
 * reaching the network. Deliberately spans several genres and decades, because
 * the whole premise of Any Song is that it is not a worship-only tool.
 */
export const MOCK_CATALOGUE: ExternalSong[] = [
  {
    provider: "mock", externalId: "mock-purple-rain",
    title: "Purple Rain", artist: "Prince", album: "Purple Rain",
    releaseYear: 1984, durationMs: 520000, isrc: "USWB19902312",
    genres: ["ROCK", "POP", "RNB"],
  },
  {
    provider: "mock", externalId: "mock-a-change-is-gonna-come",
    title: "A Change Is Gonna Come", artist: "Sam Cooke", album: "Ain't That Good News",
    releaseYear: 1964, durationMs: 191000, genres: ["SOUL", "GOSPEL"],
  },
  {
    provider: "mock", externalId: "mock-jolene",
    title: "Jolene", artist: "Dolly Parton", album: "Jolene",
    releaseYear: 1974, durationMs: 162000, genres: ["COUNTRY", "FOLK"],
  },
  {
    provider: "mock", externalId: "mock-take-five",
    title: "Take Five", artist: "The Dave Brubeck Quartet", album: "Time Out",
    releaseYear: 1959, durationMs: 324000, genres: ["JAZZ"],
  },
  {
    provider: "mock", externalId: "mock-amazing-grace",
    title: "Amazing Grace", artist: "Traditional",
    releaseYear: 1779, genres: ["TRADITIONAL", "WORSHIP"],
  },
  {
    provider: "mock", externalId: "mock-superstition",
    title: "Superstition", artist: "Stevie Wonder", album: "Talking Book",
    releaseYear: 1972, durationMs: 265000, genres: ["FUNK", "SOUL"],
  },
  {
    provider: "mock", externalId: "mock-the-times-they-are-a-changin",
    title: "The Times They Are a-Changin'", artist: "Bob Dylan",
    album: "The Times They Are a-Changin'", releaseYear: 1964,
    durationMs: 195000, genres: ["FOLK"],
  },
  {
    provider: "mock", externalId: "mock-house-of-the-lord",
    title: "House of the Lord", artist: "Phil Wickham", album: "Hymn of Heaven",
    releaseYear: 2021, durationMs: 231000, genres: ["WORSHIP"],
  },
];

export function createMockProvider(
  catalogue: ExternalSong[] = MOCK_CATALOGUE,
): SongSearchProvider {
  return {
    name: "mock",
    async search(query: string, { limit }: SearchOptions) {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return catalogue
        .filter(
          (s) =>
            s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
        )
        .slice(0, limit);
    },

    async browseGenre(genre: Genre, { limit }: SearchOptions) {
      return catalogue.filter((s) => s.genres?.includes(genre)).slice(0, limit);
    },
  };
}
