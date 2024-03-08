-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "sub" TEXT NOT NULL PRIMARY KEY,
    "lastPixelTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pixelStack" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("lastPixelTime", "sub") SELECT "lastPixelTime", "sub" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
