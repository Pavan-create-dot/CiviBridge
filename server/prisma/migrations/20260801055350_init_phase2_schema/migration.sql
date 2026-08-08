-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('pending', 'classified', 'routed');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'te');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('citizen', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'citizen',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrievanceCategory" (
    "id" SERIAL NOT NULL,
    "categoryName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "chromaDocId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrievanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "detectedLanguage" TEXT NOT NULL,
    "translatedText" TEXT,
    "matchedCategoryId" INTEGER,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_matchedCategoryId_fkey" FOREIGN KEY ("matchedCategoryId") REFERENCES "GrievanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
