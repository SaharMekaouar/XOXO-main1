import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { SummarizeService } from './summarize.service';

interface SummarizeRequest {
  text: string;
  summary_type?: 'basic' | 'advanced';
  max_input_len?: number;
}

@Controller('summarize')
export class SummarizeController {
  constructor(private readonly summarizeService: SummarizeService) {}

  @Post()
  async summarize(@Body() request: SummarizeRequest): Promise<{ summary: string }> {
    if (!request.text || request.text.trim().length < 10) {
      throw new BadRequestException('Text must contain at least 10 characters');
    }
    if (request.summary_type && !['basic', 'advanced'].includes(request.summary_type)) {
      throw new BadRequestException("summary_type must be 'basic' or 'advanced'");
    }

    const summary = await this.summarizeService.summarizeText(
      request.text,
      request.summary_type ?? 'basic',
      request.max_input_len ?? 2048,
    );
    return { summary };
  }
}
