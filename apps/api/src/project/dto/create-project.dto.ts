import { IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  youtubeUrl!: string;
}
