-- CreateTable
CREATE TABLE "Faction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "image" TEXT
);

-- CreateTable
CREATE TABLE "FactionMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sub" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    CONSTRAINT "FactionMember_sub_fkey" FOREIGN KEY ("sub") REFERENCES "User" ("sub") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FactionMember_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FactionRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "factionId" TEXT NOT NULL,
    CONSTRAINT "FactionRole_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FactionSocial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factionId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "FactionSocial_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FactionSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "FactionSetting_key_fkey" FOREIGN KEY ("key") REFERENCES "FactionSettingDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FactionSetting_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FactionSettingDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minimumLevel" INTEGER NOT NULL
);
