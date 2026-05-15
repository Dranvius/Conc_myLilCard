import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { RolesModule } from './modules/roles/roles.module';
import { BusinessUnitsModule } from './modules/business-units/business-units.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ProductsModule } from './modules/products/products.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { SalesModule } from './modules/sales/sales.module';
import { SearchModule } from './modules/search/search.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AdminModule } from './modules/admin/admin.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { MailModule } from './modules/mail/mail.module';
import { EmailSequencesModule } from './modules/email-sequences/email-sequences.module';
import { DuplicatesModule } from './modules/duplicates/duplicates.module';
import { CPQModule } from './modules/cpq/cpq.module';
import { AIModule } from './modules/ai/ai.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AuthModule,
    AuditLogsModule,
    RolesModule,
    BusinessUnitsModule,
    UsersModule,
    CompaniesModule,
    ContactsModule,
    ProductsModule,
    OpportunitiesModule,
    ProposalsModule,
    SalesModule,
    ServiceOrdersModule,
    InvoicesModule,
    ReviewsModule,
    MetricsModule,
    AdminModule,
    ActivitiesModule,
    SearchModule,
    NotificationsModule,
    CalendarModule,
    MailModule,
    EmailSequencesModule,
    DuplicatesModule,
    CPQModule,
    AIModule,
    GamificationModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
