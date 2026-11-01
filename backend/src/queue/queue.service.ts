import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

/**
 * Message format AI Service expects
 */
export interface AiQueueMessage {
  job_id?: string;
  content?: string;
  url?: string;
  crawl_source?: string;
  images?: string[];
  keyword?: string;
  request_id?: string;
}

/**
 * Queue Service - Publish messages to RabbitMQ
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger('QueueService');
  private readonly enabled: boolean;

  constructor(
    @Optional() @Inject('AI_QUEUE') private readonly aiQueue: ClientProxy | null,
  ) {
    this.enabled = !!this.aiQueue;
    
    if (this.enabled) {
      this.logger.log('✅ RabbitMQ Queue Service enabled');
    } else {
      this.logger.warn('⚠️  RabbitMQ Queue Service disabled (RABBITMQ_URL not configured)');
    }
  }

  /**
   * Check if queue is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Publish message to AI classify queue
   */
  async publishToAI(message: AiQueueMessage): Promise<void> {
    if (!this.enabled) {
      throw new Error('RabbitMQ not configured. Set RABBITMQ_URL in .env');
    }

    try {
      this.logger.debug(`Publishing to AI queue: ${JSON.stringify(message)}`);

      // Emit message (fire-and-forget, AI Service sẽ consume)
      this.aiQueue.emit('ai_classify', message);

      this.logger.log(`✅ Published message to AI queue (request_id: ${message.request_id})`);
    } catch (error) {
      this.logger.error(`Failed to publish to AI queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish với job_id (cho crawl jobs)
   * AI Service sẽ tự fetch từ crawl_ads table dựa vào job_id
   */
  async publishCrawlJobToAI(jobId: number): Promise<void> {
    const message: AiQueueMessage = {
      job_id: jobId.toString(),
    };

    await this.publishToAI(message);
  }

  /**
   * Publish direct content (cho user uploads hoặc manual items)
   */
  async publishDirectContentToAI(
    content: string,
    metadata: {
      url?: string;
      crawl_source?: string;
      images?: string[];
      keyword?: string;
      request_id?: string;
    },
  ): Promise<void> {
    const message: AiQueueMessage = {
      content,
      ...metadata,
    };

    await this.publishToAI(message);
  }

  /**
   * Health check - verify RabbitMQ connection
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.enabled) {
      return {
        healthy: false,
        message: 'RabbitMQ not configured',
      };
    }

    try {
      await this.aiQueue.connect();
      return {
        healthy: true,
        message: 'Connected to RabbitMQ',
      };
    } catch (error) {
      this.logger.error(`RabbitMQ health check failed: ${error.message}`);
      return {
        healthy: false,
        message: error.message,
      };
    }
  }
}
