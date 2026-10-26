import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser, Public, RequirePermissions } from '../common/auth';
import { ApiFile } from '../common/swagger';
import { DOC_EXT, IMAGE_EXT, uploadOptions } from '../core/files';
import { toBool } from '../common/utils/paging';
import * as D from './info-source.dto';
import { CrawlService, FacilitiesService, LegalDocumentsService, LicensesService } from './info-source.service';

function needFile(file?: Express.Multer.File) {
  if (!file) throw new BadRequestException('Chưa chọn file (trường "file")');
  return file;
}

// ---------------------------------------------------------------------
@ApiTags('2.1 Nguồn tin — Loại văn bản pháp lý')
@Controller('legal-document-types')
export class LegalDocTypesController {
  constructor(private readonly svc: LegalDocumentsService) {}

  @Public()
  @Get()
  list(@Query() q: D.CatalogQueryDto) {
    return this.svc.types.list(q);
  }

  @Post()
  @RequirePermissions('legal_doc.manage')
  create(@Body() dto: D.CreateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.types.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('legal_doc.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.types.update(id, dto, a);
  }

  @Patch(':id/status')
  @RequirePermissions('legal_doc.manage')
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveFlagDto, @CurrentUser() a: Actor) {
    return this.svc.types.setActive(id, dto.isActive, a);
  }

  @Delete(':id')
  @RequirePermissions('legal_doc.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.types.remove(id, a);
  }
}

@ApiTags('2.2 Nguồn tin — Văn bản pháp lý')
@Controller('legal-documents')
export class LegalDocumentsController {
  constructor(private readonly svc: LegalDocumentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách văn bản (người dân / cơ sở KCB chỉ thấy văn bản đang hiệu lực)' })
  list(@Query() q: D.LegalDocQueryDto, @CurrentUser() a: Actor) {
    return this.svc.list(q, a);
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.get(id, a);
  }

  @Post()
  @RequirePermissions('legal_doc.manage')
  @ApiOperation({ summary: 'Cách 1: Thêm văn bản bằng form điền đầy đủ thông tin' })
  create(@Body() dto: D.CreateLegalDocDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Post('import')
  @RequirePermissions('legal_doc.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions('legal-documents', DOC_EXT)))
  @ApiFile()
  @ApiQuery({ name: 'autoSave', required: false, description: 'true: đủ thông tin thì lưu luôn' })
  @ApiOperation({ summary: 'Cách 2: Upload PDF / Word (.docx, .doc) / TXT → trích xuất thành thông tin văn bản' })
  import(@UploadedFile() file: Express.Multer.File, @Query() q: D.ImportQueryDto, @CurrentUser() a: Actor) {
    return this.svc.importFile(needFile(file), !!toBool(q.autoSave), a);
  }

  @Post(':id/attachment')
  @RequirePermissions('legal_doc.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions('legal-documents', [...DOC_EXT, ...IMAGE_EXT])))
  @ApiFile()
  attach(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() a: Actor) {
    return this.svc.attach(id, needFile(file), a);
  }

  @Patch(':id')
  @RequirePermissions('legal_doc.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateLegalDocDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Patch(':id/status')
  @RequirePermissions('legal_doc.manage')
  @ApiOperation({ summary: 'Kích hoạt / vô hiệu hóa (AI chỉ dùng văn bản ACTIVE)' })
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: D.StatusDto, @CurrentUser() a: Actor) {
    return this.svc.setStatus(id, dto.status, a);
  }

  @Delete(':id')
  @RequirePermissions('legal_doc.manage')
  @ApiOperation({ summary: 'Xóa (bị chặn nếu văn bản đã được AI / lịch sử kiểm tra sử dụng)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.remove(id, a);
  }
}

// ---------------------------------------------------------------------
@ApiTags('2.3 Nguồn tin — Loại đơn vị KCB')
@Controller('facility-types')
export class FacilityTypesController {
  constructor(private readonly svc: FacilitiesService) {}

  @Public()
  @Get()
  list(@Query() q: D.CatalogQueryDto) {
    return this.svc.types.list(q);
  }

  @Post()
  @RequirePermissions('facility.manage')
  create(@Body() dto: D.CreateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.types.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('facility.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.types.update(id, dto, a);
  }

  @Patch(':id/status')
  @RequirePermissions('facility.manage')
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveFlagDto, @CurrentUser() a: Actor) {
    return this.svc.types.setActive(id, dto.isActive, a);
  }

  @Delete(':id')
  @RequirePermissions('facility.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.types.remove(id, a);
  }
}

@ApiTags('2.4 Nguồn tin — Đơn vị khám chữa bệnh')
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly svc: FacilitiesService) {}

  @Get()
  @RequirePermissions('facility.view')
  list(@Query() q: D.FacilityQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  @RequirePermissions('facility.view')
  @ApiOperation({ summary: 'Hồ sơ cơ sở: giấy phép, tài khoản, thống kê vi phạm' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @RequirePermissions('facility.manage')
  @ApiOperation({ summary: 'Cách 1: Thêm bằng form — tự tạo GPHĐ + tài khoản đăng nhập cho cơ sở (trả mật khẩu tạm)' })
  create(@Body() dto: D.CreateFacilityDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Post('import')
  @RequirePermissions('facility.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions('facilities', DOC_EXT)))
  @ApiFile()
  @ApiQuery({ name: 'autoSave', required: false })
  @ApiOperation({ summary: 'Cách 2: Upload PDF / Word → trích xuất thông tin đơn vị KCB' })
  import(@UploadedFile() file: Express.Multer.File, @Query() q: D.ImportQueryDto, @CurrentUser() a: Actor) {
    return this.svc.importFile(needFile(file), !!toBool(q.autoSave), a);
  }

  @Patch(':id')
  @RequirePermissions('facility.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateFacilityDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Patch(':id/status')
  @RequirePermissions('facility.manage')
  @ApiOperation({ summary: 'Kích hoạt / vô hiệu hóa bản ghi (đồng thời khóa / mở tài khoản cơ sở)' })
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveFlagDto, @CurrentUser() a: Actor) {
    return this.svc.setActive(id, dto.isActive, a);
  }

  @Patch(':id/operating-status')
  @RequirePermissions('facility.manage')
  @ApiOperation({ summary: 'Trạng thái hoạt động: ACTIVE / SUSPENDED (đình chỉ) / REVOKED (rút giấy phép)' })
  operating(@Param('id', ParseIntPipe) id: number, @Body() dto: D.OperatingStatusDto, @CurrentUser() a: Actor) {
    return this.svc.setOperatingStatus(id, dto, a);
  }

  @Patch(':id/blacklist')
  @RequirePermissions('facility.manage', 'violation.manage')
  @ApiOperation({ summary: 'Đưa vào / gỡ khỏi danh sách đen' })
  blacklist(@Param('id', ParseIntPipe) id: number, @Body() dto: D.BlacklistDto, @CurrentUser() a: Actor) {
    return this.svc.setBlacklist(id, dto, a);
  }

  @Post(':id/reset-account-password')
  @RequirePermissions('facility.manage')
  resetPwd(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.resetAccountPassword(id, a);
  }

  @Delete(':id')
  @RequirePermissions('facility.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.remove(id, a);
  }
}

// ---------------------------------------------------------------------
@ApiTags('2.5 Nguồn tin — Giấy phép')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly svc: LicensesService) {}

  @Get()
  @RequirePermissions('license.view')
  list(@Query() q: D.LicenseQueryDto) {
    return this.svc.list(q);
  }

  @Public()
  @Get('verify')
  @ApiQuery({ name: 'number', required: true, example: '00234/HCM-GPHĐ' })
  @ApiOperation({ summary: 'Tra cứu tính hợp lệ của số giấy phép / CCHN (công khai)' })
  verify(@Query('number') number: string) {
    return this.svc.verify(number);
  }

  @Get(':id')
  @RequirePermissions('license.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @RequirePermissions('license.manage')
  @ApiOperation({ summary: 'Cách 1: Thêm giấy phép bằng form' })
  create(@Body() dto: D.CreateLicenseDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Post('import')
  @RequirePermissions('license.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions('licenses', DOC_EXT)))
  @ApiFile()
  @ApiQuery({ name: 'autoSave', required: false })
  @ApiOperation({ summary: 'Cách 2: Upload PDF / Word → trích xuất thông tin giấy phép' })
  import(@UploadedFile() file: Express.Multer.File, @Query() q: D.ImportQueryDto, @CurrentUser() a: Actor) {
    return this.svc.importFile(needFile(file), !!toBool(q.autoSave), a);
  }

  @Post(':id/attachment')
  @RequirePermissions('license.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions('licenses', [...DOC_EXT, ...IMAGE_EXT])))
  @ApiFile()
  attach(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() a: Actor) {
    return this.svc.attach(id, needFile(file), a);
  }

  @Patch(':id')
  @RequirePermissions('license.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateLicenseDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Patch(':id/status')
  @RequirePermissions('license.manage')
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: D.StatusDto, @CurrentUser() a: Actor) {
    return this.svc.setStatus(id, dto.status, a);
  }

  @Delete(':id')
  @RequirePermissions('license.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.remove(id, a);
  }
}

// ---------------------------------------------------------------------
@ApiTags('2.6 Nguồn tin — Thu thập tin (phân loại nguồn, nguồn, chủ đề, từ khóa)')
@Controller()
export class CrawlCatalogController {
  constructor(private readonly svc: CrawlService) {}

  // Phân loại nguồn
  @Get('source-categories')
  @RequirePermissions('crawl.view')
  listCats(@Query() q: D.CatalogQueryDto) {
    return this.svc.categories.list(q);
  }

  @Post('source-categories')
  @RequirePermissions('crawl.manage')
  createCat(@Body() dto: D.CreateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.categories.create(dto, a);
  }

  @Patch('source-categories/:id')
  @RequirePermissions('crawl.manage')
  updateCat(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.categories.update(id, dto, a);
  }

  @Patch('source-categories/:id/status')
  @RequirePermissions('crawl.manage')
  @ApiOperation({ summary: 'Vô hiệu hóa loại nguồn ⇒ vô hiệu hóa mọi nguồn thuộc loại đó + dừng lịch thu thập' })
  statusCat(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveFlagDto, @CurrentUser() a: Actor) {
    return this.svc.categories.setActive(id, dto.isActive, a);
  }

  @Delete('source-categories/:id')
  @RequirePermissions('crawl.manage')
  removeCat(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.categories.remove(id, a);
  }

  // Nguồn
  @Get('crawl-sources')
  @RequirePermissions('crawl.view')
  @ApiQuery({ name: 'categoryId', required: false })
  listSources(@Query() q: D.CatalogQueryDto & { categoryId?: number }) {
    return this.svc.listSources(q);
  }

  @Post('crawl-sources')
  @RequirePermissions('crawl.manage')
  createSource(@Body() dto: D.CreateSourceDto, @CurrentUser() a: Actor) {
    return this.svc.createSource(dto, a);
  }

  @Patch('crawl-sources/:id')
  @RequirePermissions('crawl.manage')
  updateSource(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateSourceDto, @CurrentUser() a: Actor) {
    return this.svc.updateSource(id, dto, a);
  }

  @Patch('crawl-sources/:id/status')
  @RequirePermissions('crawl.manage')
  statusSource(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveFlagDto, @CurrentUser() a: Actor) {
    return this.svc.setSourceActive(id, dto.isActive, a);
  }

  @Delete('crawl-sources/:id')
  @RequirePermissions('crawl.manage')
  removeSource(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.removeSource(id, a);
  }

  // Chủ đề & từ khóa
  @Get('topics')
  @RequirePermissions('crawl.view')
  listTopics(@Query() q: D.CatalogQueryDto) {
    return this.svc.topics.list(q);
  }

  @Get('topics/:id')
  @RequirePermissions('crawl.view')
  @ApiOperation({ summary: 'Chi tiết chủ đề kèm danh sách từ khóa' })
  topic(@Param('id', ParseIntPipe) id: number) {
    return this.svc.topicDetail(id);
  }

  @Post('topics')
  @RequirePermissions('crawl.manage')
  createTopic(@Body() dto: D.CreateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.topics.create(dto, a);
  }

  @Patch('topics/:id')
  @RequirePermissions('crawl.manage')
  updateTopic(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateCatalogDto, @CurrentUser() a: Actor) {
    return this.svc.topics.update(id, dto, a);
  }

  @Patch('topics/:id/status')
  @RequirePermissions('crawl.manage')
  statusTopic(@Param('id', ParseIntPipe) id: number, @Body() dto: D.SetActiveFlagDto, @CurrentUser() a: Actor) {
    return this.svc.topics.setActive(id, dto.isActive, a);
  }

  @Delete('topics/:id')
  @RequirePermissions('crawl.manage')
  removeTopic(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.topics.remove(id, a);
  }

  @Post('topics/:id/keywords')
  @RequirePermissions('crawl.manage')
  addKeyword(@Param('id', ParseIntPipe) id: number, @Body() dto: D.CreateKeywordDto, @CurrentUser() a: Actor) {
    return this.svc.addKeyword(id, dto, a);
  }

  @Patch('keywords/:id')
  @RequirePermissions('crawl.manage')
  updateKeyword(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateKeywordDto, @CurrentUser() a: Actor) {
    return this.svc.updateKeyword(id, dto, a);
  }

  @Delete('keywords/:id')
  @RequirePermissions('crawl.manage')
  removeKeyword(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.removeKeyword(id, a);
  }
}

@ApiTags('2.7 Nguồn tin — Lịch thu thập & phiên thu thập')
@Controller()
export class CrawlScheduleController {
  constructor(private readonly svc: CrawlService) {}

  @Get('crawl-schedules')
  @RequirePermissions('crawl.view')
  list(@Query() q: D.ScheduleQueryDto) {
    return this.svc.listSchedules(q);
  }

  @Get('crawl-schedules/:id')
  @RequirePermissions('crawl.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getSchedule(id);
  }

  @Post('crawl-schedules')
  @RequirePermissions('crawl.manage')
  create(@Body() dto: D.CreateScheduleDto, @CurrentUser() a: Actor) {
    return this.svc.createSchedule(dto, a);
  }

  @Patch('crawl-schedules/:id')
  @RequirePermissions('crawl.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateScheduleDto, @CurrentUser() a: Actor) {
    return this.svc.updateSchedule(id, dto, a);
  }

  @Post('crawl-schedules/:id/start')
  @RequirePermissions('crawl.manage')
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.setScheduleStatus(id, 'RUNNING', a);
  }

  @Post('crawl-schedules/:id/pause')
  @RequirePermissions('crawl.manage')
  pause(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.setScheduleStatus(id, 'PAUSED', a);
  }

  @Post('crawl-schedules/:id/stop')
  @RequirePermissions('crawl.manage')
  stop(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.setScheduleStatus(id, 'STOPPED', a);
  }

  @Post('crawl-schedules/:id/run')
  @RequirePermissions('crawl.manage')
  @ApiOperation({
    summary: 'Chạy 1 phiên thu thập ngay (lịch phải RUNNING)',
    description: 'Không truyền items: crawler GIẢ LẬP sinh `count` mẫu tin từ từ khóa. Có items: nhận dữ liệu từ crawler thật.',
  })
  run(@Param('id', ParseIntPipe) id: number, @Body() dto: D.RunScheduleDto, @CurrentUser() a: Actor) {
    return this.svc.runSchedule(id, dto, a);
  }

  @Delete('crawl-schedules/:id')
  @RequirePermissions('crawl.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.removeSchedule(id, a);
  }

  @Get('crawl-jobs')
  @RequirePermissions('crawl.view', 'ad_item.view')
  @ApiQuery({ name: 'scheduleId', required: false })
  jobs(@Query() q: D.ListQueryDto & { scheduleId?: number }) {
    return this.svc.listJobs(q);
  }
}
