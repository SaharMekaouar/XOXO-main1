import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
  clip: any;
    async onModuleInit() {
        try{
            await this.$connect();
            this.logger.log('Database connected successfully');
        }
        catch(err){
            this.logger.error("failed to connect to db");
        }
        
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }

}