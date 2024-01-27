-- CreateTable
CREATE TABLE "User" (
    "sub" TEXT NOT NULL PRIMARY KEY,
    "lastPixelTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PalleteColor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Pixel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pixel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("sub") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pixel_color_fkey" FOREIGN KEY ("color") REFERENCES "PalleteColor" ("hex") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PalleteColor_hex_key" ON "PalleteColor"("hex");
