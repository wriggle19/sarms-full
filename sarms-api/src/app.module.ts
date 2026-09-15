import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HealthModule } from './health/health.module';

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
import { ReservationsModule } from './reservations/reservations.module';
import { CalendarModule } from './calendar/calendar.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { BulkModule } from './bulk/bulk.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ImportsModule } from './imports/imports.module';
import { SequencesController } from './common/utils/sequences.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          // Global: 200 requests / 60s per IP. Login has its own tighter
          // bucket via @Throttle on AuthController (5/min).
          ttl: config.get<number>('RATE_LIMIT_TTL_MS', 60000),
          limit: config.get<number>('RATE_LIMIT_MAX', 200),
        },
      ],
    }),
    PrismaModule,
    HealthModule,

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
    ReservationsModule,
    CalendarModule,
    ReportsModule,
    AuditModule,
    BulkModule,
    AttachmentsModule,
    ImportsModule,
  ],
  providers: [
    // Global: any controller method tagged with @Audit(...) gets logged
    // automatically. See src/common/interceptors/audit.interceptor.ts.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global: consistent JSON error shape, no internal detail leakage in prod.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  controllers: [SequencesController],
})
export class AppModule implements NestModule {
  // Request correlation ids + access logging for every route.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
