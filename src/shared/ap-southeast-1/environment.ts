import { Environment } from 'aws-cdk-lib';
import { CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION, DEV_ENV_STAGE, DEV_ENV_TAG } from '../global/constants';


export interface EnvironmentConfig extends Environment {
  pattern: string;
  envTag: string;
  stage: string;
  owner: string;
};

export const devEnv: EnvironmentConfig = {
  pattern: 'sin',
  envTag: DEV_ENV_TAG,
  stage: DEV_ENV_STAGE,
  account: CDK_DEFAULT_ACCOUNT,
  region: CDK_DEFAULT_REGION,
  owner: 'development',
};