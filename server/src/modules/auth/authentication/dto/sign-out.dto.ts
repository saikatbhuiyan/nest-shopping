import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ClientType } from '../enums/cient-type.enum';

export class SignOutDto {
  @IsNumber()
  @IsPositive()
  userId: number;

  @IsString()
  deviceId?: string = '1234';

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType = ClientType.WEB;
}
