import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from "class-validator";

export class SaveTaskDto {
  @IsString()
  @Length(2, 100)
  title!: string;

  @IsString()
  @Length(2, 220)
  summary!: string;

  @IsString()
  @Length(2, 4000)
  description!: string;

  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  externalUrl!: string;

  @IsString()
  @Length(2, 4000)
  instructions!: string;

  @IsOptional()
  @IsBoolean()
  evidenceRequired = true;

  @IsOptional()
  expiresAt?: string | null;
}
