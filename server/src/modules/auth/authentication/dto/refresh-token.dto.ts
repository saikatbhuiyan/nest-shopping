import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClientType } from '../enums/cient-type.enum';

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;

  @IsString()
  deviceId?: string = '1234';

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType = ClientType.WEB;
}
