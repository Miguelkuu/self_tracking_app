-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "importName" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "importId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_importName_key" ON "Account"("importName");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_importId_key" ON "Transaction"("importId");
