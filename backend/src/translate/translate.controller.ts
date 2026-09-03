import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { TranslationService } from './translate.service';


@Controller('translate')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  async translate(@Body() body: { text: string; srcLang: string; tgtLang: string }) {
    const { text, srcLang, tgtLang } = body;
    

    console.log('Requête reçue:', body);

    if (!text || !srcLang || !tgtLang) {
      throw new BadRequestException('Invalid input');
    }

  
      const detectedSrcLang = srcLang.toLowerCase() === 'auto'
        ? await this.translationService.detectLanguage(text)
        : srcLang.toLowerCase();
      const targetLanguage = tgtLang.toLowerCase();
          
    
      try {
        let translatedText = text;

        if (detectedSrcLang === targetLanguage) {
          return {
            translation: text,
            detectedSourceLang: detectedSrcLang,
            targetLang: targetLanguage,
          };
        }

     
        if (detectedSrcLang !== 'en') {
          translatedText = await this.translationService.translate(text, detectedSrcLang, 'en');
        }

   
        if (targetLanguage !== 'en') {
          translatedText = await this.translationService.translate(translatedText, 'en', targetLanguage);
        }

        return {
          translation: translatedText,
          detectedSourceLang: detectedSrcLang,
          targetLang: targetLanguage,
        };
      } catch (error) {
        console.error('Error while translating text:', error.response?.data || error.message);
        throw new BadRequestException(`Translation failed: ${error.message}`);
      }
    }
}
