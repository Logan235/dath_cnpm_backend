import { Controller, Post, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { CurrentUser, Actor, RequirePermissions } from '../common/auth';

@ApiTags('2.4 Crawler Orchestrator')
@Controller('crawler')
export class CrawlerController {
  constructor(private readonly orchestrator: CrawlerOrchestratorService) {}

  @Post('trigger/:scheduleId')
  @RequirePermissions('crawl.manage')
  @ApiOperation({ summary: 'Kích hoạt crawler theo schedule (manual trigger từ UI)' })
  async triggerSchedule(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @CurrentUser() actor: Actor,
  ) {
    return this.orchestrator.triggerScheduleManual(scheduleId, actor.userId);
  }

  @Get('jobs')
  @RequirePermissions('crawl.view')
  @ApiOperation({ summary: 'Danh sách crawl jobs (lịch sử thu thập)' })
  async listJobs(
    @Query('scheduleId', new ParseIntPipe({ optional: true })) scheduleId?: number,
    @Query('status') status?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.orchestrator.listJobs({ scheduleId, status, limit: limit || 50 });
  }

  @Get('jobs/:jobId')
  @RequirePermissions('crawl.view')
  @ApiOperation({ summary: 'Chi tiết crawl job' })
  async getJob(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.orchestrator.getJob(jobId);
  }
}
