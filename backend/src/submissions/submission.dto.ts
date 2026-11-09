import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidenceText?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  evidenceUrl?: string;
}

export class RejectSubmissionDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
