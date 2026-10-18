import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTurnDto {
  @IsString()
  speakerName!: string;

  @IsString()
  originalLang!: string;

  @IsString()
  originalText!: string;

  @IsObject()
  translations!: Record<string, string>;
}
