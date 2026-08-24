-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'WORSHIP_LEADER', 'TEAM_LEADER', 'MUSICIAN', 'TECH', 'PASTOR');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MusicalStyle" AS ENUM ('CONTEMPORARY', 'ROCK', 'COUNTRY', 'GOSPEL', 'TRADITIONAL', 'ACOUSTIC', 'MODERN_HYMNS');

-- CreateEnum
CREATE TYPE "HymnPreference" AS ENUM ('NONE', 'ONE_PER_WEEK', 'OCCASIONALLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('SIMPLE', 'MODERATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "TempoCategory" AS ENUM ('FAST', 'MEDIUM', 'SLOW');

-- CreateEnum
CREATE TYPE "SongType" AS ENUM ('UPBEAT', 'MID_TEMPO', 'REFLECTIVE', 'HYMN', 'COMMUNION', 'EASTER', 'CHRISTMAS', 'ADVENT', 'RESPONSE', 'BAPTISM', 'PRAYER', 'OFFERING');

-- CreateEnum
CREATE TYPE "Familiarity" AS ENUM ('NEW', 'LEARNING', 'FAMILIAR', 'CORE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SongStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ChartFormat" AS ENUM ('PLAIN', 'STRUCTURED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PDF', 'IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'READY', 'INVITATIONS_SENT', 'CONFIRMED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SpecialDateKind" AS ENUM ('LITURGICAL', 'CHURCH_EVENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PositionCategory" AS ENUM ('WORSHIP', 'TECH', 'OTHER');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'INVITED', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAYBE');

-- CreateEnum
CREATE TYPE "AiContextType" AS ENUM ('GLOBAL', 'SERVICE', 'SONG', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "AiPlanKind" AS ENUM ('SET', 'MULTI_WEEK', 'TEAM');

-- CreateEnum
CREATE TYPE "AiPlanStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('INVITATION', 'ACCEPTANCE', 'DECLINE', 'AVAILABILITY_REQUEST', 'SCHEDULE_UPDATED', 'SET_UPDATED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RecommendationKind" AS ENUM ('HOT_NEW', 'SIMILAR', 'FOR_YOU');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MUSICIAN',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorshipProfile" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "styles" "MusicalStyle"[],
    "songsPerService" INTEGER NOT NULL DEFAULT 4,
    "setStructure" TEXT[],
    "hymnPreference" "HymnPreference" NOT NULL DEFAULT 'OCCASIONALLY',
    "hymnCustomNote" TEXT,
    "repeatWindowWeeks" INTEGER NOT NULL DEFAULT 8,
    "preferredArtists" TEXT[],
    "avoidArtists" TEXT[],
    "avoidSongs" TEXT[],
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MODERATE',
    "vocalRangeNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorshipProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogSong" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "ccliNumber" TEXT,
    "defaultKey" TEXT,
    "bpm" INTEGER,
    "tempoCategory" "TempoCategory",
    "songTypes" "SongType"[],
    "themes" TEXT[],
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MODERATE',
    "artworkSeed" TEXT,
    "spotifyUrl" TEXT,
    "appleMusicUrl" TEXT,
    "youtubeUrl" TEXT,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "releasedOn" DATE,
    "isPublicDomain" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "catalogSongId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "ccliNumber" TEXT,
    "defaultKey" TEXT,
    "churchKey" TEXT,
    "alternateKeys" TEXT[],
    "bpm" INTEGER,
    "tempoCategory" "TempoCategory",
    "songTypes" "SongType"[],
    "themes" TEXT[],
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MODERATE',
    "leadVocalistPreference" TEXT,
    "lyrics" TEXT,
    "notes" TEXT,
    "spotifyUrl" TEXT,
    "appleMusicUrl" TEXT,
    "youtubeUrl" TEXT,
    "familiarity" "Familiarity" NOT NULL DEFAULT 'NEW',
    "status" "SongStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastPlayedOn" DATE,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongChart" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "format" "ChartFormat" NOT NULL DEFAULT 'PLAIN',
    "key" TEXT,
    "capo" INTEGER,
    "sections" JSONB,
    "bodyText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongAttachment" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'PDF',
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongUsage" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "serviceId" TEXT,
    "playedOn" DATE NOT NULL,
    "key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL DEFAULT 0,
    "defaultStartTime" TEXT NOT NULL DEFAULT '10:00',
    "defaultCallTime" TEXT NOT NULL DEFAULT '08:30',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "serviceTypeId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '10:00',
    "callTime" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "specialDateId" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "aiPlanRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sermon" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "title" TEXT,
    "scripture" TEXT,
    "series" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "inferredThemes" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sermon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSong" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "key" TEXT,
    "notes" TEXT,
    "addedByAi" BOOLEAN NOT NULL DEFAULT false,
    "aiReason" TEXT,

    CONSTRAINT "ServiceSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDate" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SpecialDateKind" NOT NULL DEFAULT 'CHURCH_EVENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "vocalRange" TEXT,
    "preferredPerMonth" INTEGER NOT NULL DEFAULT 2,
    "preferredServiceTypeId" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PositionCategory" NOT NULL DEFAULT 'WORSHIP',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberPosition" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamMemberPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "callTime" TEXT,
    "notes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "channel" "InvitationChannel" NOT NULL DEFAULT 'EMAIL',
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockoutDate" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockoutDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRequest" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "contextType" "AiContextType" NOT NULL DEFAULT 'GLOBAL',
    "contextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPlanRun" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AiPlanKind" NOT NULL,
    "status" "AiPlanStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "warnings" JSONB,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPlanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "subject" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "teamMemberId" TEXT,
    "serviceId" TEXT,
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "catalogSongId" TEXT NOT NULL,
    "kind" "RecommendationKind" NOT NULL DEFAULT 'FOR_YOU',
    "score" INTEGER NOT NULL DEFAULT 0,
    "reasons" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Church_slug_key" ON "Church"("slug");

-- CreateIndex
CREATE INDEX "Membership_churchId_idx" ON "Membership"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_churchId_key" ON "Membership"("userId", "churchId");

-- CreateIndex
CREATE UNIQUE INDEX "WorshipProfile_churchId_key" ON "WorshipProfile"("churchId");

-- CreateIndex
CREATE INDEX "CatalogSong_popularity_idx" ON "CatalogSong"("popularity");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSong_title_artist_key" ON "CatalogSong"("title", "artist");

-- CreateIndex
CREATE INDEX "Song_churchId_status_idx" ON "Song"("churchId", "status");

-- CreateIndex
CREATE INDEX "Song_churchId_lastPlayedOn_idx" ON "Song"("churchId", "lastPlayedOn");

-- CreateIndex
CREATE INDEX "Song_churchId_familiarity_idx" ON "Song"("churchId", "familiarity");

-- CreateIndex
CREATE UNIQUE INDEX "Song_churchId_title_artist_key" ON "Song"("churchId", "title", "artist");

-- CreateIndex
CREATE UNIQUE INDEX "SongChart_songId_key" ON "SongChart"("songId");

-- CreateIndex
CREATE INDEX "SongAttachment_songId_idx" ON "SongAttachment"("songId");

-- CreateIndex
CREATE INDEX "SongUsage_churchId_playedOn_idx" ON "SongUsage"("churchId", "playedOn");

-- CreateIndex
CREATE INDEX "SongUsage_songId_playedOn_idx" ON "SongUsage"("songId", "playedOn");

-- CreateIndex
CREATE UNIQUE INDEX "SongUsage_songId_serviceId_key" ON "SongUsage"("songId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_churchId_name_key" ON "ServiceType"("churchId", "name");

-- CreateIndex
CREATE INDEX "Service_churchId_date_idx" ON "Service"("churchId", "date");

-- CreateIndex
CREATE INDEX "Service_churchId_status_idx" ON "Service"("churchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Sermon_serviceId_key" ON "Sermon"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceSong_songId_idx" ON "ServiceSong"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSong_serviceId_position_key" ON "ServiceSong"("serviceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSong_serviceId_songId_key" ON "ServiceSong"("serviceId", "songId");

-- CreateIndex
CREATE INDEX "SpecialDate_churchId_date_idx" ON "SpecialDate"("churchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDate_churchId_date_name_key" ON "SpecialDate"("churchId", "date", "name");

-- CreateIndex
CREATE INDEX "TeamMember_churchId_active_idx" ON "TeamMember"("churchId", "active");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "Position_churchId_category_idx" ON "Position"("churchId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Position_churchId_name_key" ON "Position"("churchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberPosition_teamMemberId_positionId_key" ON "TeamMemberPosition"("teamMemberId", "positionId");

-- CreateIndex
CREATE INDEX "Assignment_serviceId_idx" ON "Assignment"("serviceId");

-- CreateIndex
CREATE INDEX "Assignment_teamMemberId_status_idx" ON "Assignment"("teamMemberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_serviceId_teamMemberId_positionId_key" ON "Assignment"("serviceId", "teamMemberId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_assignmentId_key" ON "Invitation"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "BlockoutDate_teamMemberId_startDate_endDate_idx" ON "BlockoutDate"("teamMemberId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AvailabilityRequest_churchId_idx" ON "AvailabilityRequest"("churchId");

-- CreateIndex
CREATE INDEX "AvailabilityResponse_teamMemberId_date_idx" ON "AvailabilityResponse"("teamMemberId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityResponse_requestId_teamMemberId_date_key" ON "AvailabilityResponse"("requestId", "teamMemberId", "date");

-- CreateIndex
CREATE INDEX "AiConversation_churchId_userId_idx" ON "AiConversation"("churchId", "userId");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiPlanRun_churchId_createdAt_idx" ON "AiPlanRun"("churchId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_churchId_createdAt_idx" ON "Message"("churchId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_churchId_kind_status_idx" ON "Message"("churchId", "kind", "status");

-- CreateIndex
CREATE INDEX "Recommendation_churchId_kind_score_idx" ON "Recommendation"("churchId", "kind", "score");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_churchId_catalogSongId_kind_key" ON "Recommendation"("churchId", "catalogSongId", "kind");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipProfile" ADD CONSTRAINT "WorshipProfile_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_catalogSongId_fkey" FOREIGN KEY ("catalogSongId") REFERENCES "CatalogSong"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongChart" ADD CONSTRAINT "SongChart_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAttachment" ADD CONSTRAINT "SongAttachment_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAttachment" ADD CONSTRAINT "SongAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongUsage" ADD CONSTRAINT "SongUsage_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongUsage" ADD CONSTRAINT "SongUsage_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongUsage" ADD CONSTRAINT "SongUsage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_specialDateId_fkey" FOREIGN KEY ("specialDateId") REFERENCES "SpecialDate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_aiPlanRunId_fkey" FOREIGN KEY ("aiPlanRunId") REFERENCES "AiPlanRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermon" ADD CONSTRAINT "Sermon_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSong" ADD CONSTRAINT "ServiceSong_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSong" ADD CONSTRAINT "ServiceSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDate" ADD CONSTRAINT "SpecialDate_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_preferredServiceTypeId_fkey" FOREIGN KEY ("preferredServiceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberPosition" ADD CONSTRAINT "TeamMemberPosition_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberPosition" ADD CONSTRAINT "TeamMemberPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockoutDate" ADD CONSTRAINT "BlockoutDate_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "AvailabilityRequest_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityResponse" ADD CONSTRAINT "AvailabilityResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AvailabilityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityResponse" ADD CONSTRAINT "AvailabilityResponse_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPlanRun" ADD CONSTRAINT "AiPlanRun_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPlanRun" ADD CONSTRAINT "AiPlanRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_catalogSongId_fkey" FOREIGN KEY ("catalogSongId") REFERENCES "CatalogSong"("id") ON DELETE CASCADE ON UPDATE CASCADE;
