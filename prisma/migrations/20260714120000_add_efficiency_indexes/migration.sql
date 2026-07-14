-- CreateIndex
CREATE INDEX "Lobby_reservedJoinerId_idx" ON "Lobby"("reservedJoinerId");

-- CreateIndex
CREATE INDEX "Ship_ownerId_createdAt_idx" ON "Ship"("ownerId", "createdAt");
