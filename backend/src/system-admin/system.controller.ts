import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Actor, CurrentUser, Public, RequirePermissions } from '../common/auth';
import { ApiFile } from '../common/swagger';
import { DOC_EXT, IMAGE_EXT, publicPath, uploadOptions } from '../core/files';
import { sendXlsx } from '../common/utils/export';
import { LABELS, ROLE } from '../common/constants';
import * as D from './system.dto';
import {
  AdminMiscService,
  OrganizationsService,
  RoleRequestsService,
  RolesService,
  UsersService,
} from './system.service';

@ApiTags('1.1 Quản trị — Cơ cấu tổ chức')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly svc: OrganizationsService) {}

  @Get()
  @RequirePermissions('org.view')
  @ApiOperation({ summary: 'Danh sách đơn vị (phân trang, tìm kiếm)' })
  list(@Query() q: D.OrgQueryDto) {
    return this.svc.list(q);
  }

  @Get('tree')
  @RequirePermissions('org.view')
  @ApiOperation({ summary: 'Cây cơ cấu tổ chức cha - con (kèm số người dùng)' })
  tree() {
    return this.svc.tree();
  }

  @Get('options')
  @ApiOperation({ summary: 'Đơn vị đang hoạt động (dropdown) — mọi tài khoản đã đăng nhập' })
  options() {
    return this.svc.options();
  }

  @Get(':id')
  @RequirePermissions('org.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @RequirePermissions('org.manage')
  @ApiOperation({ summary: 'Thêm đơn vị (hoặc đơn vị con khi có parentId)' })
  create(@Body() dto: D.CreateOrgDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('org.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateOrgDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Patch(':id/status')
  @RequirePermissions('org.manage')
  @ApiOperation({ summary: 'Kích hoạt / vô hiệu hóa (vô hiệu hóa cả đơn vị con)' })
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveDto, @CurrentUser() a: Actor) {
    return this.svc.setActive(id, dto.isActive, a);
  }

  @Delete(':id')
  @RequirePermissions('org.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.remove(id, a);
  }
}

@ApiTags('1.2 Quản trị — Vai trò & phân quyền')
@Controller('roles')
export class RolesController {
  constructor(private readonly svc: RolesService) {}

  @Get()
  @RequirePermissions('role.view')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('permissions')
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'Danh mục quyền, nhóm theo module' })
  permissions() {
    return this.svc.permissionCatalog();
  }

  @Get(':id')
  @RequirePermissions('role.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @RequirePermissions('role.manage')
  create(@Body() dto: D.CreateRoleDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('role.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateRoleDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Put(':id/permissions')
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Gán lại toàn bộ quyền cho vai trò (có hiệu lực ngay)' })
  setPermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetPermissionsDto, @CurrentUser() a: Actor) {
    return this.svc.setPermissions(id, dto.permissionCodes, a);
  }

  @Patch(':id/status')
  @RequirePermissions('role.manage')
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveDto, @CurrentUser() a: Actor) {
    return this.svc.setActive(id, dto.isActive, a);
  }

  @Delete(':id')
  @RequirePermissions('role.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.remove(id, a);
  }
}

@ApiTags('1.3 Quản trị — Người dùng & tài khoản')
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @RequirePermissions('user.view')
  list(@Query() q: D.UserQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  @RequirePermissions('user.view')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Get(':id/login-history')
  @RequirePermissions('user.view')
  @ApiOperation({ summary: 'Lịch sử đăng nhập của tài khoản' })
  loginHistory(@Param('id') id: string, @Query() q: D.ListQueryDto) {
    return this.svc.loginHistory(id, q);
  }

  @Post()
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Tạo tài khoản cán bộ (trả mật khẩu tạm nếu không nhập)' })
  create(@Body() dto: D.CreateUserDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('user.manage')
  update(@Param('id') id: string, @Body() dto: D.UpdateUserDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Put(':id/roles')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Gán vai trò cho người dùng' })
  setRoles(@Param('id') id: string, @Body() dto: D.SetRolesDto, @CurrentUser() a: Actor) {
    return this.svc.setRoles(id, dto.roleCodes, a);
  }

  @Post(':id/lock')
  @RequirePermissions('user.manage')
  lock(@Param('id') id: string, @CurrentUser() a: Actor) {
    return this.svc.setStatus(id, 'LOCKED', a);
  }

  @Post(':id/unlock')
  @RequirePermissions('user.manage')
  unlock(@Param('id') id: string, @CurrentUser() a: Actor) {
    return this.svc.setStatus(id, 'ACTIVE', a);
  }

  @Post(':id/reset-password')
  @RequirePermissions('user.manage')
  resetPassword(@Param('id') id: string, @Body() dto: D.ResetPasswordDto, @CurrentUser() a: Actor) {
    return this.svc.resetPassword(id, dto.newPassword, a);
  }

  @Delete(':id')
  @RequirePermissions('user.manage')
  remove(@Param('id') id: string, @CurrentUser() a: Actor) {
    return this.svc.remove(id, a);
  }
}

@ApiTags('1.4 Quản trị — Form xin cấp quyền cán bộ')
@Controller('role-requests')
export class RoleRequestsController {
  constructor(private readonly svc: RoleRequestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cán bộ (email cơ quan) gửi form xin cấp vai trò',
    description: 'Đăng nhập KHÔNG chọn vai trò (tài khoản chưa có vai trò) rồi gọi API này. Form gửi tới admin và các vai trò có quyền role_request.review.',
  })
  create(@Body() dto: D.CreateRoleRequestDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Post(':id/attachment')
  @UseInterceptors(FileInterceptor('file', uploadOptions('role-requests', [...DOC_EXT, ...IMAGE_EXT])))
  @ApiFile()
  @ApiOperation({ summary: 'Đính kèm minh chứng (quyết định phân công, thẻ công chức...)' })
  attach(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() a: Actor) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    return this.svc.attach(id, publicPath(file), a);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Form của tôi' })
  mine(@CurrentUser() a: Actor) {
    return this.svc.mine(a);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.cancel(id, a);
  }

  @Get()
  @RequirePermissions('role_request.review')
  @ApiOperation({ summary: 'Hộp thư form xin cấp quyền (admin / lãnh đạo)' })
  list(@Query() q: D.RoleRequestQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  @RequirePermissions('role_request.review')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post(':id/approve')
  @RequirePermissions('role_request.review')
  @ApiOperation({ summary: 'Duyệt và cấp vai trò (vai trò ADMIN/MANAGER chỉ ADMIN cấp)' })
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: D.ApproveRoleRequestDto, @CurrentUser() a: Actor) {
    return this.svc.approve(id, dto, a);
  }

  @Post(':id/reject')
  @RequirePermissions('role_request.review')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: D.RejectDto, @CurrentUser() a: Actor) {
    return this.svc.reject(id, dto.note, a);
  }
}

@ApiTags('1.5 Quản trị — Nhật ký hoạt động')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly svc: AdminMiscService) {}

  @Get()
  @RequirePermissions('audit.view')
  list(@Query() q: D.AuditQueryDto) {
    return this.svc.listAudit(q);
  }

  @Get('stats')
  @RequirePermissions('audit.view')
  stats() {
    return this.svc.auditStats();
  }

  @Get('export')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Xuất nhật ký ra Excel' })
  async export(@Query() q: D.AuditQueryDto, @Res() res: Response, @CurrentUser() a: Actor) {
    const rows = await this.svc.auditQuery(q).take(5000).getMany();
    return sendXlsx(
      res,
      'nhat-ky-hoat-dong.xlsx',
      'Nhật ký',
      [
        { header: 'Thời gian', key: 'createdAt', width: 22 },
        { header: 'Tài khoản', key: 'userEmail', width: 28 },
        { header: 'Vai trò', key: 'role' },
        { header: 'Hành động', key: 'action' },
        { header: 'Module', key: 'module' },
        { header: 'Đối tượng', key: 'entityType' },
        { header: 'Mã', key: 'entityId' },
        { header: 'Mô tả', key: 'description', width: 60 },
        { header: 'IP', key: 'ipAddress' },
      ],
      rows,
    );
  }
}

@ApiTags('1.6 Quản trị — Tham số hệ thống')
@Controller('parameters')
export class ParametersController {
  constructor(private readonly svc: AdminMiscService) {}

  @Get()
  @RequirePermissions('param.manage')
  @ApiQuery({ name: 'group', required: false, description: 'AUTH | AI | REVIEW | VIOLATION | RISK | MATCHING | PRECHECK | UI' })
  list(@Query('group') group?: string) {
    return this.svc.listParams(group);
  }

  @Post()
  @RequirePermissions('param.manage')
  create(@Body() dto: D.CreateParamDto, @CurrentUser() a: Actor) {
    return this.svc.createParam(dto, a);
  }

  @Patch(':key')
  @RequirePermissions('param.manage')
  @ApiOperation({ summary: 'Sửa giá trị tham số (VD OFFICIAL_EMAIL_DOMAINS, AI_VIOLATION_THRESHOLD...)' })
  update(@Param('key') key: string, @Body() dto: D.UpdateParamDto, @CurrentUser() a: Actor) {
    return this.svc.updateParam(key, dto, a);
  }

  @Delete(':key')
  @RequirePermissions('param.manage')
  remove(@Param('key') key: string, @CurrentUser() a: Actor) {
    return this.svc.deleteParam(key, a);
  }
}

@ApiTags('1.7 Thông báo của tôi')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: AdminMiscService) {}

  @Get()
  list(@Query() q: D.NotificationQueryDto, @CurrentUser() a: Actor) {
    return this.svc.myNotifications(a, q);
  }

  @Get('unread-count')
  unread(@CurrentUser() a: Actor) {
    return this.svc.unreadCount(a);
  }

  @Post('read-all')
  readAll(@CurrentUser() a: Actor) {
    return this.svc.markAllRead(a);
  }

  @Post(':id/read')
  read(@Param('id') id: string, @CurrentUser() a: Actor) {
    return this.svc.markRead(id, a);
  }
}

@ApiTags('9. Danh mục dùng chung')
@Controller('meta')
export class MetaController {
  @Public()
  @Get('enums')
  @ApiOperation({ summary: 'Toàn bộ mã trạng thái + nhãn tiếng Việt (để frontend hiển thị)' })
  enums() {
    return { roles: Object.values(ROLE), labels: LABELS };
  }
}
