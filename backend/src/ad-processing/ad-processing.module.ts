import { Module } from '@nestjs/common';
import { AdItemsController, AiController, ReviewQueueController, WhitelistController } from './ad-processing.controller';
import { AdItemsService, AiOpsService, ReviewService } from './ad-processing.service';

@Module({
  controllers: [AdItemsController, ReviewQueueController, WhitelistController, AiController],
  providers: [AdItemsService, ReviewService, AiOpsService],
  exports: [AdItemsService],
})
export class AdProcessingModule {}
