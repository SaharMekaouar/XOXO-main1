import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateMeetingDto {
  @IsIn(['onsite', 'remote'])
  mode!: 'onsite' | 'remote';

  @IsString()
  lang!: string;

  @IsOptional()
  @IsString()
  title?: string;
}