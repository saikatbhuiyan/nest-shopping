import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
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
  clientType: ClientType = ClientType.WEB;
}
