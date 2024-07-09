-- CreateEnum
CREATE TYPE "AuditLogAction" AS ENUM ('BAN_CREATE', 'BAN_UPDATE', 'BAN_DELETE');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "action" "AuditLogAction" NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "banId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("sub") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_banId_fkey" FOREIGN KEY ("banId") REFERENCES "Ban"("id") ON DELETE SET NULL ON UPDATE CASCADE;
