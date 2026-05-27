-- CreateIndex
CREATE INDEX "Fleet_lobbyId_idx" ON "Fleet"("lobbyId");

-- CreateIndex
CREATE INDEX "Fleet_lobbyId_ownerId_idx" ON "Fleet"("lobbyId", "ownerId");

-- CreateIndex
CREATE INDEX "Game_player1Id_idx" ON "Game"("player1Id");

-- CreateIndex
CREATE INDEX "Game_player2Id_idx" ON "Game"("player2Id");

-- CreateIndex
CREATE INDEX "Lobby_creatorId_idx" ON "Lobby"("creatorId");

-- CreateIndex
CREATE INDEX "Lobby_joinerId_idx" ON "Lobby"("joinerId");

-- CreateIndex
CREATE INDEX "Lobby_status_idx" ON "Lobby"("status");

-- CreateIndex
CREATE INDEX "PlayerStats_wins_idx" ON "PlayerStats"("wins");

-- CreateIndex
CREATE INDEX "Ship_ownerId_idx" ON "Ship"("ownerId");

-- CreateIndex
CREATE INDEX "Ship_ownerId_destroyed_idx" ON "Ship"("ownerId", "destroyed");
