-- CreateTable
CREATE TABLE "User" (
    "sub" TEXT NOT NULL,
    "lastPixelTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pixelStack" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("sub")
);

-- CreateTable
CREATE TABLE "PaletteColor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,

    CONSTRAINT "PaletteColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pixel" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactionMember" (
    "id" SERIAL NOT NULL,
    "sub" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,

    CONSTRAINT "FactionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactionRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "factionId" TEXT NOT NULL,

    CONSTRAINT "FactionRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactionSocial" (
    "id" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "FactionSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactionSetting" (
    "id" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "FactionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactionSettingDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minimumLevel" INTEGER NOT NULL,

    CONSTRAINT "FactionSettingDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaletteColor_hex_key" ON "PaletteColor"("hex");

-- AddForeignKey
ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("sub") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_color_fkey" FOREIGN KEY ("color") REFERENCES "PaletteColor"("hex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionMember" ADD CONSTRAINT "FactionMember_sub_fkey" FOREIGN KEY ("sub") REFERENCES "User"("sub") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionMember" ADD CONSTRAINT "FactionMember_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionRole" ADD CONSTRAINT "FactionRole_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionSocial" ADD CONSTRAINT "FactionSocial_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionSetting" ADD CONSTRAINT "FactionSetting_key_fkey" FOREIGN KEY ("key") REFERENCES "FactionSettingDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionSetting" ADD CONSTRAINT "FactionSetting_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
