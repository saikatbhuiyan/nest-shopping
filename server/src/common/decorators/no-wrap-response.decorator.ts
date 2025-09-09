import { SetMetadata } from '@nestjs/common';
import { NoWrapResponseOptions } from '../types';

export const NO_WRAP_RESPONSE = 'NO_WRAP_RESPONSE';

export const NoWrapResponseAdvanced = (options: NoWrapResponseOptions = {}) =>
  SetMetadata(NO_WRAP_RESPONSE, options);
