import{PartialType }from '@nestjs/mapped-types';
import { CreateSavedTextDto } from './create-saved-text.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateClipDto extends PartialType(CreateSavedTextDto) {

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
  
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  title?: string; 
  
  @IsOptional()  
  @IsString()
  content?:string; 
}


