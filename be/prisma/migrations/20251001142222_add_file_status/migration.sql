-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED', 'PROCESSING');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "FileStatus" NOT NULL DEFAULT 'PENDING';
