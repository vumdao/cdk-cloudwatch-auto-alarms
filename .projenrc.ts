import { awscdk } from 'projen';
import { UpdateSnapshot } from 'projen/lib/javascript';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.76.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-cloudwatch-auto-alarms',
  projenrcTs: true,

  deps: ['env-var', 'dotenv', '@aws-cdk/aws-lambda-python-alpha'],
  jestOptions: {
    updateSnapshot: UpdateSnapshot.NEVER,
  },
});
project.synth();