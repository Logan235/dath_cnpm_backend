import {
  Controller,
  Post,
  Body,
  Logger,
  Headers,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/auth';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlJob, AdItem } from '../entities';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../queue/queue.service';

interface CrawlerWebhookPayload {
  job_id: number;
  status: 'completed' | 'failed' | 'partial';
  total_collected: number;
  items: Array<{
    url: string;
    title?: string;
    content: string;
    platform: string;
    author_name?: string;
    author_account?: string;
    published_at?: string;
    images?: string[];
    videos?: string[];
    metadata?: any;
  }>;
  error?: string;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger('Webhooks');

  constructor(
    @InjectRepository(CrawlJob)
    private readonly jobs: Repository<CrawlJob>,
    @InjectRepository(AdItem)
    private readonly adItems: Repository<AdItem>,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
  ) {}

  @Post('crawler-results')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook endpoint cho crawler gửi kết quả về' })
  async handleCrawlerResults(
    @Body() payload: CrawlerWebhookPayload,
    @Headers('x-webhook-secret') secret: string,
  ) {
    const expectedSecret = this.config.get<string>('CRAWLER_WEBHOOK_SECRET');
    if (expectedSecret && secret !== expectedSecret) {
      this.logger.warn(`❌ Invalid webhook secret from crawler`);
      throw new BadRequestException('Invalid webhook secret');
    }

    this.logger.log(
      `📥 Webhook: job=${payload.job_id}, status=${payload.status}, items=${payload.items?.length || 0}`,
    );

    try {
      const job = await this.jobs.findOne({
        where: { id: payload.job_id },
        relations: { schedule: { source: true, topic: true } },
      });

      if (!job) {
        this.logger.error(`Job ${payload.job_id} not found`);
        return { success: false, error: 'Job not found' };
      }

      let savedCount = 0;
      let duplicateCount = 0;

      if (payload.items && payload.items.length > 0) {
        for (const item of payload.items) {
          try {
            const hash = this.calculateContentHash(item.content);
            const existing = await this.adItems.findOne({ where: { contentHash: hash } });

            if (existing) {
              duplicateCount++;
              continue;
            }

            const adItem = this.adItems.create({
              sourceType: 'CRAWLER',
              crawlJobId: job.id,
              scheduleId: job.schedule?.id,
              crawlSourceId: job.schedule?.source?.id,
              topicId: job.schedule?.topic?.id,
              platform: item.platform,
              sourceUrl: item.url,
              authorName: item.author_name,
              authorAccount: item.author_account,
              title: item.title,
              content: item.content,
              contentHash: hash,
              media: [
                ...(item.images || []).map((url) => ({ type: 'IMAGE', url })),
                ...(item.videos || []).map((url) => ({ type: 'VIDEO', url })),
              ],
              dataFormat: this.detectDataFormat(item),
              publishedAt: item.published_at ? new Date(item.published_at) : null,
              collectedAt: new Date(),
              status: 'COLLECTED',
              priority: 0,
            });

            await this.adItems.save(adItem);
            savedCount++;
          } catch (e) {
            this.logger.error(`Failed to save item: ${e.message}`);
          }
        }
      }

      job.itemsCollected = savedCount;
      job.status = payload.status === 'completed' ? 'COMPLETED' : 'FAILED';
      job.finishedAt = new Date();
      if (payload.error) job.note = `Crawler error: ${payload.error}`;
      await this.jobs.save(job);

      this.logger.log(`✅ Processed: saved=${savedCount}, duplicates=${duplicateCount}`);

      return {
        success: true,
        collected: savedCount,
        duplicates: duplicateCount,
      };
    } catch (error) {
      this.logger.error(`❌ Webhook processing failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private calculateContentHash(content: string): string {
    const crypto = require('crypto');
    const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  private detectDataFormat(item: any): string {
    if (item.videos && item.videos.length > 0) return 'VIDEO';
    if (item.images && item.images.length > 0) return 'IMAGE';
    return 'TEXT';
  }
}
