-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "baseCurrencyAmount" DECIMAL(14,2),
ADD COLUMN     "exchangeRate" DECIMAL(18,8);
