import { IsString, IsNotEmpty,IsOptional } from 'class-validator';

export class CreateSavedTextDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  title?: string;  
}