import { Injectable,NotFoundException  } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateClipDto } from './dto/update-clip.dto';
import { tagclipDto } from './dto/Tag-clip.dto';

@Injectable()
export class SavedTextService {
  constructor(private prisma: PrismaService) {}
  async saveText(userId: string, content: string,title?: string) {
    try {
      const generatedTitle = title || content.split(" ").slice(0, 3).join(" "); 
      return await this.prisma.savedText.create({
        data: { userId, content,title: generatedTitle}
      });
    } catch (error) {
      throw new Error('Failed to save text: ' + error.message);
    }
  }
async updateSavedText(id: string, updateData: UpdateClipDto) {
  try {
    const existingText = await this.prisma.savedText.findUnique({
      where: { id }
    });
    if (!existingText) {
      throw new NotFoundException(`Text with ID ${id} not found`);
    }
    const dataToUpdate: any = {};
    if (updateData.title !== undefined) {
      dataToUpdate.title = updateData.title;
    }
    if (updateData.content !== undefined) {
      dataToUpdate.content = updateData.content;
    }
    if (Object.keys(dataToUpdate).length === 0) {
      throw new Error('No valid fields provided for update');
    }
    return await this.prisma.savedText.update({
      where: { id },
      data: dataToUpdate,
    });
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new Error(`Failed to update saved text: ${error.message}`);
  }
}
 
  async getSavedTexts(userId: string) {
    console.log('📌 Getting saved texts for user:', userId); 
    const texts = await this.prisma.savedText.findMany({
      where: { userId  },
      orderBy: [
        { isPinned: 'desc' },     
        { createdAt: 'desc' }
      ],
    });

    if (!texts || texts.length === 0) {
      throw new NotFoundException('No saved texts found for this user.');
    }
    return texts;
  }

  async deleteSavedText(id: string) {
    return this.prisma.savedText.delete({
      where: { id },
    });
  }

  async toggleFavorite(id: string, isFavorite: boolean) {
    const text = await this.prisma.savedText.findUnique({ where: { id } });
  
    if (!text) {
      throw new NotFoundException('Text not found');
    }
  
    return this.prisma.savedText.update({
      where: { id },
      data: { isFavorite },
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.savedText.findMany({
      where: { userId, isFavorite: true },
    });
  }
  
  async assignCategoryToText(textId: string, categoryId: string) {
    return this.prisma.savedText.update({
      where: { id: textId },
      data: { categoryId },
    });
  }
  async removeCategoryFromText(textId: string) {
    return this.prisma.savedText.update({
      where: { id: textId },
      data: { categoryId: null },
    });
  }
  async changeCategory(textId: string, newCategoryId: string) {
    return this.assignCategoryToText(textId, newCategoryId);
  } 
  
  async togglePinText(id: string, dto: tagclipDto) {
    return this.prisma.savedText.update({
      where: { id },
      data: { isPinned: dto.isPinned },
    });
  }
  async getPinned(userId: string) {
    console.log('Fetching pinned texts for user:', userId);
    const pinnedTexts = await this.prisma.savedText.findMany({
      where: { userId, isPinned: true },
      orderBy: [
        { isPinned: 'desc' }, 
        { createdAt: 'desc' },],
    });
    console.log('Pinned texts:', pinnedTexts);
    return pinnedTexts;
  }
  async getUnpinned(userId: string) {
    return this.prisma.savedText.findMany({ 
      where: { userId, isPinned: false },
    });
  }
  async getAllTextsByUser(userId: string) {
  const results = await this.prisma.savedText.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!results || results.length === 0) {
    throw new NotFoundException(`this user has no texts ${userId}`);
  }
  return results;
}
}