import { Module, Global } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

/**
 * Queue Module - RabbitMQ Integration
 * Global module để các module khác có thể inject QueueService
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    QueueService,
    {
      provide: 'AI_QUEUE',
      useFactory: (config: ConfigService) => {
        const rabbitmqUrl = config.get<string>('RABBITMQ_URL');

        if (!rabbitmqUrl) {
          return null;
        }

        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [rabbitmqUrl],
            queue: 'ai_classify',
            queueOptions: {
              durable: true,
            },
            // Không auto-ack để đảm bảo message được xử lý thành công
            noAck: false,
            // Prefetch 1 message tại 1 thời điểm (AI xử lý tuần tự)
            prefetchCount: 1,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [QueueService, 'AI_QUEUE'],
})
export class QueueModule {}
