import { Module } from '@nestjs/common';
import {
  CasesController,
  FacilityPortalController,
  FeedbackController,
  PenaltyController,
  PrecheckController,
  PublicController,
  StatisticsController,
  SuspectsController,
  ViolationTypesController,
  ViolationsController,
} from './violations.controller';
import { FeedbackService, PenaltyService, ViolationTypesService, ViolationsService } from './violations.service';
import { CasesService, PrecheckService, PublicService, StatisticsService, SuspectsService } from './investigation.service';

@Module({
  controllers: [
    ViolationTypesController,
    ViolationsController,
    PenaltyController,
    FeedbackController,
    PrecheckController,
    SuspectsController,
    CasesController,
    StatisticsController,
    PublicController,
    FacilityPortalController,
  ],
  providers: [
    ViolationTypesService,
    ViolationsService,
    PenaltyService,
    FeedbackService,
    PrecheckService,
    SuspectsService,
    CasesService,
    StatisticsService,
    PublicService,
  ],
})
export class ViolationsModule {}
