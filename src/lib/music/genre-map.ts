import type { Genre } from "@/generated/prisma/enums";

/**
 * Provider tags to SetMeister genres.
 *
 * MusicBrainz alone carries thousands of community tags — "melodic death
 * metal", "third stream", "shoegaze". Storing them raw would make our own
 * `Genre` enum meaningless within a week, so the adapter maps what it
 * recognises and silently drops the rest. An empty genre list is a perfectly
 * good outcome; a wrong one is not.
 */
const MAP: ReadonlyArray<[RegExp, Genre]> = [
  [/\b(worship|praise|ccm|contemporary christian)\b/, "WORSHIP"],
  [/\b(gospel|spiritual)\b/, "GOSPEL"],
  [/\b(hymn|traditional|sacred|choral)\b/, "TRADITIONAL"],
  [/\b(hip.?hop|rap|trap)\b/, "HIP_HOP"],
  [/\br&b\b|\brnb\b|\brhythm and blues\b/, "RNB"],
  [/\bsoul\b/, "SOUL"],
  [/\bfunk\b/, "FUNK"],
  [/\bcountry\b|\bbluegrass\b|\bamericana\b/, "COUNTRY"],
  [/\bfolk\b|\bsinger.?songwriter\b/, "FOLK"],
  [/\bacoustic\b|\bunplugged\b/, "ACOUSTIC"],
  [/\bjazz\b|\bswing\b|\bbebop\b/, "JAZZ"],
  [/\bblues\b/, "BLUES"],
  [/\b(electronic|edm|house|techno|synth.?pop|dance)\b/, "ELECTRONIC"],
  [/\b(classical|baroque|orchestral|romantic)\b/, "CLASSICAL"],
  [/\bindie\b/, "INDIE"],
  [/\b(alternative|alt.?rock|grunge|post.?punk)\b/, "ALTERNATIVE"],
  [/\b(rock|metal|punk)\b/, "ROCK"],
  [/\bpop\b/, "POP"],
];

/**
 * Order matters: the list runs specific before general, so "synth-pop" lands on
 * ELECTRONIC and "alt-rock" on ALTERNATIVE rather than both collapsing to POP
 * and ROCK. First match per tag wins.
 */
export function mapGenres(tags: string[]): Genre[] {
  const out = new Set<Genre>();
  for (const raw of tags) {
    const tag = raw.toLowerCase().trim();
    if (!tag) continue;
    for (const [pattern, genre] of MAP) {
      if (pattern.test(tag)) {
        out.add(genre);
        break;
      }
    }
  }
  // Four is plenty on a card, and the order is the enum's, not the provider's.
  return [...out].slice(0, 4);
}
