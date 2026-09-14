-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'FULFILLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('ACADEMIC_YEAR_START', 'ACADEMIC_YEAR_END', 'TEACHER_RETURN', 'STUDENT_RETURN', 'STAFF_CLEARANCE_DEADLINE', 'EQUIPMENT_RETURN_DEADLINE', 'INVENTORY_DATE', 'HOLIDAY_START', 'HOLIDAY_END', 'OTHER');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "assetClass" TEXT,
ADD COLUMN     "barcodeValue" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "projectCode" TEXT,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "salvageValue" DECIMAL(12,2),
ADD COLUMN     "usefulLifeYears" INTEGER,
ADD COLUMN     "warrantyCoverage" TEXT,
ADD COLUMN     "warrantyNumber" TEXT,
ADD COLUMN     "warrantyProvider" TEXT,
ADD COLUMN     "warrantyType" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceRecord" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "laborCost" DECIMAL(12,2),
ADD COLUMN     "partsCost" DECIMAL(12,2),
ADD COLUMN     "repairNotes" TEXT,
ADD COLUMN     "technicianName" TEXT;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetReservation" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER,
    "categoryId" INTEGER,
    "reservedById" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "roomId" INTEGER,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" INTEGER,
    "issuedAssignmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolCalendarEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" "CalendarEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "academicYearId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "AssetReservation_assetId_idx" ON "AssetReservation"("assetId");

-- CreateIndex
CREATE INDEX "AssetReservation_reservedById_idx" ON "AssetReservation"("reservedById");

-- CreateIndex
CREATE INDEX "AssetReservation_status_idx" ON "AssetReservation"("status");

-- CreateIndex
CREATE INDEX "SchoolCalendarEvent_eventType_idx" ON "SchoolCalendarEvent"("eventType");

-- CreateIndex
CREATE INDEX "SchoolCalendarEvent_eventDate_idx" ON "SchoolCalendarEvent"("eventDate");

-- AddForeignKey
ALTER TABLE "SchoolCalendarEvent" ADD CONSTRAINT "SchoolCalendarEvent_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
