import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title!: string;
}
