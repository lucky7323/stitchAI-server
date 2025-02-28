import { IS_DEV, IS_PROD, IS_STAGING } from '~/constants';

export const corsOrigins = IS_PROD
  ? [
      'https://stitch-ai.co',
      'http://localhost:3000',
    ]
  : IS_DEV
      ? [
          'http://localhost:3000',
        ]
      : ['http://localhost:3000'];
