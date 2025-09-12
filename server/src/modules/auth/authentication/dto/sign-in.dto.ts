import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ClientType } from '../enums/cient-type.enum';

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @IsString()
  deviceId?: string = '1234';

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType = ClientType.WEB;
}
