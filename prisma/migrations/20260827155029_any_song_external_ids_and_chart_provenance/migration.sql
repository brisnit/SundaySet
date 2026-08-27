-- CreateEnum
CREATE TYPE "ChartSource" AS ENUM ('USER_CREATED', 'USER_IMPORTED', 'CHORDPRO', 'AUTOCHART', 'LICENSED_PROVIDER', 'SONGSELECT', 'OTHER');

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalProvider" TEXT,
ADD COLUMN     "isrc" TEXT,
ADD COLUMN     "releaseYear" INTEGER;

-- AlterTable
ALTER TABLE "SongChart" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "editedByUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "ChartSource" NOT NULL DEFAULT 'USER_CREATED',
ADD COLUMN     "sourceCapturedAt" TIMESTAMP(3),
ADD COLUMN     "sourceProvider" TEXT,
ADD COLUMN     "sourceRef" TEXT;

-- CreateIndex
CREATE INDEX "Song_churchId_externalProvider_externalId_idx" ON "Song"("churchId", "externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "Song_churchId_isrc_idx" ON "Song"("churchId", "isrc");
