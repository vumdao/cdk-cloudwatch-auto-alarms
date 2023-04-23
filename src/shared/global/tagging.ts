import { resolve } from 'path';
import { Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { config } from 'dotenv';
import {
  STACK_NAME,
  DEFAULT_SERVICE,
  PROJECT,
  CDK_PROJECT_NAME,
} from './constants';
import { EnvironmentConfig } from './environment';

config({ path: resolve(__dirname, '../.env') });

export function CustomTags(
  stack: Construct,
  envConf: EnvironmentConfig,
  serviceName = DEFAULT_SERVICE,
) {
  /**
   * AWS Tagging Strategy for Vincere resources
   *
   * Following AWS Tagging Strategy: https://hrboss.atlassian.net/wiki/spaces/devops/pages/2640084995/AWS+Tagging+Strategy
   */
  Tags.of(stack).add(
    STACK_NAME,
    `${envConf.pattern}-${envConf.stage}-${serviceName}`,
  );
  Tags.of(stack).add(PROJECT, CDK_PROJECT_NAME);
}

export function InsideTags(serviceName: string, envConf: EnvironmentConfig) {
  return [
    {
      key: STACK_NAME,
      value: `${envConf.pattern}-${envConf.stage}-${serviceName}`,
    },
    { key: PROJECT, value: CDK_PROJECT_NAME },
  ];
}

export function TagsProp(
  serviceName: string,
  envConf: EnvironmentConfig,
) {
  const tags: any = {
    [STACK_NAME]: `${envConf.pattern}-simflexcloud-${envConf.stage}-${serviceName}`,
    [PROJECT]: CDK_PROJECT_NAME,
    'Create_Auto_Alarms': 'any',
  };
  return tags;
}
