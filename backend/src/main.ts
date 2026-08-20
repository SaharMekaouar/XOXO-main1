import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import { config } from 'dotenv';
config();
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  app.enableCors({
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],   
  });
  await app.listen(3000);
}

bootstrap();

console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
