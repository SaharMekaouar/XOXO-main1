import { IsBoolean } from 'class-validator';

export class tagclipDto {
  @IsBoolean()
  isPinned?: boolean;
}