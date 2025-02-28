import { IS_DEV, IS_PROD, IS_STAGING } from '~/constants';

export const corsOrigins = IS_PROD
  ? [
      'https://stitchai',
    ]
  : IS_DEV
      ? [
          'http://localhost:3000',
        ]
      : ['http://localhost:3000'];
