import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CrawlSchedule, CrawlJob } from '../entities';

export interface CrawlerTriggerResponse {
  jobId: number;
  scheduleName: string;
  estimatedItems: number;
  message: string;
}

/**
 * Crawler Orchestrator Service
 * Quản lý việc trigger crawler services và theo dõi crawl jobs
 */
@Injectable()
export class CrawlerOrchestratorService {
  private readonly logger = new Logger('CrawlerOrchestrator');
  private readonly googleCrawlerUrl: string;
  private readonly facebookCrawlerUrl: string;
  private readonly enableAutoTrigger: boolean;
  private readonly backendPublicUrl: string;
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(CrawlSchedule)
    private readonly schedules: Repository<CrawlSchedule>,
    @InjectRepository(CrawlJob)
    private readonly jobs: Repository<CrawlJob>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.googleCrawlerUrl = this.config.get<string>('GOOGLE_CRAWLER_URL', '');
    this.facebookCrawlerUrl = this.config.get<string>('FACEBOOK_CRAWLER_URL', '');
    this.enableAutoTrigger = this.config.get<boolean>('ENABLE_AUTO_CRAWL', false);
    this.backendPublicUrl = this.config.get<string>('BACKEND_PUBLIC_URL', 'http://localhost:3001');
    this.webhookSecret = this.config.get<string>('CRAWLER_WEBHOOK_SECRET', '');

    if (this.enableAutoTrigger) {
      this.logger.log('✅ Auto-trigger crawler enabled');
    } else {
      this.logger.log('⚠️  Auto-trigger disabled (manual only)');
    }
  }

  /**
   * CRON JOB: Chạy mỗi giờ
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoCheckSchedules() {
    if (!this.enableAutoTrigger) return;

    this.logger.log('🔄 Auto-checking schedules...');
    const activeSchedules = await this.schedules.find({
      where: { status: 'RUNNING' },
      relations: { source: true, topic: true },
    });

    let triggered = 0;
    for (const schedule of activeSchedules) {
      if (await this.shouldRunNow(schedule)) {
        try {
          await this.triggerSchedule(schedule.id, 'SYSTEM');
          triggered++;
        } catch (e) {
          this.logger.error(`Auto-trigger failed ${schedule.id}: ${e.message}`);
        }
      }
    }
    if (triggered > 0) this.logger.log(`✅ Triggered ${triggered} schedules`);
  }

  private async shouldRunNow(schedule: CrawlSchedule): Promise<boolean> {
    if (!schedule.lastRunAt) return true;
    const hours = (Date.now() - schedule.lastRunAt.getTime()) / (1000 * 60 * 60);
    switch (schedule.frequency) {
      case '24/7': return hours >= 24;
      case 'EVERY_2H': return hours >= 2;
      case 'DAILY': return hours >= 24;
      case 'WEEKLY': return hours >= 168;
      default: return false;
    }
  }

  async triggerScheduleManual(scheduleId: number, userId: string): Promise<CrawlerTriggerResponse> {
    return this.triggerSchedule(scheduleId, userId);
  }

  private async triggerSchedule(scheduleId: number, triggeredBy: string): Promise<CrawlerTriggerResponse> {
    const schedule = await this.schedules.findOne({
      where: { id: scheduleId },
      relations: { source: true, topic: true },
    });

    if (!schedule) throw new NotFoundException(`Schedule ${scheduleId} not found`);
    if (schedule.status !== 'RUNNING') {
      throw new BadRequestException(`Schedule not RUNNING (current: ${schedule.status})`);
    }

    const job = this.jobs.create({
      schedule,
      status: 'RUNNING',
      startedAt: new Date(),
      itemsCollected: 0,
      triggeredBy: triggeredBy === 'SYSTEM' ? null : triggeredBy,
    });
    await this.jobs.save(job);

    schedule.lastRunAt = new Date();
    await this.schedules.save(schedule);

    this.logger.log(`✅ Created job ${job.id} for "${schedule.name}"`);

    this.callCrawlerService(job, schedule).catch((error) => {
      this.logger.error(`Crawler failed for job ${job.id}: ${error.message}`);
      job.status = 'FAILED';
      job.finishedAt = new Date();
      job.note = `Error: ${error.message}`;
      this.jobs.save(job);
    });

    return {
      jobId: job.id,
      scheduleName: schedule.name,
      estimatedItems: schedule.sampleLimit,
      message: `Job ${job.id} started. Results via webhook.`,
    };
  }

  private async callCrawlerService(job: CrawlJob, schedule: CrawlSchedule) {
    const keywords = [schedule.primaryKeywords, schedule.secondaryKeywords]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const source = schedule.source;
    if (!source) throw new Error('Schedule missing source');

    let crawlerUrl: string;
    let payload: any;

    if (source.platform === 'GOOGLE') {
      if (!this.googleCrawlerUrl) throw new Error('GOOGLE_CRAWLER_URL not configured');
      crawlerUrl = `${this.googleCrawlerUrl}/crawl`;
      payload = {
        num_ads: schedule.sampleLimit || 100,
        keywords,
        callback_url: `${this.backendPublicUrl}/webhooks/crawler-results`,
        webhook_secret: this.webhookSecret,
        job_id: job.id,
      };
    } else if (source.platform === 'FACEBOOK' || source.platform === 'TIKTOK') {
      if (!this.facebookCrawlerUrl) throw new Error('FACEBOOK_CRAWLER_URL not configured');
      crawlerUrl = `${this.facebookCrawlerUrl}/crawl`;
      payload = {
        platform: source.platform.toLowerCase(),
        keywords,
        max_posts: schedule.sampleLimit || 100,
        callback_url: `${this.backendPublicUrl}/webhooks/crawler-results`,
        webhook_secret: this.webhookSecret,
        job_id: job.id,
      };
    } else {
      throw new Error(`Unsupported platform: ${source.platform}`);
    }

    this.logger.log(`Calling ${source.platform} crawler: ${crawlerUrl}`);
    const response = await firstValueFrom(
      this.http.post(crawlerUrl, payload, { timeout: 60000 }),
    );
    this.logger.log(`✅ Crawler accepted job ${job.id}`);
  }

  async listJobs(filters: { scheduleId?: number; status?: string; limit?: number }) {
    const qb = this.jobs.createQueryBuilder('j')
      .leftJoinAndSelect('j.schedule', 's')
      .orderBy('j.startedAt', 'DESC');
    if (filters.scheduleId) qb.andWhere('j.schedule_id = :scheduleId', { scheduleId: filters.scheduleId });
    if (filters.status) qb.andWhere('j.status = :status', { status: filters.status });
    if (filters.limit) qb.take(filters.limit);
    return qb.getMany();
  }

  async getJob(jobId: number) {
    const job = await this.jobs.findOne({
      where: { id: jobId },
      relations: { schedule: { source: true, topic: true } },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }
}

