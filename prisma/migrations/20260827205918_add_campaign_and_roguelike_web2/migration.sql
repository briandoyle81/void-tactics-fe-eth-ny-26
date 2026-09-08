-- CreateEnum
CREATE TYPE "RoguelikeRunStatus" AS ENUM ('ACTIVE', 'WON', 'ENDED');

-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "campaignNodeId" INTEGER,
ADD COLUMN     "roguelikeRunId" INTEGER;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "requiredVariant" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignNode" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "mapId" INTEGER NOT NULL,
    "prerequisites" INTEGER[],
    "costLimit" INTEGER NOT NULL,
    "turnTimeSeconds" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "creatorGoesFirst" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignNodeCompletion" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignNodeCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoguelikeCampaign" (
    "id" SERIAL NOT NULL,
    "requiredVariant" INTEGER NOT NULL DEFAULT 0,
    "autoHealPercent" INTEGER NOT NULL DEFAULT 0,
    "initialCostCap" INTEGER NOT NULL,
    "rootNodeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoguelikeCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoguelikeNode" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "kind" INTEGER NOT NULL,
    "mapId" INTEGER,
    "turnTimeSeconds" INTEGER,
    "maxScore" INTEGER,
    "creatorGoesFirst" BOOLEAN,
    "costCapOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoguelikeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoguelikeEdge" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "twoWay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoguelikeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoguelikeRun" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "status" "RoguelikeRunStatus" NOT NULL DEFAULT 'ACTIVE',
    "campaignId" INTEGER NOT NULL,
    "currentNodeId" INTEGER NOT NULL,
    "currentCostCap" INTEGER NOT NULL,
    "activeLobbyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RoguelikeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoguelikeRosterShip" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "shipId" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoguelikeRosterShip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoguelikeNodeDefeat" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "nodeId" INTEGER NOT NULL,

    CONSTRAINT "RoguelikeNodeDefeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignNode_campaignId_idx" ON "CampaignNode"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignNodeCompletion_userId_idx" ON "CampaignNodeCompletion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignNodeCompletion_userId_nodeId_key" ON "CampaignNodeCompletion"("userId", "nodeId");

-- CreateIndex
CREATE INDEX "RoguelikeNode_campaignId_idx" ON "RoguelikeNode"("campaignId");

-- CreateIndex
CREATE INDEX "RoguelikeEdge_parentId_idx" ON "RoguelikeEdge"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "RoguelikeEdge_parentId_childId_key" ON "RoguelikeEdge"("parentId", "childId");

-- CreateIndex
CREATE INDEX "RoguelikeRun_userId_idx" ON "RoguelikeRun"("userId");

-- CreateIndex
CREATE INDEX "RoguelikeRun_userId_status_idx" ON "RoguelikeRun"("userId", "status");

-- CreateIndex
CREATE INDEX "RoguelikeRosterShip_runId_idx" ON "RoguelikeRosterShip"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RoguelikeRosterShip_runId_shipId_key" ON "RoguelikeRosterShip"("runId", "shipId");

-- CreateIndex
CREATE INDEX "RoguelikeNodeDefeat_runId_idx" ON "RoguelikeNodeDefeat"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RoguelikeNodeDefeat_runId_nodeId_key" ON "RoguelikeNodeDefeat"("runId", "nodeId");

-- CreateIndex
CREATE INDEX "Lobby_campaignNodeId_idx" ON "Lobby"("campaignNodeId");

-- CreateIndex
CREATE INDEX "Lobby_roguelikeRunId_idx" ON "Lobby"("roguelikeRunId");

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_campaignNodeId_fkey" FOREIGN KEY ("campaignNodeId") REFERENCES "CampaignNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_roguelikeRunId_fkey" FOREIGN KEY ("roguelikeRunId") REFERENCES "RoguelikeRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignNode" ADD CONSTRAINT "CampaignNode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignNode" ADD CONSTRAINT "CampaignNode_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignNodeCompletion" ADD CONSTRAINT "CampaignNodeCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignNodeCompletion" ADD CONSTRAINT "CampaignNodeCompletion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CampaignNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeNode" ADD CONSTRAINT "RoguelikeNode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RoguelikeCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeNode" ADD CONSTRAINT "RoguelikeNode_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeEdge" ADD CONSTRAINT "RoguelikeEdge_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RoguelikeNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeEdge" ADD CONSTRAINT "RoguelikeEdge_childId_fkey" FOREIGN KEY ("childId") REFERENCES "RoguelikeNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeRun" ADD CONSTRAINT "RoguelikeRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeRun" ADD CONSTRAINT "RoguelikeRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RoguelikeCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeRosterShip" ADD CONSTRAINT "RoguelikeRosterShip_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RoguelikeRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeRosterShip" ADD CONSTRAINT "RoguelikeRosterShip_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeNodeDefeat" ADD CONSTRAINT "RoguelikeNodeDefeat_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RoguelikeRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeNodeDefeat" ADD CONSTRAINT "RoguelikeNodeDefeat_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "RoguelikeNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
