-- CreateTable
CREATE TABLE "AIShipConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "equipment" JSONB NOT NULL,
    "traits" JSONB NOT NULL,
    "archetype" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIShipConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMapPlacement" (
    "id" SERIAL NOT NULL,
    "mapId" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,

    CONSTRAINT "AIMapPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIFleetShip" (
    "shipId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "archetype" INTEGER NOT NULL,

    CONSTRAINT "AIFleetShip_pkey" PRIMARY KEY ("shipId")
);

-- CreateIndex
CREATE INDEX "AIMapPlacement_mapId_idx" ON "AIMapPlacement"("mapId");

-- CreateIndex
CREATE UNIQUE INDEX "AIMapPlacement_mapId_row_col_key" ON "AIMapPlacement"("mapId", "row", "col");

-- AddForeignKey
ALTER TABLE "AIMapPlacement" ADD CONSTRAINT "AIMapPlacement_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMapPlacement" ADD CONSTRAINT "AIMapPlacement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AIShipConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
