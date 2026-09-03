import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SummarizeService {
  private readonly summarizerUrl =
    process.env.SUMMARIZER_URL ?? 'http://localhost:8001/summarize/';

  async summarizeText(
    text: string,
    summaryType: 'basic' | 'advanced' = 'basic',
    maxInputLen = 2048,
  ): Promise<string> {
    try {
      const response = await axios.post(
        this.summarizerUrl,
        {
          text,
          summary_type: summaryType,
          max_input_len: maxInputLen,
        },
        { timeout: 180000 },
      );
      if (response.data && response.data.summary) {
        return response.data.summary;
      }
      throw new InternalServerErrorException('Invalid response from summarizer');
    } catch (error) {
      console.error('Error while summarizing text:', error);
      throw new InternalServerErrorException('Error while summarizing text');
    }
  }
}
