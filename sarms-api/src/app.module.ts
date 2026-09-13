import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesPermissionsModule } from './roles-permissions/roles-permissions.module';
import { DepartmentsModule } from './departments/departments.module';
import { LocationsModule } from './locations/locations.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { AssetCatalogModule } from './asset-catalog/asset-catalog.module';
import { AssetsModule } from './assets/assets.module';
import { CustodyModule } from './custody/custody.module';
import { RequestsModule } from './requests/requests.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { IssuanceModule } from './issuance/issuance.module';
import { HistoryModule } from './history/history.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VendorsModule } from './vendors/vendors.module';
import { ProcurementModule } from './procurement/procurement.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { IncidentsModule } from './incidents/incidents.module';
import { DisposalModule } from './disposal/disposal.module';
import { StocktakeModule } from './stocktake/stocktake.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,

    AuthModule,
    UsersModule,
    RolesPermissionsModule,
    DepartmentsModule,
    LocationsModule,
    AcademicYearsModule,
    AssetCatalogModule,
    AssetsModule,
    CustodyModule,
    RequestsModule,
    ApprovalsModule,
    IssuanceModule,
    HistoryModule,
    NotificationsModule,
    DashboardModule,
    VendorsModule,
    ProcurementModule,
    MaintenanceModule,
    IncidentsModule,
    DisposalModule,
    StocktakeModule,
  ],
  providers: [
    // Global: any controller method tagged with @Audit(...) gets logged
    // automatically. See src/common/interceptors/audit.interceptor.ts.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
