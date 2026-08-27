export type SeedMember = {
  name: string;
  email: string;
  positions: string[];
  vocalRange?: string;
  preferredPerMonth: number;
  notes?: string;
};

export const SEED_TEAM: SeedMember[] = [
  { name: "Britt Hollis", email: "britt@northminster.example", positions: ["Leader", "Acoustic Guitar", "Electric Guitar", "Vocal"], vocalRange: "Baritone (A2–A4)", preferredPerMonth: 4, notes: "Leads most Sundays. Prefers keys of G, D and A." },
  { name: "Naomi Carter", email: "naomi@northminster.example", positions: ["Leader", "Vocal", "Keys"], vocalRange: "Alto (F3–D5)", preferredPerMonth: 2, notes: "Leads once or twice a month." },
  { name: "Mike Alvarez", email: "mike@northminster.example", positions: ["Electric Guitar", "Acoustic Guitar"], preferredPerMonth: 3 },
  { name: "Sarah Kim", email: "sarah@northminster.example", positions: ["Acoustic Guitar", "Vocal"], vocalRange: "Soprano (A3–E5)", preferredPerMonth: 3 },
  { name: "David Osei", email: "david@northminster.example", positions: ["Bass"], preferredPerMonth: 2 },
  { name: "Marcus Bell", email: "marcus@northminster.example", positions: ["Bass", "Vocal"], vocalRange: "Tenor (C3–G4)", preferredPerMonth: 2 },
  { name: "James Whitfield", email: "james@northminster.example", positions: ["Drums"], preferredPerMonth: 3 },
  { name: "Eric Vance", email: "eric@northminster.example", positions: ["Drums", "Percussion"], preferredPerMonth: 2 },
  { name: "Amy Nakamura", email: "amy@northminster.example", positions: ["Keys", "Vocal"], vocalRange: "Mezzo (G3–C5)", preferredPerMonth: 3 },
  { name: "Priya Raman", email: "priya@northminster.example", positions: ["Keys"], preferredPerMonth: 2, notes: "Available most Sundays after 9am." },
  { name: "Rachel Boone", email: "rachel@northminster.example", positions: ["Vocal"], vocalRange: "Soprano (Bb3–F5)", preferredPerMonth: 3 },
  { name: "Tomás Iglesias", email: "tomas@northminster.example", positions: ["Vocal", "Acoustic Guitar"], vocalRange: "Tenor (D3–A4)", preferredPerMonth: 2 },
  { name: "Chris Delgado", email: "chris@northminster.example", positions: ["Sound"], preferredPerMonth: 4, notes: "Runs the board almost every week." },
  { name: "Angela Ruiz", email: "angela@northminster.example", positions: ["Slides", "Camera"], preferredPerMonth: 3 },
  { name: "Jessica Tran", email: "jessica@northminster.example", positions: ["Livestream", "Camera", "Slides"], preferredPerMonth: 2 },
];

export const WORSHIP_POSITIONS = [
  "Leader",
  "Acoustic Guitar",
  "Electric Guitar",
  "Bass",
  "Drums",
  "Keys",
  "Vocal",
  "Percussion",
];

export const TECH_POSITIONS = ["Sound", "Slides", "Livestream", "Lighting", "Camera"];

/** Songs shown in Discover that the church has NOT added yet. */
export const DISCOVER_EXTRAS = [
  { title: "Hard Fought Hallelujah", artist: "Brandon Lake", defaultKey: "C", bpm: 78, themes: ["perseverance", "victory", "faith"], types: ["UPBEAT"], popularity: 97 },
  { title: "That's Who I Praise", artist: "Brandon Lake", defaultKey: "Bb", bpm: 130, themes: ["praise", "deliverance"], types: ["UPBEAT"], popularity: 93 },
  { title: "Send Me", artist: "Elevation Worship", defaultKey: "G", bpm: 72, themes: ["surrender", "calling", "mission"], types: ["MID_TEMPO", "RESPONSE"], popularity: 86 },
  { title: "Confidence", artist: "Sanctus Real", defaultKey: "D", bpm: 76, themes: ["faith", "courage"], types: ["MID_TEMPO"], popularity: 61 },
  { title: "Honey in the Rock", artist: "Brooke Ligertwood", defaultKey: "E", bpm: 132, themes: ["provision", "praise"], types: ["UPBEAT"], popularity: 79 },
  { title: "God Really Loves Us", artist: "Crowder", defaultKey: "A", bpm: 126, themes: ["love", "grace"], types: ["UPBEAT"], popularity: 72 },
  { title: "The Blessing", artist: "Kari Jobe & Cody Carnes", defaultKey: "B", bpm: 64, themes: ["blessing", "benediction", "family"], types: ["RESPONSE", "REFLECTIVE"], popularity: 90 },
  { title: "O Come to the Altar", artist: "Elevation Worship", defaultKey: "B", bpm: 74, themes: ["repentance", "grace", "invitation"], types: ["RESPONSE"], popularity: 76 },
  { title: "Living Water", artist: "Elevation Worship", defaultKey: "Ab", bpm: 68, themes: ["renewal", "spirit"], types: ["MID_TEMPO"], popularity: 64 },
  { title: "Worthy of It All", artist: "CeCe Winans", defaultKey: "G", bpm: 66, themes: ["adoration", "worthy"], types: ["REFLECTIVE"], popularity: 70 },
  { title: "Hymn of Heaven", artist: "Phil Wickham", defaultKey: "G", bpm: 72, themes: ["heaven", "hope", "eternity"], types: ["MID_TEMPO"], popularity: 82 },
  { title: "Lord I Need You", artist: "Matt Maher", defaultKey: "G", bpm: 72, themes: ["dependence", "grace", "need"], types: ["MID_TEMPO", "PRAYER"], popularity: 74 },
];
