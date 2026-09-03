import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { franc } from 'franc-min'; 

@Injectable()
export class TranslationService {

  private readonly supportedLanguageCodes: Record<string, string> = {
    eng: 'en',
    fra: 'fr',
    fre: 'fr',
    spa: 'es',
    deu: 'de',
    ger: 'de',
    ita: 'it',
    ara: 'ar',
    arb: 'ar',
  };

  async detectLanguage(text: string): Promise<string> {
    const detectedLang = franc(text, { minLength: 3 });

    const language = this.supportedLanguageCodes[detectedLang];
    if (!language) {
      throw new InternalServerErrorException(
        'Unable to detect a supported source language',
      );
    }

    return language;
  }


  async translate(text: string, srcLang: string, tgtLang: string): Promise<string> {
    try {

      if (!text || !srcLang || !tgtLang) {
        throw new InternalServerErrorException('Missing required translation fields');
      }

      const payload = {
        text: [text], 
        source_lang: srcLang, 
        target_lang: tgtLang, 
      };

      console.log('Sending translation request:', payload); 

      const response = await axios.post('http://localhost:8001/translate', payload, {
        // The first use of a language pair may download/export its ONNX model.
        // It remains cached afterwards, so later translations are much faster.
        timeout: 600000,
      });

      console.log('Translation microservice response:', response.data);

      if (response.data?.translations?.[0]) {
        return response.data.translations[0];  
      }

      throw new InternalServerErrorException('Invalid response from translation service');
    } catch (error) {
      console.error('Error while translating text:', error?.response?.data || error.message);
      throw new InternalServerErrorException('Error while translating text');
    }
  }
}
