import { App } from 'aws-cdk-lib';
import { TestEC2 } from './ec2-test/ec2-test';
import { devEnv } from './shared/ap-southeast-1/environment';
import { TagsProp } from './shared/global/tagging';
import { InstallCWAgent } from './install-cw-agent/install-cw-agent';
import { CloudWatchAutoAlarm } from './create-cw-alarms/event-rule-lambda';

const app = new App();

new TestEC2(app, 'test-ec2', devEnv, { env: devEnv, tags: TagsProp('cw-auto-alarm', devEnv) })

new InstallCWAgent(app, 'install-cw-agent', devEnv, { env: devEnv, tags: TagsProp('cw-auto-alarm', devEnv) })

new CloudWatchAutoAlarm(app, 'create-cw-alarms', devEnv, { env: devEnv, tags: TagsProp('cw-auto-alarm', devEnv) })

app.synth();