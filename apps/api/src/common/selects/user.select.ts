import { Prisma } from '@prisma/client';

export const publicUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  roleId: true,
  businessUnitId: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      permissions: {
        select: {
          permission: {
            select: {
              id: true,
              key: true,
              description: true,
            },
          },
        },
      },
    },
  },
  businessUnit: {
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
    },
  },
});
