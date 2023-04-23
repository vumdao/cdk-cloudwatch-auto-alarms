import { Stack, StackProps, Tags } from "aws-cdk-lib";
import { AmazonLinuxGeneration, AmazonLinuxImage, Instance, InstanceClass, InstanceSize, InstanceType, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EnvironmentConfig } from "../shared/global/environment";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CDK_PROJECT_NAME, PROJECT, STACK_NAME } from "../shared/global/constants";

export class TestEC2 extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-simflexcloud-${reg.stage}-cw-alarm-test-ec2`;

    const vpc = new Vpc(this, `${prefix}-vpc`, {
      vpcName: prefix,
      natGateways: 1,
      maxAzs: 1
    });

    const ec2Sg = new SecurityGroup(this, `${prefix}-sg`, {
      securityGroupName: prefix,
      vpc: vpc,
    });

    const ec2Role = new Role(this, `${prefix}-ec2-role`, {
      roleName: prefix,
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ]
    })

    new Instance(this, `${prefix}-ec2-test-1`, {
      instanceName: `${prefix}-1`,
      vpc: vpc,
      securityGroup: ec2Sg,
      instanceType: InstanceType.of(InstanceClass.T3A, InstanceSize.SMALL),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      role: ec2Role,
    });

    // Unmute to create the second instance
    //new Instance(this, `${prefix}-ec2-test-2`, {
    //  instanceName: `${prefix}-2`,
    //  vpc: vpc,
    //  securityGroup: ec2Sg,
    //  instanceType: InstanceType.of(InstanceClass.T3A, InstanceSize.SMALL),
    //  machineImage: new AmazonLinuxImage({
    //    generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
    //  }),
    //  role: ec2Role,
    //});

    Tags.of(scope).add('Create_Auto_Alarms', 'any')
    Tags.of(scope).add(STACK_NAME, prefix)
    Tags.of(scope).add(PROJECT, CDK_PROJECT_NAME)
  }
}