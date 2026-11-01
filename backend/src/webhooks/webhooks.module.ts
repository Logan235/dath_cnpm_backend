import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { CrawlJob, AdItem } from '../entities';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrawlJob, AdItem]),
    QueueModule,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
