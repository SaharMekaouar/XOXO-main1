// src/text/schemas/text.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TextDocument = Text & Document;

@Schema()
export class Text {
  @Prop({ required: true })
  uuid: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  type: string;
}

export const TextSchema = SchemaFactory.createForClass(Text);
