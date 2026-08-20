// src/text/text.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CreateTextDto } from './dto/create-text.dto';
import { Text, TextDocument } from './schemas/text.schema';

@Injectable()
export class TextService {
  constructor(
    @InjectModel(Text.name) private textModel: Model<TextDocument>,
  ) {}

  async generateUrl(dto: CreateTextDto): Promise<string> {
    const uuid = uuidv4();

    // Enregistrement en DB
    const newText = new this.textModel({
      uuid,
      text: dto.text,
      type: dto.type,
    });

    await newText.save();

    return `http://localhost:3000/text/view/${dto.type}/${uuid}`;
  }

  async getTextByUuid(uuid: string): Promise<{ text: string; type: string }> {
    const record = await this.textModel.findOne({ uuid });
    if (!record) {
      throw new NotFoundException('Texte introuvable.');
    }
    return { text: record.text, type: record.type };
  }
}
