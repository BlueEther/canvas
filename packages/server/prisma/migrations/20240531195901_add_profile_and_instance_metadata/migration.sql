-- AlterTable
ALTER TABLE "User" ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "picture_url" TEXT,
ADD COLUMN     "profile_url" TEXT;

-- CreateTable
CREATE TABLE "Instance" (
    "id" SERIAL NOT NULL,
    "hostname" TEXT NOT NULL,
    "name" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Instance_hostname_key" ON "Instance"("hostname");
