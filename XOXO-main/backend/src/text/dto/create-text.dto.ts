// src/text/dto/create-text.dto.ts
export class CreateTextDto {
    text: string;
    type: 'transcription' | 'resume' | 'translation';
  }
  