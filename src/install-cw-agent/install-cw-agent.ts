import { Duration, Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvironmentConfig } from "../shared/global/environment";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { join } from "path";
import { ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";
import { readFileSync } from "fs";
import { Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { CDK_PROJECT_NAME, PROJECT, STACK_NAME } from "../shared/global/constants";

/**
 * Install cloudwatch Agent and configure agent config for EC2 with new state Running
 */
export class InstallCWAgent extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-simflexcloud-${reg.stage}-install-cw-agent`;

    /**
     * Store cloudwatch agent config to parameterstore
     */
    const ssmConfig = new StringParameter(this, `${prefix}-ssm-param`, {
      parameterName: '/simflex/cloudwatch/linux/agent/config',
      stringValue: readFileSync(join(__dirname, 'cw-agent-config.json'), 'utf-8'),
      description: 'Cloudwatch Agent Config',
      tier: ParameterTier.STANDARD,
    });

    const lambdaRole = new Role(this, `${prefix}-role`, {
      roleName: prefix,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
      ]
    });

    const lambdaFunc = new PythonFunction(this, `${prefix}-install-cw-agent-lambda`, {
      functionName: `${prefix}-install-cw-agent`,
      runtime: Runtime.PYTHON_3_10,
      logRetention: RetentionDays.ONE_DAY,
      role: lambdaRole,
      entry: join(__dirname, 'lambda-handler'),
      environment: {
        ALARM_TAG: 'Create_Auto_Alarms',
        SSM_PARAMETER_STORE_NAME: ssmConfig.parameterName,
      },
      timeout: Duration.minutes(10)
    });

    const ec2Event = new Rule(this, `${prefix}-rule`, {
      ruleName: `${prefix}-install-cw-agent`,
    });

    ec2Event.addEventPattern({
      source: ['aws.ec2'],
      detailType: ['EC2 Instance State-change Notification'],
      detail: {
        state: ['running'],
      },
    });

    ec2Event.addTarget(new LambdaFunction(lambdaFunc));

    Tags.of(scope).add(STACK_NAME, prefix)
    Tags.of(scope).add(PROJECT, CDK_PROJECT_NAME)
  }
}