import { IsBoolean } from 'class-validator';

export class FavoriteClipDto {
  @IsBoolean()
  isFavorite: boolean;
}