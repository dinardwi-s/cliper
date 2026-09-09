import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
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
    return this.storage.uploadBuffer(request.user.id, bucket, file.buffer, file.originalname, file.mimetype);
  }

  @Post('preview')
  async preview(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: PreviewObjectDto) {
    const url = await this.storage.previewUrl(request.user.id, dto.bucket, dto.key);
    return { url };
  }

  @Get('objects/:bucket/*path')
  async getObject(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param('bucket') bucket: 'raw-videos' | 'clips' | 'subtitles' | 'thumbnails',
    @Res() response: Response,
  ) {
    const path = request.params.path;
    const key = decodeURIComponent(Array.isArray(path) ? path.join('/') : path ?? '');
    const stream = await this.storage.openReadStream(request.user.id, bucket, key);
    stream.pipe(response);
  }

  @Delete('object')
  async remove(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: PreviewObjectDto) {
    await this.storage.delete(request.user.id, dto.bucket, dto.key);
    return { deleted: true };
  }
}
