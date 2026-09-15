-- Priority 5.3: index coverage for hot query paths identified in services.
-- All additive; no data changes. Postgres creates indexes concurrently-safe
-- here because the migration runs before traffic (fresh deploy path).
CREATE INDEX "Asset_currentCustodianId_idx" ON "Asset"("currentCustodianId");
CREATE INDEX "Asset_responsibleDepartmentId_idx" ON "Asset"("responsibleDepartmentId");
CREATE INDEX "Asset_vendorId_idx" ON "Asset"("vendorId");
CREATE INDEX "Asset_purchaseOrderId_idx" ON "Asset"("purchaseOrderId");
CREATE INDEX "Asset_academicYearId_idx" ON "Asset"("academicYearId");
