-- CreateEnum
CREATE TYPE "LobbyStatus" AS ENUM ('OPEN', 'FLEET_SELECTION', 'IN_GAME', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('ACTIVE', 'COMPLETED', 'TIMED_OUT', 'ABANDONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ship" (
    "id" SERIAL NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Ship',
    "equipment" JSONB NOT NULL,
    "traits" JSONB NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "shiny" BOOLEAN NOT NULL DEFAULT false,
    "constructed" BOOLEAN NOT NULL DEFAULT false,
    "inFleet" BOOLEAN NOT NULL DEFAULT false,
    "destroyed" BOOLEAN NOT NULL DEFAULT false,
    "shipsDestroyed" INTEGER NOT NULL DEFAULT 0,
    "destroyedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fleet" (
    "id" SERIAL NOT NULL,
    "ownerId" TEXT NOT NULL,
    "lobbyId" INTEGER NOT NULL,
    "shipIds" INTEGER[],
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "startingPositions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fleet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lobby" (
    "id" SERIAL NOT NULL,
    "creatorId" TEXT NOT NULL,
    "joinerId" TEXT,
    "mapId" INTEGER,
    "status" "LobbyStatus" NOT NULL DEFAULT 'OPEN',
    "costLimit" INTEGER NOT NULL DEFAULT 0,
    "turnTimeSeconds" INTEGER NOT NULL DEFAULT 120,
    "maxScore" INTEGER NOT NULL DEFAULT 3,
    "creatorGoesFirst" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "lobbyId" INTEGER NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "currentTurn" TEXT NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "phase" "GamePhase" NOT NULL DEFAULT 'ACTIVE',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTurn" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "actions" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Map" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gridWidth" INTEGER NOT NULL DEFAULT 17,
    "gridHeight" INTEGER NOT NULL DEFAULT 11,
    "blockedTiles" JSONB NOT NULL DEFAULT '[]',
    "scoringTiles" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "userId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "totalGames" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Game_lobbyId_key" ON "Game"("lobbyId");

-- CreateIndex
CREATE INDEX "GameTurn_gameId_round_idx" ON "GameTurn"("gameId", "round");

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fleet" ADD CONSTRAINT "Fleet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fleet" ADD CONSTRAINT "Fleet_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_joinerId_fkey" FOREIGN KEY ("joinerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTurn" ADD CONSTRAINT "GameTurn_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
