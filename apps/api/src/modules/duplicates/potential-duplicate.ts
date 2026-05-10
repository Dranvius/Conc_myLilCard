import { ConflictException } from '@nestjs/common';
import type { PotentialDuplicate } from './duplicate-detection.service';

export function throwPotentialDuplicate(
  entityLabel: string,
  duplicates: PotentialDuplicate[],
) {
  throw new ConflictException({
    code: 'POTENTIAL_DUPLICATE',
    message: `Se encontraron posibles duplicados para ${entityLabel}.`,
    duplicates,
  });
}
