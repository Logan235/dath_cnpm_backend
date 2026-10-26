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
  Res,
  ForbiddenException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { Actor, CurrentUser, Public, RequirePermissions, Roles } from '../common/auth';
import { ApiFile } from '../common/swagger';
import { DOC_EXT, DocumentTextService, IMAGE_EXT, MEDIA_EXT, SHEET_EXT, fileInfo, uploadOptions } from '../core/files';
import { sendXlsx } from '../common/utils/export';
import { toBool } from '../common/utils/paging';
import { SetActiveFlagDto } from '../info-source/info-source.dto';
import * as D from './violations.dto';
import { FeedbackService, PenaltyService, ViolationTypesService, ViolationsService } from './violations.service';
import { CasesService, PrecheckService, PublicService, StatisticsService, SuspectsService } from './investigation.service';

@ApiTags('4.1 Vi phạm — Danh mục phân loại vi phạm')
@Controller('violation-types')
export class ViolationTypesController {
  constructor(private readonly svc: ViolationTypesService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @RequirePermissions('violation.view')
  stats() {
    return this.svc.stats();
  }

  @Post()
  @RequirePermissions('violation_type.manage')
  create(@Body() dto: D.CreateViolationTypeDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('violation_type.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateViolationTypeDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Patch(':id/status')
  @RequirePermissions('violation_type.manage')
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveFlagDto, @CurrentUser() a: Actor) {
    return this.svc.setActive(id, dto.isActive, a);
  }

  @Delete(':id')
  @RequirePermissions('violation_type.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.remove(id, a);
  }
}

const VIOLATION_EXPORT_COLUMNS = [
  { header: 'Mã hồ sơ', key: 'code', width: 16 },
  { header: 'Tiêu đề', key: 'title', width: 50 },
  { header: 'Cơ sở', key: 'facility', width: 30 },
  { header: 'Đối tượng', key: 'suspect', width: 30 },
  { header: 'Loại vi phạm', key: 'types', width: 40 },
  { header: 'Mức độ', key: 'severity' },
  { header: 'Trạng thái', key: 'status' },
  { header: 'Nguồn', key: 'source' },
  { header: 'Độ tin cậy AI', key: 'aiConfidence' },
  { header: 'Ngày phát hiện', key: 'detectedAt', width: 22 },
  { header: 'Ngày hoàn thành', key: 'resolvedAt', width: 22 },
  { header: 'Đường dẫn', key: 'contentUrl', width: 40 },
];

@ApiTags('4.2 Vi phạm — Hồ sơ quảng cáo vi phạm')
@Controller('violations')
export class ViolationsController {
  constructor(private readonly svc: ViolationsService, private readonly penalty: PenaltyService) {}

  @Get()
  @RequirePermissions('violation.view')
  list(@Query() q: D.ViolationQueryDto, @CurrentUser() a: Actor) {
    return this.svc.list(q, a);
  }

  @Get('export')
  @RequirePermissions('violation.view')
  @ApiOperation({ summary: 'Xuất danh sách hồ sơ vi phạm ra Excel (cùng bộ lọc với GET /violations)' })
  async export(@Query() q: D.ViolationQueryDto, @Res() res: Response, @CurrentUser() a: Actor) {
    return sendXlsx(res, 'ho-so-vi-pham.xlsx', 'Vi phạm', VIOLATION_EXPORT_COLUMNS, await this.svc.exportRows(q, a));
  }

  @Get('import-template')
  @RequirePermissions('violation.manage')
  @ApiOperation({ summary: 'Tải file Excel mẫu để nhập hồ sơ vi phạm' })
  async template(@Res() res: Response) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Vi phạm');
    ws.columns = ['Tiêu đề', 'Nội dung', 'Đường dẫn', 'Mã cơ sở', 'Loại vi phạm', 'Mức độ', 'Ngày phát hiện'].map((h) => ({ header: h, key: h, width: 28 }));
    ws.addRow({
      'Tiêu đề': 'Quảng cáo nâng ngực không phép',
      'Nội dung': 'Nâng ngực không đau, cam kết hiệu quả 100%...',
      'Đường dẫn': 'https://facebook.com/abc/posts/1',
      'Mã cơ sở': 'TMV-BELLA',
      'Loại vi phạm': 'FALSE_CLAIM, OUT_OF_SCOPE',
      'Mức độ': 'HIGH',
      'Ngày phát hiện': '2026-10-01',
    });
    ws.getRow(1).font = { bold: true };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mau-nhap-vi-pham.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }

  @Post('import')
  @RequirePermissions('violation.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions('imports', SHEET_EXT)))
  @ApiFile()
  @ApiOperation({ summary: 'Nhập hồ sơ vi phạm từ Excel (.xlsx theo file mẫu)' })
  import(@UploadedFile() file: Express.Multer.File, @CurrentUser() a: Actor) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    return this.svc.importXlsx(file, a);
  }

  @Get(':id')
  @RequirePermissions('violation.view')
  @ApiOperation({ summary: 'Chi tiết hồ sơ: nội dung, bằng chứng, AI, quyết định xử phạt, phản hồi, hồ sơ phối hợp, lịch sử, allowedActions' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Get(':id/history')
  @RequirePermissions('violation.view')
  history(@Param('id', ParseIntPipe) id: number) {
    return this.svc.history(id);
  }

  @Post()
  @RequirePermissions('violation.manage')
  @ApiOperation({ summary: 'Nhập thủ công hồ sơ vi phạm (VD đơn vị phối hợp cung cấp)' })
  create(@Body() dto: D.CreateViolationDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('violation.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateViolationDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Post(':id/evidence')
  @RequirePermissions('violation.manage')
  @UseInterceptors(FilesInterceptor('files', 10, uploadOptions('evidence', [...MEDIA_EXT, ...DOC_EXT])))
  @ApiFile('files', true, { note: 'Ghi chú (tùy chọn)' })
  @ApiOperation({ summary: 'Bổ sung bằng chứng (ảnh chụp, video, tài liệu)' })
  evidence(@Param('id', ParseIntPipe) id: number, @UploadedFiles() files: Express.Multer.File[], @Body('note') note: string, @CurrentUser() a: Actor) {
    if (!files?.length) throw new BadRequestException('Chưa chọn file');
    return this.svc.addEvidence(id, files, note, a);
  }

  @Post(':id/assign')
  @RequirePermissions('violation.manage')
  assign(@Param('id', ParseIntPipe) id: number, @Body('userId') userId: string, @CurrentUser() a: Actor) {
    if (!userId) throw new BadRequestException('Thiếu userId');
    return this.svc.assign(id, String(userId), a);
  }

  @Post(':id/assess')
  @RequirePermissions('violation.manage')
  @ApiOperation({ summary: 'Kiểm tra thẩm quyền: thuộc thẩm quyền + đủ thông tin → Đang xử lý; ngược lại → chuyển phối hợp' })
  assess(@Param('id', ParseIntPipe) id: number, @Body() dto: D.AssessDto, @CurrentUser() a: Actor) {
    return this.svc.assess(id, dto, a);
  }

  @Post(':id/transfer')
  @RequirePermissions('violation.manage')
  @ApiOperation({ summary: 'Chuyển hồ sơ cho Phòng An ninh mạng (CYBER_POLICE) / Sở TT&TT (DEPT_INFO_COMM)' })
  transfer(@Param('id', ParseIntPipe) id: number, @Body() dto: D.TransferDto, @CurrentUser() a: Actor) {
    return this.svc.transfer(id, dto, a);
  }

  @Post(':id/warn')
  @RequirePermissions('violation.manage')
  @ApiOperation({ summary: 'Xử lý bằng nhắc nhở (vi phạm nhẹ) → Hoàn thành' })
  warn(@Param('id', ParseIntPipe) id: number, @Body() dto: D.NoteDto, @CurrentUser() a: Actor) {
    return this.svc.warn(id, dto.note, a);
  }

  @Post(':id/dismiss')
  @RequirePermissions('violation.manage')
  @ApiOperation({ summary: 'Bác bỏ hồ sơ (không đủ căn cứ) — ghi phản hồi FALSE_POSITIVE cho AI' })
  dismiss(@Param('id', ParseIntPipe) id: number, @Body() dto: D.NoteDto, @CurrentUser() a: Actor) {
    return this.svc.dismiss(id, dto.note, a);
  }

  @Post(':id/remediation')
  @RequirePermissions('violation.manage')
  remediation(@Param('id', ParseIntPipe) id: number, @Body() dto: D.RemediationDto, @CurrentUser() a: Actor) {
    return this.svc.setRemediation(id, dto, a);
  }

  @Post(':id/penalty-decisions')
  @RequirePermissions('penalty.manage')
  @ApiOperation({
    summary: 'Lập quyết định xử phạt hành chính',
    description: 'Vi phạm nghiêm trọng hoặc mức phạt >= PENALTY_APPROVAL_THRESHOLD → chờ lãnh đạo phê duyệt; ngược lại ban hành ngay.',
  })
  createPenalty(@Param('id', ParseIntPipe) id: number, @Body() dto: D.CreatePenaltyDto, @CurrentUser() a: Actor) {
    return this.penalty.create(id, dto, a);
  }
}

@ApiTags('4.3 Vi phạm — Xử lý hành chính (quyết định xử phạt)')
@Controller('penalty-decisions')
export class PenaltyController {
  constructor(private readonly svc: PenaltyService) {}

  @Get()
  @RequirePermissions('violation.view')
  list(@Query() q: D.PenaltyQueryDto) {
    return this.svc.list(q);
  }

  @Get('pending-approval')
  @RequirePermissions('penalty.approve')
  @ApiOperation({ summary: 'Quyết định chờ lãnh đạo phê duyệt' })
  pending(@Query() q: D.PenaltyQueryDto) {
    return this.svc.list({ ...q, status: 'PENDING_APPROVAL' });
  }

  @Get(':id')
  @RequirePermissions('violation.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Get(':id/document')
  @RequirePermissions('violation.view')
  @ApiOperation({ summary: 'Tải quyết định xử phạt (file Word .doc)' })
  async doc(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const html = await this.svc.documentHtml(id);
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="quyet-dinh-xu-phat-${id}.doc"`);
    res.send('﻿' + html);
  }

  @Post(':id/approve')
  @RequirePermissions('penalty.approve')
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: D.ApprovalDto, @CurrentUser() a: Actor) {
    return this.svc.approve(id, dto.note, a);
  }

  @Post(':id/reject')
  @RequirePermissions('penalty.approve')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: D.NoteDto, @CurrentUser() a: Actor) {
    return this.svc.reject(id, dto.note, a);
  }

  @Post(':id/execution')
  @RequirePermissions('penalty.manage')
  @ApiOperation({ summary: 'Cập nhật thi hành: PAID / APPEALING / OVERDUE / COMPLIED (chấp hành xong → hồ sơ hoàn thành, giảm rủi ro)' })
  execution(@Param('id', ParseIntPipe) id: number, @Body() dto: D.ExecutionDto, @CurrentUser() a: Actor) {
    return this.svc.execution(id, dto, a);
  }
}

@ApiTags('4.4 Vi phạm — Phản hồi từ đơn vị vi phạm')
@Controller('facility-feedbacks')
export class FeedbackController {
  constructor(private readonly svc: FeedbackService) {}

  @Post()
  @RequirePermissions('feedback.submit')
  @ApiOperation({ summary: 'Cơ sở KCB gửi giải trình / khiếu nại / bằng chứng khắc phục' })
  create(@Body() dto: D.CreateFeedbackDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Post(':id/attachments')
  @RequirePermissions('feedback.submit')
  @UseInterceptors(FilesInterceptor('files', 10, uploadOptions('feedback', [...DOC_EXT, ...IMAGE_EXT])))
  @ApiFile('files', true)
  attach(@Param('id', ParseIntPipe) id: number, @UploadedFiles() files: Express.Multer.File[], @CurrentUser() a: Actor) {
    if (!files?.length) throw new BadRequestException('Chưa chọn file');
    return this.svc.attach(id, files, a);
  }

  @Get('mine')
  @RequirePermissions('feedback.submit')
  mine(@Query() q: D.FeedbackQueryDto, @CurrentUser() a: Actor) {
    return this.svc.mine(a, q);
  }

  @Get()
  @RequirePermissions('feedback.handle')
  @ApiOperation({ summary: 'Hộp thư phản hồi từ cơ sở (chuyên viên)' })
  list(@Query() q: D.FeedbackQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  @RequirePermissions('feedback.handle', 'feedback.submit')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.get(id, a);
  }

  @Post(':id/process')
  @RequirePermissions('feedback.handle')
  process(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.process(id, a);
  }

  @Post(':id/respond')
  @RequirePermissions('feedback.handle')
  @ApiOperation({ summary: 'Kết luận phản hồi: chấp nhận (có thể bác bỏ vi phạm / ghi nhận khắc phục / đổi kết quả kiểm tra trước) hoặc không chấp nhận' })
  respond(@Param('id', ParseIntPipe) id: number, @Body() dto: D.RespondFeedbackDto, @CurrentUser() a: Actor) {
    return this.svc.respond(id, dto, a);
  }
}

@ApiTags('4.5 Vi phạm — Kiểm tra trước thông tin quảng cáo (pre-check)')
@Controller('prechecks')
export class PrecheckController {
  constructor(private readonly svc: PrecheckService, private readonly docText: DocumentTextService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Kiểm tra trước nội dung quảng cáo (KHÔNG cần đăng nhập)',
    description:
      '5 bước: tiếp nhận → AI trích xuất → đối chiếu CSDL → Đạt / Cảnh báo / Không đạt → lưu lịch sử. Người dân / khách: kết quả sơ bộ ngay. Cơ sở KCB đăng nhập: chờ chuyên viên xác minh kết quả cuối cùng.',
  })
  create(@Body() dto: D.CreatePrecheckDto, @CurrentUser() a: Actor | null) {
    return this.svc.create(dto, a);
  }

  @Public()
  @Post('extract-file')
  @UseInterceptors(FileInterceptor('file', uploadOptions('prechecks', [...DOC_EXT, ...IMAGE_EXT])))
  @ApiFile()
  @ApiOperation({ summary: 'Upload nội dung quảng cáo (PDF/Word → lấy chữ; ảnh → lưu đính kèm). Dùng kết quả làm contentText / attachments' })
  async extract(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    const info = fileInfo(file);
    const isImage = IMAGE_EXT.some((e) => file.originalname.toLowerCase().endsWith(e));
    return { attachment: info, contentText: isImage ? '' : await this.docText.extractText(file), note: isImage ? 'Ảnh đã lưu — hãy nhập chữ trên ảnh vào contentText (AI tích hợp chưa có OCR).' : undefined };
  }

  @Public()
  @Get('lookup/:code')
  @ApiOperation({ summary: 'Tra cứu kết quả bằng mã phiếu (VD KT-2026-0001)' })
  lookup(@Param('code') code: string) {
    return this.svc.lookup(code);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Lịch sử kiểm tra của tôi / của cơ sở tôi' })
  mine(@Query() q: D.PrecheckQueryDto, @CurrentUser() a: Actor) {
    return this.svc.mine(a, q);
  }

  @Get()
  @RequirePermissions('precheck.review')
  list(@Query() q: D.PrecheckQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.get(id, a);
  }

  @Post(':id/review')
  @RequirePermissions('precheck.review')
  @ApiOperation({ summary: 'Chuyên viên xác minh, đưa ra kết quả cuối cùng' })
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: D.ReviewPrecheckDto, @CurrentUser() a: Actor) {
    return this.svc.review(id, dto, a);
  }
}

@ApiTags('4.6 Vi phạm — Phát hiện & quản lý đối tượng vi phạm')
@Controller('suspects')
export class SuspectsController {
  constructor(private readonly svc: SuspectsService) {}

  @Get()
  @RequirePermissions('suspect.view')
  list(@Query() q: D.SuspectQueryDto) {
    return this.svc.list(q);
  }

  @Get('dashboard')
  @RequirePermissions('suspect.view')
  @ApiOperation({ summary: 'KPI: tổng đối tượng, rủi ro cao, vi phạm chờ định danh, bản đồ vi phạm theo quận' })
  dashboard() {
    return this.svc.dashboard();
  }

  @Post('detect')
  @RequirePermissions('suspect.manage', 'violation.manage')
  @ApiOperation({ summary: 'AI khoanh vùng đối tượng của 1 hồ sơ vi phạm (Levenshtein + Jaccard, SĐT, tài khoản)' })
  detect(@Body() dto: D.DetectDto, @CurrentUser() a: Actor) {
    return this.svc.detect(dto.violationId, a);
  }

  @Get('match-candidates')
  @RequirePermissions('suspect.manage')
  @ApiQuery({ name: 'status', required: false, description: 'PENDING | MERGED | REJECTED' })
  candidates(@Query() q: any) {
    return this.svc.listCandidates(q);
  }

  @Post('match-candidates/:id/confirm')
  @RequirePermissions('suspect.manage')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.confirmCandidate(id, a);
  }

  @Post('match-candidates/:id/reject')
  @RequirePermissions('suspect.manage')
  @ApiQuery({ name: 'createNew', required: false, description: 'true: tạo đối tượng mới nếu không còn ứng viên' })
  rejectCandidate(@Param('id', ParseIntPipe) id: number, @Query('createNew') createNew: string, @CurrentUser() a: Actor) {
    return this.svc.rejectCandidate(id, !!toBool(createNew), a);
  }

  @Patch('accounts/:accountId/verify')
  @RequirePermissions('suspect.manage')
  verifyAccount(@Param('accountId', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.verifyAccount(id, a);
  }

  @Delete('accounts/:accountId')
  @RequirePermissions('suspect.manage')
  removeAccount(@Param('accountId', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.removeAccount(id, a);
  }

  @Get(':id')
  @RequirePermissions('suspect.view')
  @ApiOperation({ summary: 'Hồ sơ đối tượng: tài khoản nền tảng, timeline vi phạm, điểm rủi ro (chi tiết), hồ sơ điều tra' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @RequirePermissions('suspect.manage')
  create(@Body() dto: D.CreateSuspectDto, @CurrentUser() a: Actor) {
    return this.svc.create(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('suspect.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateSuspectDto, @CurrentUser() a: Actor) {
    return this.svc.update(id, dto, a);
  }

  @Post(':id/accounts')
  @RequirePermissions('suspect.manage')
  addAccount(@Param('id', ParseIntPipe) id: number, @Body() dto: D.AccountDto, @CurrentUser() a: Actor) {
    return this.svc.addAccount(id, dto, a);
  }

  @Post(':id/status')
  @RequirePermissions('suspect.manage')
  @ApiOperation({ summary: 'Xác minh danh tính (VERIFIED) / loại trừ (CLEARED) / theo dõi (MONITORING)' })
  status(@Param('id', ParseIntPipe) id: number, @Body() dto: D.VerifySuspectDto, @CurrentUser() a: Actor) {
    return this.svc.setStatus(id, dto, a);
  }

  @Post(':id/merge')
  @RequirePermissions('suspect.manage')
  @ApiOperation({ summary: 'Gộp hồ sơ trùng vào đối tượng khác' })
  merge(@Param('id', ParseIntPipe) id: number, @Body() dto: D.MergeSuspectDto, @CurrentUser() a: Actor) {
    return this.svc.merge(id, dto.targetSuspectId, a);
  }
}

@ApiTags('4.7 Vi phạm — Hồ sơ phối hợp điều tra (Công an / Sở TT&TT)')
@Controller('investigation-cases')
export class CasesController {
  constructor(private readonly svc: CasesService) {}

  @Get()
  @RequirePermissions('case.view')
  list(@Query() q: D.CaseQueryDto, @CurrentUser() a: Actor) {
    return this.svc.list(q, a);
  }

  @Get(':id')
  @RequirePermissions('case.view')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.get(id, a);
  }

  @Post(':id/accept')
  @RequirePermissions('case.handle', 'violation.manage')
  @ApiOperation({ summary: 'Tiếp nhận hồ sơ chuyển giao' })
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.accept(id, a);
  }

  @Post(':id/updates')
  @RequirePermissions('case.handle', 'violation.manage')
  @ApiOperation({ summary: 'Ghi tiến độ điều tra / trao đổi giữa hai cơ quan' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.CaseNoteDto, @CurrentUser() a: Actor) {
    return this.svc.addUpdate(id, dto, a);
  }

  @Post(':id/identify')
  @RequirePermissions('case.handle', 'violation.manage')
  @ApiOperation({ summary: 'Xác định được đối tượng (gắn đối tượng có sẵn hoặc tạo mới)' })
  identify(@Param('id', ParseIntPipe) id: number, @Body() dto: D.IdentifyDto, @CurrentUser() a: Actor) {
    return this.svc.identify(id, dto, a);
  }

  @Post(':id/complete')
  @RequirePermissions('case.handle', 'violation.manage')
  @ApiOperation({ summary: 'Cập nhật kết quả xử lý về hệ thống → hồ sơ vi phạm quay lại Sở Y tế (hoặc đóng nếu đã xử lý triệt để)' })
  complete(@Param('id', ParseIntPipe) id: number, @Body() dto: D.CompleteCaseDto, @CurrentUser() a: Actor) {
    return this.svc.complete(id, dto, a);
  }

  @Post(':id/return')
  @RequirePermissions('case.handle', 'violation.manage')
  returnCase(@Param('id', ParseIntPipe) id: number, @Body() dto: D.NoteDto, @CurrentUser() a: Actor) {
    return this.svc.returnCase(id, dto.note, a);
  }

  @Post(':id/close')
  @RequirePermissions('case.handle', 'violation.manage')
  @ApiOperation({ summary: 'Lưu trữ hồ sơ điều tra' })
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.close(id, a);
  }
}

@ApiTags('5. Bảng điều khiển & thống kê báo cáo')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly svc: StatisticsService) {}

  @Get('overview')
  @RequirePermissions('statistics.view')
  @ApiOperation({ summary: 'Tổng hợp: vi phạm theo trạng thái / loại / lĩnh vực / quận / tháng, mẫu tin, xử phạt, kiểm tra trước, cơ sở rủi ro cao' })
  overview(@Query() q: D.StatsQueryDto) {
    return this.svc.overview(q);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Việc cần làm của tôi (theo vai trò / quyền) — dùng cho badge trên sidebar' })
  myTasks(@CurrentUser() a: Actor) {
    return this.svc.myTasks(a);
  }

  @Get('export')
  @RequirePermissions('statistics.export')
  @ApiOperation({ summary: 'Xuất báo cáo thống kê ra Excel' })
  async export(@Query() q: D.StatsQueryDto, @Res() res: Response) {
    const o = await this.svc.overview(q);
    const rows = [
      ...o.violations.byStatus.map((r: any) => ({ group: 'Theo trạng thái', key: r.key, count: r.count })),
      ...o.violations.byType.map((r: any) => ({ group: 'Theo loại vi phạm', key: r.name, count: r.count })),
      ...o.violations.byField.map((r: any) => ({ group: 'Theo lĩnh vực', key: r.key, count: r.count })),
      ...o.violations.byDistrict.map((r: any) => ({ group: 'Theo quận/huyện', key: r.key, count: r.count })),
      ...o.violations.byMonth.map((r: any) => ({ group: 'Theo tháng', key: r.key, count: r.count })),
    ];
    return sendXlsx(res, 'bao-cao-thong-ke.xlsx', 'Thống kê', [
      { header: 'Nhóm', key: 'group', width: 22 },
      { header: 'Giá trị', key: 'key', width: 40 },
      { header: 'Số lượng', key: 'count', width: 12 },
    ], rows);
  }
}

@ApiTags('6. Người dân — Tra cứu & phản ánh (không cần đăng nhập)')
@Controller('public')
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  @Public()
  @Get('facilities')
  @ApiOperation({ summary: 'Tra cứu cơ sở KCB được cấp phép (kèm mức độ uy tín)' })
  facilities(@Query() q: D.PublicFacilityQueryDto) {
    return this.svc.facilitiesList(q);
  }

  @Public()
  @Get('facilities/:id')
  @ApiOperation({ summary: 'Chi tiết cơ sở: giấy phép, bác sĩ có CCHN, vi phạm đã kết luận' })
  facility(@Param('id', ParseIntPipe) id: number) {
    return this.svc.facilityDetail(id);
  }

  @Public()
  @Get('violating-facilities')
  @ApiOperation({ summary: 'Tra cứu đơn vị vi phạm (chỉ vi phạm đã có kết luận xử lý)' })
  violators(@Query() q: D.PublicViolatorQueryDto) {
    return this.svc.violators(q);
  }

  @Public()
  @Post('reports')
  @ApiOperation({ summary: 'Phản ánh quảng cáo y tế nghi vấn (vào hàng đợi kiểm tra của Sở Y tế)' })
  report(@Body() dto: D.CitizenReportDto, @CurrentUser() a: Actor | null) {
    return this.svc.report(dto, a);
  }

  @Get('reports/mine')
  @ApiOperation({ summary: 'Theo dõi các phản ánh của tôi' })
  myReports(@CurrentUser() a: Actor) {
    return this.svc.myReports(a);
  }
}

@ApiTags('7. Cổng cơ sở KCB')
@Controller('facility-portal')
export class FacilityPortalController {
  constructor(
    private readonly svc: PublicService,
    private readonly penalties: PenaltyService,
  ) {}

  @Get('profile')
  @Roles('FACILITY')
  @ApiOperation({ summary: 'Hồ sơ cơ sở của tôi + giấy phép' })
  profile(@CurrentUser() a: Actor) {
    return this.svc.portalProfile(a);
  }

  @Get('violations')
  @Roles('FACILITY')
  @ApiOperation({ summary: 'Các hồ sơ vi phạm của cơ sở tôi (để gửi giải trình)' })
  violations(@CurrentUser() a: Actor) {
    return this.svc.portalViolations(a);
  }

  @Get('violations/:id')
  @Roles('FACILITY')
  violation(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.portalViolation(a, id);
  }

  @Get('penalties/:id/document')
  @Roles('FACILITY')
  @ApiOperation({ summary: 'Cơ sở tải quyết định xử phạt đã ban hành cho cơ sở mình (file Word .doc)' })
  async penaltyDocument(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor, @Res() res: Response) {
    const p = await this.penalties.get(id);
    if (!a?.facilityId || String(p.facilityId) !== String(a.facilityId) || p.status !== 'ISSUED') {
      throw new ForbiddenException('Chỉ tải được quyết định đã ban hành cho cơ sở của bạn');
    }
    const html = await this.penalties.documentHtml(id);
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="quyet-dinh-xu-phat-${id}.doc"`);
    res.send('\uFEFF' + html);
  }
}
