-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'LOAN';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "loanAmount" DECIMAL(12,2),
ADD COLUMN     "monthlyPayment" DECIMAL(12,2),
ADD COLUMN     "nextPaymentDate" TIMESTAMP(3);
