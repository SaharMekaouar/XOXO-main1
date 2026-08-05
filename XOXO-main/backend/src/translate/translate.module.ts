import { Module } from '@nestjs/common';
import { TranslationService } from './translate.service';
import { TranslationController } from './translate.controller';


@Module({
  controllers: [TranslationController],
  providers: [TranslationService],
})
export class TranslationModule {}