import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import {
  CrawlCatalogController,
  CrawlScheduleController,
  FacilitiesController,
  FacilityTypesController,
  LegalDocTypesController,
  LegalDocumentsController,
  LicensesController,
} from './info-source.controller';
import { CrawlerController } from './crawler.controller';
import { CrawlService, FacilitiesService, LegalDocumentsService, LicensesService } from './info-source.service';
import { CrawlerOrchestratorService } from './crawler-orchestrator.service';
import { CrawlSchedule, CrawlJob } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrawlSchedule, CrawlJob]),
    HttpModule,
  ],
  controllers: [
    LegalDocTypesController,
    LegalDocumentsController,
    FacilityTypesController,
    FacilitiesController,
    LicensesController,
    CrawlCatalogController,
    CrawlScheduleController,
    CrawlerController,
  ],
  providers: [
    LegalDocumentsService,
    FacilitiesService,
    LicensesService,
    CrawlService,
    CrawlerOrchestratorService,
  ],
  exports: [LicensesService, FacilitiesService, CrawlerOrchestratorService],
})
export class InfoSourceModule {}
