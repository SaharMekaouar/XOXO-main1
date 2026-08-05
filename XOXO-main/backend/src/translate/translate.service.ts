import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { franc } from 'franc-min'; 

@Injectable()
export class TranslationService {

  async detectLanguage(text: string): Promise<string> {
    const detectedLang = franc(text);

    if (detectedLang === 'und') {
      throw new Error('Unable to detect language');
    }

    return detectedLang;
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

      const response = await axios.post('https://ff3a-154-111-224-232.ngrok-free.app/translate', payload);

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