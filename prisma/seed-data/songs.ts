import type {
  Difficulty,
  Familiarity,
  Genre,
  SongType,
  TempoCategory,
} from "../../src/generated/prisma/enums";

/**
 * Seed repertoire for the demo church.
 *
 * Keys and BPMs are typical published values; every church transposes to suit
 * its vocalists, which is exactly what `churchKey` models.
 *
 * CCLI numbers are deliberately absent. Fabricating them would look like a
 * working CCLI integration when none is configured (handoff decision D8), and
 * the adapter interface in lib/integrations is the honest placeholder.
 *
 * Lyrics and chord charts are seeded ONLY for public-domain hymns. Reproducing
 * copyrighted lyrics at scale is real legal exposure (decision D6).
 */
export type SeedSong = {
  title: string;
  artist: string;
  defaultKey: string;
  churchKey?: string;
  bpm: number;
  tempo: TempoCategory;
  types: SongType[];
  genres: Genre[];
  themes: string[];
  difficulty: Difficulty;
  familiarity: Familiarity;
  publicDomain?: boolean;
  /** Approximate popularity signal used by Discover. 0-100. */
  popularity?: number;
};

export const SEED_SONGS: SeedSong[] = [
  // --- Upbeat / opener contemporary -------------------------------------
  { title: "House of the Lord", genres: ["WORSHIP", "POP", "ROCK"], artist: "Phil Wickham", defaultKey: "G", bpm: 140, tempo: "FAST", types: ["UPBEAT"], themes: ["joy", "freedom", "praise"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 94 },
  { title: "This Is Amazing Grace", genres: ["WORSHIP", "ROCK"], artist: "Phil Wickham", defaultKey: "D", churchKey: "C", bpm: 82, tempo: "MEDIUM", types: ["UPBEAT"], themes: ["grace", "power", "salvation"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 88 },
  { title: "Great Things", genres: ["WORSHIP", "POP"], artist: "Phil Wickham", defaultKey: "G", bpm: 76, tempo: "MEDIUM", types: ["UPBEAT"], themes: ["victory", "praise", "faithfulness"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 87 },
  { title: "Praise", genres: ["WORSHIP", "GOSPEL", "POP"], artist: "Elevation Worship", defaultKey: "Bb", churchKey: "A", bpm: 128, tempo: "FAST", types: ["UPBEAT"], themes: ["praise", "joy"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 92 },
  { title: "Raise a Hallelujah", genres: ["WORSHIP", "ROCK"], artist: "Bethel Music", defaultKey: "G", bpm: 72, tempo: "MEDIUM", types: ["UPBEAT"], themes: ["faith", "victory", "warfare"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 85 },
  { title: "Your Grace Is Enough", genres: ["WORSHIP", "ROCK"], artist: "Matt Maher", defaultKey: "G", bpm: 132, tempo: "FAST", types: ["UPBEAT"], themes: ["grace", "mercy"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 74 },
  { title: "My Testimony", genres: ["WORSHIP", "POP"], artist: "Elevation Worship", defaultKey: "Ab", churchKey: "G", bpm: 130, tempo: "FAST", types: ["UPBEAT"], themes: ["testimony", "deliverance"], difficulty: "MODERATE", familiarity: "LEARNING", popularity: 70 },
  { title: "I Thank God", genres: ["WORSHIP", "GOSPEL", "SOUL"], artist: "Maverick City Music", defaultKey: "Bb", churchKey: "A", bpm: 74, tempo: "MEDIUM", types: ["UPBEAT"], themes: ["deliverance", "testimony", "gratitude"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 80 },
  { title: "Champion", genres: ["WORSHIP", "GOSPEL", "POP"], artist: "Bethel Music", defaultKey: "Eb", churchKey: "D", bpm: 74, tempo: "MEDIUM", types: ["UPBEAT"], themes: ["victory", "identity"], difficulty: "MODERATE", familiarity: "NEW", popularity: 66 },
  { title: "Nobody Loves Me Like You", genres: ["WORSHIP", "POP"], artist: "Chris Tomlin", defaultKey: "A", bpm: 124, tempo: "FAST", types: ["UPBEAT"], themes: ["love", "gratitude"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 63 },
  { title: "Only King Forever", genres: ["WORSHIP", "ROCK"], artist: "Elevation Worship", defaultKey: "A", bpm: 78, tempo: "MEDIUM", types: ["UPBEAT"], themes: ["sovereignty", "strength"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 61 },
  { title: "Battle Belongs", genres: ["WORSHIP", "POP"], artist: "Phil Wickham", defaultKey: "B", churchKey: "A", bpm: 76, tempo: "MEDIUM", types: ["UPBEAT"], themes: ["trust", "victory", "warfare"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 89 },

  // --- Mid-tempo core -----------------------------------------------------
  { title: "10,000 Reasons (Bless the Lord)", genres: ["WORSHIP", "ACOUSTIC"], artist: "Matt Redman", defaultKey: "G", bpm: 73, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["praise", "blessing", "worship"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 90 },
  { title: "Goodness of God", genres: ["WORSHIP", "POP"], artist: "Bethel Music", defaultKey: "Ab", churchKey: "G", bpm: 63, tempo: "SLOW", types: ["MID_TEMPO", "RESPONSE"], themes: ["faithfulness", "goodness", "testimony"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 95 },
  { title: "Graves Into Gardens", genres: ["WORSHIP", "GOSPEL", "POP"], artist: "Elevation Worship", defaultKey: "Ab", churchKey: "G", bpm: 70, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["redemption", "restoration", "hope"], difficulty: "MODERATE", familiarity: "CORE", popularity: 86 },
  { title: "Great Are You Lord", genres: ["WORSHIP", "ACOUSTIC"], artist: "All Sons & Daughters", defaultKey: "G", bpm: 72, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["breath", "praise", "restoration"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 78 },
  { title: "Build My Life", genres: ["WORSHIP", "POP"], artist: "Pat Barrett", defaultKey: "E", churchKey: "D", bpm: 68, tempo: "MEDIUM", types: ["MID_TEMPO", "RESPONSE"], themes: ["surrender", "foundation", "love"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 84 },
  { title: "Same God", genres: ["WORSHIP", "GOSPEL"], artist: "Elevation Worship", defaultKey: "C", bpm: 68, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["faithfulness", "prayer", "provision"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 88 },
  { title: "Way Maker", genres: ["WORSHIP", "GOSPEL", "SOUL"], artist: "Sinach", defaultKey: "E", churchKey: "D", bpm: 70, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["presence", "miracle", "faithfulness"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 91 },
  { title: "What a Beautiful Name", genres: ["WORSHIP", "POP"], artist: "Hillsong Worship", defaultKey: "D", bpm: 68, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["name of Jesus", "incarnation", "resurrection"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 93 },
  { title: "King of Kings", genres: ["WORSHIP", "POP"], artist: "Hillsong Worship", defaultKey: "D", bpm: 72, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["gospel", "resurrection", "incarnation"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 89 },
  { title: "Living Hope", genres: ["WORSHIP", "ROCK"], artist: "Phil Wickham", defaultKey: "Bb", churchKey: "A", bpm: 68, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["resurrection", "salvation", "hope"], difficulty: "MODERATE", familiarity: "CORE", popularity: 90 },
  { title: "Trust in God", genres: ["WORSHIP", "GOSPEL"], artist: "Elevation Worship", defaultKey: "Ab", churchKey: "G", bpm: 72, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["trust", "faithfulness", "deliverance"], difficulty: "MODERATE", familiarity: "LEARNING", popularity: 76 },
  { title: "Firm Foundation (He Won't)", genres: ["WORSHIP", "POP"], artist: "Cody Carnes", defaultKey: "A", bpm: 76, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["trust", "foundation", "faithfulness"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 82 },
  { title: "Holy Forever", genres: ["WORSHIP", "POP"], artist: "Chris Tomlin", defaultKey: "C", bpm: 72, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["holiness", "eternity", "worthy"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 83 },
  { title: "Who You Say I Am", genres: ["WORSHIP", "POP"], artist: "Hillsong Worship", defaultKey: "F", bpm: 70, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["identity", "freedom", "adoption"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 79 },
  { title: "Death Was Arrested", genres: ["WORSHIP", "ACOUSTIC"], artist: "North Point Worship", defaultKey: "G", bpm: 70, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["redemption", "freedom", "grace"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 68 },
  { title: "Cornerstone", genres: ["WORSHIP", "TRADITIONAL"], artist: "Hillsong Worship", defaultKey: "C", bpm: 70, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["hope", "foundation", "assurance"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 77 },
  { title: "Yet Not I But Through Christ in Me", genres: ["WORSHIP", "FOLK", "ACOUSTIC"], artist: "CityAlight", defaultKey: "D", bpm: 76, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["gospel", "perseverance", "assurance"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 75 },
  { title: "Christ Our Hope in Life and Death", genres: ["WORSHIP", "TRADITIONAL"], artist: "Keith & Kristyn Getty", defaultKey: "G", bpm: 72, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["hope", "death", "assurance"], difficulty: "SIMPLE", familiarity: "NEW", popularity: 64 },
  { title: "Available", genres: ["WORSHIP", "POP"], artist: "Elevation Worship", defaultKey: "B", churchKey: "A", bpm: 74, tempo: "MEDIUM", types: ["MID_TEMPO", "RESPONSE"], themes: ["surrender", "obedience"], difficulty: "MODERATE", familiarity: "NEW", popularity: 60 },
  { title: "Holy Water", genres: ["WORSHIP", "FOLK", "ROCK"], artist: "We The Kingdom", defaultKey: "G", bpm: 74, tempo: "MEDIUM", types: ["MID_TEMPO"], themes: ["mercy", "cleansing", "grace"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 69 },

  // --- Reflective / response ---------------------------------------------
  { title: "Gratitude", genres: ["WORSHIP", "POP"], artist: "Brandon Lake", defaultKey: "D", bpm: 70, tempo: "SLOW", types: ["REFLECTIVE", "RESPONSE"], themes: ["thankfulness", "surrender", "worship"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 90 },
  { title: "O Praise the Name (Anástasis)", genres: ["WORSHIP", "ROCK"], artist: "Hillsong Worship", defaultKey: "A", bpm: 70, tempo: "SLOW", types: ["REFLECTIVE"], themes: ["cross", "resurrection", "praise"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 81 },
  { title: "Jireh", genres: ["WORSHIP", "GOSPEL", "RNB"], artist: "Maverick City Music", defaultKey: "Ab", churchKey: "G", bpm: 66, tempo: "SLOW", types: ["REFLECTIVE"], themes: ["provision", "enough", "identity"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 84 },
  { title: "Promises", genres: ["WORSHIP", "GOSPEL", "SOUL"], artist: "Maverick City Music", defaultKey: "Ab", churchKey: "G", bpm: 66, tempo: "SLOW", types: ["REFLECTIVE", "RESPONSE"], themes: ["faithfulness", "promises", "trust"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 78 },
  { title: "Rest on Us", genres: ["WORSHIP", "GOSPEL", "SOUL"], artist: "Maverick City Music", defaultKey: "C", bpm: 64, tempo: "SLOW", types: ["REFLECTIVE", "PRAYER"], themes: ["holy spirit", "presence"], difficulty: "MODERATE", familiarity: "NEW", popularity: 58 },
  { title: "Tremble", genres: ["WORSHIP", "ALTERNATIVE"], artist: "Mosaic MSC", defaultKey: "C", bpm: 68, tempo: "SLOW", types: ["REFLECTIVE", "PRAYER"], themes: ["peace", "presence", "fear"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 62 },

  // --- Communion ----------------------------------------------------------
  { title: "Remembrance", genres: ["WORSHIP", "ACOUSTIC"], artist: "Matt Maher", defaultKey: "G", bpm: 72, tempo: "MEDIUM", types: ["COMMUNION", "REFLECTIVE"], themes: ["communion", "cross", "remembrance"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 65 },
  { title: "Broken Vessels (Amazing Grace)", genres: ["WORSHIP", "TRADITIONAL"], artist: "Hillsong Worship", defaultKey: "G", bpm: 72, tempo: "MEDIUM", types: ["COMMUNION", "MID_TEMPO"], themes: ["grace", "healing", "communion"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 60 },

  // --- Easter -------------------------------------------------------------
  { title: "Because He Lives (Amen)", genres: ["WORSHIP", "POP"], artist: "Matt Maher", defaultKey: "A", bpm: 74, tempo: "MEDIUM", types: ["EASTER", "UPBEAT"], themes: ["resurrection", "hope", "life"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 72 },
  { title: "Resurrecting", genres: ["WORSHIP", "GOSPEL"], artist: "Elevation Worship", defaultKey: "G", bpm: 68, tempo: "MEDIUM", types: ["EASTER", "MID_TEMPO"], themes: ["resurrection", "victory"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 67 },
  { title: "Forever (We Sing Hallelujah)", genres: ["WORSHIP", "ROCK"], artist: "Kari Jobe", defaultKey: "G", bpm: 74, tempo: "MEDIUM", types: ["EASTER", "UPBEAT"], themes: ["resurrection", "victory", "praise"], difficulty: "MODERATE", familiarity: "FAMILIAR", popularity: 66 },

  // --- Christmas / Advent -------------------------------------------------
  { title: "Behold (Then Sings My Soul)", genres: ["WORSHIP", "ACOUSTIC"], artist: "Phil Wickham", defaultKey: "C", bpm: 70, tempo: "MEDIUM", types: ["CHRISTMAS", "REFLECTIVE"], themes: ["incarnation", "wonder"], difficulty: "MODERATE", familiarity: "NEW", popularity: 59 },
  { title: "Joy to the World (Unspeakable Joy)", genres: ["WORSHIP", "POP", "TRADITIONAL"], artist: "Chris Tomlin", defaultKey: "D", bpm: 120, tempo: "FAST", types: ["CHRISTMAS", "UPBEAT"], themes: ["joy", "incarnation"], difficulty: "SIMPLE", familiarity: "FAMILIAR", popularity: 70 },

  // --- Hymns (15) ---------------------------------------------------------
  { title: "Amazing Grace (My Chains Are Gone)", genres: ["WORSHIP", "TRADITIONAL"], artist: "Chris Tomlin", defaultKey: "G", bpm: 72, tempo: "MEDIUM", types: ["HYMN"], themes: ["grace", "freedom", "salvation"], difficulty: "SIMPLE", familiarity: "CORE", publicDomain: true, popularity: 88 },
  { title: "Blessed Assurance", genres: ["TRADITIONAL", "GOSPEL"], artist: "Fanny Crosby", defaultKey: "D", bpm: 88, tempo: "MEDIUM", types: ["HYMN"], themes: ["assurance", "hope", "testimony"], difficulty: "SIMPLE", familiarity: "CORE", publicDomain: true, popularity: 55 },
  { title: "Great Is Thy Faithfulness", genres: ["TRADITIONAL", "WORSHIP"], artist: "Thomas Chisholm", defaultKey: "Db", churchKey: "C", bpm: 76, tempo: "MEDIUM", types: ["HYMN"], themes: ["faithfulness", "provision", "mercy"], difficulty: "MODERATE", familiarity: "CORE", popularity: 62 },
  { title: "How Great Thou Art", genres: ["TRADITIONAL", "WORSHIP"], artist: "Stuart K. Hine", defaultKey: "Bb", churchKey: "A", bpm: 72, tempo: "MEDIUM", types: ["HYMN"], themes: ["majesty", "creation", "awe"], difficulty: "SIMPLE", familiarity: "CORE", popularity: 64 },
  { title: "Come Thou Fount of Every Blessing", genres: ["TRADITIONAL", "FOLK"], artist: "Robert Robinson", defaultKey: "D", bpm: 80, tempo: "MEDIUM", types: ["HYMN"], themes: ["grace", "wandering", "praise"], difficulty: "SIMPLE", familiarity: "FAMILIAR", publicDomain: true, popularity: 58 },
  { title: "Holy, Holy, Holy", genres: ["TRADITIONAL", "CLASSICAL"], artist: "Reginald Heber", defaultKey: "Eb", churchKey: "D", bpm: 84, tempo: "MEDIUM", types: ["HYMN"], themes: ["holiness", "trinity", "majesty"], difficulty: "SIMPLE", familiarity: "FAMILIAR", publicDomain: true, popularity: 52 },
  { title: "It Is Well With My Soul", genres: ["TRADITIONAL", "WORSHIP"], artist: "Horatio Spafford", defaultKey: "C", bpm: 76, tempo: "SLOW", types: ["HYMN", "REFLECTIVE"], themes: ["peace", "suffering", "trust"], difficulty: "SIMPLE", familiarity: "CORE", publicDomain: true, popularity: 60 },
  { title: "Be Thou My Vision", genres: ["TRADITIONAL", "FOLK"], artist: "Traditional Irish", defaultKey: "Eb", churchKey: "D", bpm: 78, tempo: "MEDIUM", types: ["HYMN"], themes: ["vision", "guidance", "devotion"], difficulty: "SIMPLE", familiarity: "FAMILIAR", publicDomain: true, popularity: 56 },
  { title: "Crown Him With Many Crowns", genres: ["TRADITIONAL", "CLASSICAL"], artist: "Matthew Bridges", defaultKey: "D", bpm: 88, tempo: "MEDIUM", types: ["HYMN"], themes: ["majesty", "kingship", "praise"], difficulty: "MODERATE", familiarity: "NEW", publicDomain: true, popularity: 45 },
  { title: "All Hail the Power of Jesus' Name", genres: ["TRADITIONAL", "CLASSICAL"], artist: "Edward Perronet", defaultKey: "G", bpm: 86, tempo: "MEDIUM", types: ["HYMN"], themes: ["kingship", "praise", "majesty"], difficulty: "SIMPLE", familiarity: "NEW", publicDomain: true, popularity: 43 },
  { title: "Nothing But the Blood", genres: ["TRADITIONAL", "GOSPEL"], artist: "Robert Lowry", defaultKey: "G", bpm: 92, tempo: "MEDIUM", types: ["HYMN", "COMMUNION"], themes: ["cross", "cleansing", "redemption"], difficulty: "SIMPLE", familiarity: "FAMILIAR", publicDomain: true, popularity: 50 },
  { title: "Jesus Paid It All", genres: ["TRADITIONAL", "GOSPEL"], artist: "Elvina Hall", defaultKey: "G", bpm: 74, tempo: "MEDIUM", types: ["HYMN", "COMMUNION"], themes: ["cross", "grace", "redemption"], difficulty: "SIMPLE", familiarity: "FAMILIAR", publicDomain: true, popularity: 54 },
  { title: "Christ the Lord Is Risen Today", genres: ["TRADITIONAL", "CLASSICAL"], artist: "Charles Wesley", defaultKey: "C", bpm: 96, tempo: "FAST", types: ["HYMN", "EASTER"], themes: ["resurrection", "victory", "praise"], difficulty: "SIMPLE", familiarity: "FAMILIAR", publicDomain: true, popularity: 48 },
  { title: "Come Thou Long Expected Jesus", genres: ["TRADITIONAL", "CLASSICAL"], artist: "Charles Wesley", defaultKey: "G", bpm: 80, tempo: "MEDIUM", types: ["HYMN", "ADVENT"], themes: ["advent", "hope", "waiting"], difficulty: "SIMPLE", familiarity: "NEW", publicDomain: true, popularity: 41 },
  { title: "O Come All Ye Faithful", genres: ["TRADITIONAL", "CLASSICAL"], artist: "John Francis Wade", defaultKey: "G", bpm: 92, tempo: "MEDIUM", types: ["HYMN", "CHRISTMAS"], themes: ["incarnation", "adoration", "joy"], difficulty: "SIMPLE", familiarity: "FAMILIAR", publicDomain: true, popularity: 57 },
];

/**
 * Chord charts for public-domain hymns only. Structured sections so the future
 * transposition engine has something real to operate on.
 */
export const SEED_CHARTS: Record<
  string,
  { key: string; capo?: number; sections: Array<{ label: string; type: string; lines: Array<{ chords: string; lyrics: string }> }> }
> = {
  "Blessed Assurance": {
    key: "D",
    sections: [
      {
        label: "Verse 1",
        type: "VERSE",
        lines: [
          { chords: "D          D/F#      G      D", lyrics: "Blessed assurance, Jesus is mine" },
          { chords: "D             A7            D", lyrics: "Oh what a foretaste of glory divine" },
          { chords: "D        D7      G          D", lyrics: "Heir of salvation, purchase of God" },
          { chords: "D            A7             D", lyrics: "Born of His Spirit, washed in His blood" },
        ],
      },
      {
        label: "Chorus",
        type: "CHORUS",
        lines: [
          { chords: "A7              D", lyrics: "This is my story, this is my song" },
          { chords: "G            D    A7", lyrics: "Praising my Savior all the day long" },
        ],
      },
    ],
  },
  "It Is Well With My Soul": {
    key: "C",
    sections: [
      {
        label: "Verse 1",
        type: "VERSE",
        lines: [
          { chords: "C              F        C", lyrics: "When peace like a river attendeth my way" },
          { chords: "C              G7", lyrics: "When sorrows like sea billows roll" },
          { chords: "C            F         C", lyrics: "Whatever my lot, Thou hast taught me to say" },
          { chords: "C        G7        C", lyrics: "It is well, it is well with my soul" },
        ],
      },
      {
        label: "Chorus",
        type: "CHORUS",
        lines: [
          { chords: "C                G7", lyrics: "It is well with my soul" },
          { chords: "C       G7      C", lyrics: "It is well, it is well with my soul" },
        ],
      },
    ],
  },
  "Come Thou Fount of Every Blessing": {
    key: "D",
    capo: 2,
    sections: [
      {
        label: "Verse 1",
        type: "VERSE",
        lines: [
          { chords: "D           G      D", lyrics: "Come Thou Fount of every blessing" },
          { chords: "A            D    A", lyrics: "Tune my heart to sing Thy grace" },
          { chords: "D           G       D", lyrics: "Streams of mercy never ceasing" },
          { chords: "Bm       A       D", lyrics: "Call for songs of loudest praise" },
        ],
      },
    ],
  },
  "Be Thou My Vision": {
    key: "Eb",
    sections: [
      {
        label: "Verse 1",
        type: "VERSE",
        lines: [
          { chords: "Eb        Bb      Cm      Ab", lyrics: "Be Thou my vision, O Lord of my heart" },
          { chords: "Eb        Bb        Ab   Eb", lyrics: "Naught be all else to me, save that Thou art" },
        ],
      },
    ],
  },
};
