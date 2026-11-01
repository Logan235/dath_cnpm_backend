import { Module } from '@nestjs/common';
import {
  AuditLogsController,
  MetaController,
  NotificationsController,
  OrganizationsController,
  ParametersController,
  RoleRequestsController,
  RolesController,
  UsersController,
} from './system.controller';
import {
  AdminMiscService,
  OrganizationsService,
  RoleRequestsService,
  RolesService,
  UsersService,
} from './system.service';

@Module({
  controllers: [
    OrganizationsController,
    RolesController,
    UsersController,
    RoleRequestsController,
    AuditLogsController,
    ParametersController,
    NotificationsController,
    MetaController,
  ],
  providers: [OrganizationsService, RolesService, UsersService, RoleRequestsService, AdminMiscService],
  exports: [UsersService],
})
export class SystemAdminModule {}
