import { Module } from '@nestjs/common';
import {
  CrawlCatalogController,
  CrawlScheduleController,
  FacilitiesController,
  FacilityTypesController,
  LegalDocTypesController,
  LegalDocumentsController,
  LicensesController,
} from './info-source.controller';
import { CrawlService, FacilitiesService, LegalDocumentsService, LicensesService } from './info-source.service';

@Module({
  controllers: [
    LegalDocTypesController,
    LegalDocumentsController,
    FacilityTypesController,
    FacilitiesController,
    LicensesController,
    CrawlCatalogController,
    CrawlScheduleController,
  ],
  providers: [LegalDocumentsService, FacilitiesService, LicensesService, CrawlService],
  exports: [LicensesService, FacilitiesService],
})
export class InfoSourceModule {}
