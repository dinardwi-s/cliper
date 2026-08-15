import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class PreviewObjectDto {
  @IsIn(['raw-videos', 'clips', 'subtitles', 'thumbnails'])
  bucket!: 'raw-videos' | 'clips' | 'subtitles' | 'thumbnails';

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  key!: string;
}
