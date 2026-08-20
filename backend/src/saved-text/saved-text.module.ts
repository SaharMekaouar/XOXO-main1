import { Module } from '@nestjs/common';
import { SavedTextController } from './saved-text.controller';
import { SavedTextService } from './saved-text.service';
import { AuthModule } from '../auth/auth.module'; 
import { JwtAuthGuard  } from 'src/auth/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule,ConfigModule], 
  controllers: [SavedTextController],
  providers: [SavedTextService,JwtAuthGuard ],
})
export class SavedTextModule {}