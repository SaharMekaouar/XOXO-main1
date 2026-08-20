// src/text/text.controller.ts
import { Controller, Post, Get, Param, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { TextService } from './text.service';
import { CreateTextDto } from './dto/create-text.dto';

@Controller('text')
export class TextController {
  constructor(private readonly textService: TextService) {}

  @Post('generate-url')
  async generateTextUrl(@Body() dto: CreateTextDto) {
    const url = await this.textService.generateUrl(dto);
    return { url };
  }

  @Get('view/:type/:uuid')
  async getText(@Param('uuid') uuid: string, @Res() res: Response) {
    const result = await this.textService.getTextByUuid(uuid);

    if (!result) {
      return res.status(HttpStatus.NOT_FOUND).send('Texte introuvable.');
    }

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Texte partagé</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color:rgb(141, 107, 171);
            margin: 0;
            padding: 2rem;
          }
          .container {
            max-width: 800px;
            margin: auto;
            background-color: #fff;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${result.text.replace(/\n/g, '<br>')}
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
