import { IsEmail, IsString, MinLength } from 'class-validator';

export class InviteParticipantDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  lang!: string;
}