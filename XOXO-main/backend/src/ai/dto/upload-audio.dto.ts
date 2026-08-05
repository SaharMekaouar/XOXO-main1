import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UploadAudioDto {
  @IsOptional()
  @IsNotEmpty()
  file: Express.Multer.File;

  @IsOptional() 
  @IsUrl() 
  @IsString()
  url: string;
}
