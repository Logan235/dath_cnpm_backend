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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Actor, CurrentUser, RequirePermissions } from '../common/auth';
import { ApiFile } from '../common/swagger';
import { DOC_EXT, IMAGE_EXT, DocumentTextService, fileInfo, uploadOptions } from '../core/files';
import { sendCsv } from '../common/utils/export';
import * as D from './ad-processing.dto';
import { AdItemsService, AiOpsService, ReviewService } from './ad-processing.service';

@ApiTags('3.1 Xử lý QC — Mẫu tin, kết quả thu thập, lọc, phân loại')
@Controller('ad-items')
export class AdItemsController {
  constructor(
    private readonly svc: AdItemsService,
    private readonly review: ReviewService,
    private readonly docText: DocumentTextService,
  ) {}

  @Get()
  @RequirePermissions('ad_item.view')
  @ApiOperation({
    summary: 'Danh sách mẫu tin',
    description:
      'Kết quả thu thập tin: status=COLLECTED · Kết quả lọc: status=FILTERED,FILTER_REJECTED · Kết quả AI: status=AI_ANALYZED,IN_REVIEW · Đã xử lý: status=CONFIRMED_VIOLATION,NOT_VIOLATION',
  })
  list(@Query() q: D.AdItemQueryDto, @CurrentUser() a: Actor) {
    return this.svc.list(q, a);
  }

  @Get('classification/stats')
  @RequirePermissions('ad_item.view')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Quản lý phân loại tin: thống kê theo định dạng, nguồn, lĩnh vực, đối tượng, mức nghi vấn' })
  classificationStats(@Query() q: { from?: string; to?: string }) {
    return this.svc.classificationStats(q);
  }

  @Post('ingest')
  @RequirePermissions('ad_item.qc', 'crawl.manage')
  @ApiOperation({ summary: 'Tiếp nhận mẫu tin từ crawler / đơn vị phối hợp / nhập tay (vào trạng thái COLLECTED)' })
  ingest(@Body() dto: D.IngestDto, @CurrentUser() a: Actor) {
    return this.svc.ingest(dto, a);
  }

  @Post('qc/extract')
  @RequirePermissions('ad_item.qc')
  @ApiOperation({ summary: 'Kiểm tra nhanh QC — "Lấy nội dung" từ URL hoặc văn bản + bảng kiểm tra GPHĐ / CCHN cơ sở, bác sĩ' })
  qcExtract(@Body() dto: D.QcExtractDto) {
    return this.svc.qcExtract(dto);
  }

  @Post('qc/extract-file')
  @RequirePermissions('ad_item.qc')
  @UseInterceptors(FileInterceptor('file', uploadOptions('qc', [...DOC_EXT, ...IMAGE_EXT])))
  @ApiFile()
  @ApiOperation({ summary: 'Kiểm tra nhanh QC từ file (PDF/Word lấy chữ; ảnh: lưu làm minh chứng — cần OCR của AI thật để đọc chữ)' })
  async qcExtractFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    const info = fileInfo(file);
    const isImage = IMAGE_EXT.some((e) => file.originalname.toLowerCase().endsWith(e));
    if (isImage) {
      return { file: info, content: '', note: 'Ảnh đã được lưu. Bộ AI tích hợp chưa có OCR — hãy nhập nội dung chữ trên ảnh vào POST /ad-items/qc/extract (trường text) hoặc cấu hình AI_SERVICE_URL.' };
    }
    const text = await this.docText.extractText(file);
    return { file: info, ...(await this.svc.qcCheckTable(text)) };
  }

  @Post('qc/decision')
  @RequirePermissions('ad_item.qc')
  @ApiOperation({ summary: 'Kiểm tra nhanh QC — loại bỏ hoặc chuyển tiếp mẫu tin (chỉ trạng thái COLLECTED, cần confirm: true)' })
  qcDecision(@Body() dto: D.QcDecisionDto, @CurrentUser() a: Actor) {
    return this.svc.qcDecision(dto, a);
  }

  @Post('auto-filter')
  @RequirePermissions('ad_item.qc')
  @ApiOperation({ summary: '"Tự động lọc tất cả": loại trùng lặp, whitelist, không liên quan y tế; mẫu tin đạt → AI phân tích' })
  autoFilter(@Body() dto: D.IdsDto, @CurrentUser() a: Actor) {
    return this.svc.autoFilter(dto, a);
  }

  @Post('analyze')
  @RequirePermissions('ai.run')
  @ApiOperation({ summary: 'Gửi mẫu tin cho AI phân tích (mặc định: mọi mẫu tin FILTERED; có ids: phân tích lại)' })
  analyze(@Body() dto: D.IdsDto, @CurrentUser() a: Actor) {
    return this.svc.analyzeItems(dto.ids, a);
  }

  @Post('delete')
  @RequirePermissions('ad_item.qc')
  @ApiOperation({ summary: 'Xóa mẫu tin (không thể khôi phục, cần confirm: true; mẫu tin đã thành hồ sơ vi phạm không xóa được)' })
  remove(@Body() dto: D.DeleteItemsDto, @CurrentUser() a: Actor) {
    return this.svc.deleteItems(dto, a);
  }

  @Get(':id')
  @RequirePermissions('ad_item.view')
  @ApiOperation({ summary: 'Chi tiết mẫu tin: nội dung, metadata, các lần AI phân tích, các đánh giá' })
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Patch(':id/classification')
  @RequirePermissions('ad_item.qc')
  @ApiOperation({ summary: 'Phân loại tin thủ công (lĩnh vực, đối tượng, mức nghi vấn, định dạng, chủ đề)' })
  classify(@Param('id') id: string, @Body() dto: D.ClassifyDto, @CurrentUser() a: Actor) {
    return this.svc.classify(id, dto, a);
  }

  // ----- Human-in-the-loop trên từng mẫu tin -----
  @Get(':id/decision-support')
  @RequirePermissions('review.submit', 'review.resolve')
  @ApiOperation({ summary: 'Hỗ trợ ra quyết định: nội dung gốc, kết quả AI, cơ sở + giấy phép, văn bản pháp lý, lịch sử vi phạm, tin tương tự' })
  decisionSupport(@Param('id') id: string) {
    return this.review.decisionSupport(id);
  }

  @Get(':id/reviews')
  @RequirePermissions('ad_item.view')
  reviews(@Param('id') id: string) {
    return this.review.reviewsOf(id);
  }

  @Post(':id/reviews')
  @RequirePermissions('review.submit')
  @ApiOperation({
    summary: 'Chuyên viên đánh giá kết quả AI (đúng / sai, sửa nhãn, lý do)',
    description: 'Đủ REVIEW_REQUIRED_COUNT đánh giá thống nhất → chốt kết luận. VIOLATION → tự lập hồ sơ vi phạm (+ khoanh vùng đối tượng nếu không rõ cơ sở). Kết luận khác nhau → CONFLICT chờ lãnh đạo.',
  })
  submitReview(@Param('id') id: string, @Body() dto: D.ReviewDto, @CurrentUser() a: Actor) {
    return this.review.submitReview(id, dto, a);
  }

  @Post(':id/resolve-conflict')
  @RequirePermissions('review.resolve')
  @ApiOperation({ summary: 'Lãnh đạo giải quyết xung đột đánh giá' })
  resolve(@Param('id') id: string, @Body() dto: D.ResolveConflictDto, @CurrentUser() a: Actor) {
    return this.review.resolveConflict(id, dto, a);
  }

  @Post(':id/assign')
  @RequirePermissions('review.resolve')
  @ApiOperation({ summary: 'Lãnh đạo giao mẫu tin cho chuyên viên' })
  assign(@Param('id') id: string, @Body() dto: D.AssignDto, @CurrentUser() a: Actor) {
    return this.review.assign(id, dto.userId, a);
  }

  @Post(':id/release')
  @RequirePermissions('review.submit')
  @ApiOperation({ summary: 'Trả mẫu tin về hàng đợi chung' })
  release(@Param('id') id: string, @CurrentUser() a: Actor) {
    return this.review.release(id, a);
  }
}

@ApiTags('3.2 Xử lý QC — Hàng đợi đánh giá chuyên viên (HITL)')
@Controller('review-queue')
export class ReviewQueueController {
  constructor(private readonly review: ReviewService) {}

  @Get()
  @RequirePermissions('review.submit')
  @ApiQuery({ name: 'scope', required: false, description: 'mine | unassigned | (trống: tất cả)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiOperation({ summary: 'Hàng đợi ưu tiên (điểm cao trước); không gồm mẫu tin bạn đã đánh giá' })
  queue(@Query() q: any, @CurrentUser() a: Actor) {
    return this.review.queue(q, a);
  }

  @Post('claim')
  @RequirePermissions('review.submit')
  @ApiOperation({ summary: 'Nhận việc: lấy N mẫu tin ưu tiên cao nhất chưa có người nhận' })
  claim(@Body() dto: D.ClaimDto, @CurrentUser() a: Actor) {
    return this.review.claim(dto.count ?? 5, a);
  }
}

@ApiTags('3.3 Xử lý QC — Whitelist')
@Controller('whitelist')
export class WhitelistController {
  constructor(private readonly svc: AiOpsService) {}

  @Get()
  @RequirePermissions('whitelist.manage', 'ad_item.view')
  list(@Query() q: D.WhitelistQueryDto) {
    return this.svc.listWhitelist(q);
  }

  @Post()
  @RequirePermissions('whitelist.manage')
  create(@Body() dto: D.CreateWhitelistDto, @CurrentUser() a: Actor) {
    return this.svc.createWhitelist(dto, a);
  }

  @Patch(':id')
  @RequirePermissions('whitelist.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateWhitelistDto, @CurrentUser() a: Actor) {
    return this.svc.updateWhitelist(id, dto, a);
  }

  @Delete(':id')
  @RequirePermissions('whitelist.manage')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() a: Actor) {
    return this.svc.removeWhitelist(id, a);
  }
}

@ApiTags('3.4 Xử lý QC — Mô hình AI & tái huấn luyện')
@Controller('ai')
export class AiController {
  constructor(private readonly svc: AiOpsService) {}

  @Post('analyze-text')
  @RequirePermissions('ai.run', 'review.submit')
  @ApiOperation({ summary: 'Thử AI trên một đoạn văn bản bất kỳ (không lưu)' })
  analyzeText(@Body() dto: D.AnalyzeTextDto) {
    return this.svc.analyzeText(dto);
  }

  @Get('models')
  @RequirePermissions('ai.run', 'ai_feedback.export', 'statistics.view')
  models() {
    return this.svc.listModels();
  }

  @Patch('models/:id')
  @RequirePermissions('ai_feedback.export')
  updateModel(@Param('id', ParseIntPipe) id: number, @Body() dto: D.UpdateModelDto, @CurrentUser() a: Actor) {
    return this.svc.updateModel(id, dto, a);
  }

  @Get('performance')
  @RequirePermissions('ai_feedback.export', 'statistics.view')
  @ApiOperation({ summary: 'Hiệu suất AI so với kết luận chuyên viên (accuracy, precision, recall, F1) + đồng thuận giữa chuyên viên' })
  performance() {
    return this.svc.performance();
  }

  @Get('feedback')
  @RequirePermissions('ai_feedback.export')
  @ApiQuery({ name: 'feedbackType', required: false, description: 'CONFIRMED | FALSE_POSITIVE | FALSE_NEGATIVE | RELABEL' })
  @ApiQuery({ name: 'exported', required: false })
  listFeedback(@Query() q: any) {
    return this.svc.listFeedback(q);
  }

  @Get('feedback/export')
  @RequirePermissions('ai_feedback.export')
  @ApiOperation({ summary: 'Xuất tập dữ liệu phản hồi để tái huấn luyện (jsonl / csv)' })
  async exportFeedback(@Query() q: D.FeedbackExportDto, @Res() res: Response, @CurrentUser() a: Actor) {
    const rows = await this.svc.exportFeedback(q, a);
    if (q.format === 'csv') {
      return sendCsv(
        res,
        'ai-feedback.csv',
        ['id', 'text', 'ai_label', 'ai_violation_types', 'human_label', 'human_violation_types', 'feedback_type', 'note', 'created_at'].map((k) => ({ header: k, key: k })),
        rows,
      );
    }
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ai-feedback.jsonl"');
    res.send(rows.map((r) => JSON.stringify(r)).join('\n'));
  }
}
