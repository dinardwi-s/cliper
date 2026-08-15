import { BadRequestException, Body, Controller, Delete, Post, Req, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PreviewObjectDto } from './dto/preview-object.dto';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() request: Request & { user: AuthenticatedUser },
    @UploadedFile() file: Express.Multer.File,
    @Body('bucket') bucket: 'raw-videos' | 'clips' | 'subtitles' | 'thumbnails',
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!['raw-videos', 'clips', 'subtitles', 'thumbnails'].includes(bucket)) throw new BadRequestException('Invalid storage bucket');
    if (file.size > 500 * 1024 * 1024) throw new BadRequestException('File exceeds 500 MB limit');
    return this.storage.upload(request.user.id, bucket, file);
  }

  @Post('preview')
  preview(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: PreviewObjectDto) {
    return this.storage.preview(request.user.id, dto.bucket, dto.key).then((url) => ({ url, expiresIn: 3600 }));
  }

  @Delete('object')
  async remove(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: PreviewObjectDto) {
    await this.storage.delete(request.user.id, dto.bucket, dto.key);
    return { deleted: true };
  }
}
