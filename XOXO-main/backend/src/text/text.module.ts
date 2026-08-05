// src/text/text.module.ts
import { Module } from '@nestjs/common';
import { TextService } from './text.service';
import { TextController } from './text.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { TextSchema,Text } from './schemas/text.schema';
@Module({
  imports: [MongooseModule.forFeature([{ name: Text.name, schema: TextSchema }])],
  controllers: [TextController],
  providers: [TextService],
})
export class TextModule {}
