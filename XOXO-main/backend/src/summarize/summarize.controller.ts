import { Controller, Post, Body } from '@nestjs/common';
import { SummarizeService } from './summarize.service';

@Controller('summarize')
export class SummarizeController {
  constructor(private readonly summarizeService: SummarizeService) {}

  @Post()
  async summarize(@Body('text') text: string): Promise<{ summary: string }> {
    const summary = await this.summarizeService.summarizeText(text);
    return { summary };
  }
}
