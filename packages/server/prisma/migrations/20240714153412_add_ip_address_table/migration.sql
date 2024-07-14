-- CreateTable
CREATE TABLE "IPAddress" (
    "ip" TEXT NOT NULL,
    "userSub" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IPAddress_pkey" PRIMARY KEY ("ip","userSub")
);

-- AddForeignKey
ALTER TABLE "IPAddress" ADD CONSTRAINT "IPAddress_userSub_fkey" FOREIGN KEY ("userSub") REFERENCES "User"("sub") ON DELETE RESTRICT ON UPDATE CASCADE;
