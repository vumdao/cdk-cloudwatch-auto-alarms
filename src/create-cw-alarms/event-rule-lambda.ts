import { Duration, Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { EnvironmentConfig } from "../shared/global/environment";
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { join } from "path";
import { Topic } from "aws-cdk-lib/aws-sns";
import { SlackChannelConfiguration } from "aws-cdk-lib/aws-chatbot";
import { CDK_PROJECT_NAME, PROJECT, SIMFLEXCLOUD_SLACK_CHANNEL_CW_ALARM, SIMFLEXCLOUD_SLACK_WORKSPACE_ID, STACK_NAME } from "../shared/global/constants";
import { Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

/**
 * Create Cloudwatch alarm for EC2 with new state running
 * Delete Cloudwatch alarm for EC2 with new state terminated
 */
export class CloudWatchAutoAlarm extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-simflexcloud-${reg.stage}-cw-auto-alarm`;

    const alarmSNS = new Topic(
      this,
      `${prefix}-sns`,
      {
        topicName: `${prefix}-cw-auto-alarm`,
        displayName: `${prefix}-cw-auto-alarm`,
      },
    );

    const slackChannel = new SlackChannelConfiguration(
      this,
      `${prefix}-slack-channel`,
      {
        slackChannelConfigurationName: prefix,
        slackWorkspaceId: SIMFLEXCLOUD_SLACK_WORKSPACE_ID,
        slackChannelId: SIMFLEXCLOUD_SLACK_CHANNEL_CW_ALARM,
        guardrailPolicies: [
          new ManagedPolicy(this, `${prefix}-guardrail-policy`, {
            managedPolicyName: `${prefix}-guardrail-policy`,
            statements: [new PolicyStatement({
              sid: 'GuardrailPolicy',
              actions: [
                "cloudwatch:Describe*",
                "cloudwatch:Get*",
                "cloudwatch:List*"
              ],
              resources: ["*"],
            })]
          })
        ]
      },
    )

    slackChannel.addNotificationTopic(alarmSNS);


    const lambdaRole = new Role(this, `${prefix}-role`, {
      roleName: prefix,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
      ]
    });

    const ec2Sts = new PolicyStatement({
      sid: 'EC2Tagger',
      actions: [
        "ec2:CreateTags"
      ],
      resources: [`arn:aws:ec2:${this.region}:${this.account}:instance/*`]
    });

    const cwSts = new PolicyStatement({
      sid: 'CWPutMetrics',
      actions: [
        "cloudwatch:DescribeAlarms",
        "cloudwatch:DeleteAlarms",
        "cloudwatch:PutMetricAlarm",
      ],
      resources: [`arn:aws:cloudwatch:${this.region}:${this.account}:alarm:*`]
    });

    [ec2Sts, cwSts].forEach(sts => lambdaRole.addToPrincipalPolicy(sts));

    const lambdaFunc = new PythonFunction(this, `${prefix}-lambda`, {
      functionName: prefix,
      runtime: Runtime.PYTHON_3_10,
      logRetention: RetentionDays.ONE_DAY,
      role: lambdaRole,
      entry: join(__dirname, 'lambda-handler'),
      environment: {
        DEFAULT_ALARM_SNS_TOPIC_ARN: alarmSNS.topicArn,
        ALARM_TAG: 'Create_Auto_Alarms',
        CREATE_DEFAULT_ALARMS: 'true',
        CLOUDWATCH_NAMESPACE: 'CWAgent',
        ALARM_CPU_HIGH_THRESHOLD: '75',
        ALARM_CPU_CREDIT_BALANCE_LOW_THRESHOLD: '100',
        ALARM_MEMORY_HIGH_THRESHOLD: '75',
        ALARM_DISK_PERCENT_LOW_THRESHOLD: '20',
        CLOUDWATCH_APPEND_DIMENSIONS: 'InstanceId, ImageId, InstanceType',
      },
      timeout: Duration.minutes(10)
    });

    const ec2Rules = new Rule(this, `${prefix}-rule`, {
      ruleName: prefix,
    });

    ec2Rules.addEventPattern({
      source: ['aws.ec2'],
      detailType: ['EC2 Instance State-change Notification'],
      detail: {
        state: ['running', 'terminated'],
      },
    });

    ec2Rules.addTarget(new LambdaFunction(lambdaFunc));

    Tags.of(scope).add(STACK_NAME, prefix)
    Tags.of(scope).add(PROJECT, CDK_PROJECT_NAME)
  }
}