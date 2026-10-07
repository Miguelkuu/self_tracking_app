-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'OTHER');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "apr" DECIMAL(5,2),
ADD COLUMN     "creditLimit" DECIMAL(12,2),
ADD COLUMN     "minPayment" DECIMAL(12,2),
ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isTransfer" BOOLEAN NOT NULL DEFAULT false;
