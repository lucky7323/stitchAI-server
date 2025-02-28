export const START_ENV = process.env.START_ENV;
export const IS_LOCAL = process.env.START_ENV === 'local';
export const IS_DEV = process.env.START_ENV === 'dev';
export const IS_STAGING = process.env.START_ENV === 'staging';
export const IS_PROD = process.env.START_ENV === 'prod';

export const BLOCKCHAIN_ENV = process.env.BLOCKCHAIN_ENV;
export const IS_DEVNET = process.env.BLOCKCHAIN_ENV === 'devnet';
export const IS_TESTNET = process.env.BLOCKCHAIN_ENV === 'testnet';
export const IS_MAINNET = process.env.BLOCKCHAIN_ENV === 'mainnet';

export const DATABASE_URL = process.env.DATABASE_URL;

export const DEV_ENV = IS_LOCAL || IS_DEV;
export const PROD_ENV = IS_PROD || IS_STAGING;

export const ENABLE_CRON = process.env.ENABLE_CRON === 'true';
export const ENABLE_LOG = process.env.ENABLE_LOG === 'true';
