-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "ClassEvent" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClassEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassEvent_uid_key" ON "ClassEvent"("uid");

-- CreateIndex
CREATE INDEX "ClassEvent_start_idx" ON "ClassEvent"("start");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_externalId_key" ON "Assignment"("externalId");
