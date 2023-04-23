import boto3
import os
import time
from botocore.exceptions import ClientError


# Logging configuration
import logging
log = logging.getLogger()
log.setLevel(logging.INFO)

# Create CloudWatch client
ec2 = boto3.resource('ec2')
ssm = boto3.client('ssm')
client = boto3.client('ec2')


def handler(event, context):
    create_alarm_tag = os.getenv("ALARM_TAG", "Create_Auto_Alarms")

    instanceID = event["detail"]["instance-id"]
    instanceName = get_instance_name(ec2.Instance(instanceID))
    log.info(f"Installing and configuring Cloudwatch agents on the instance : {instanceName}")

    if check_alarm_tag(instanceID, create_alarm_tag):
        install_and_configure_cwagent(instanceID)
    else:
        log.info(f"Instance {instanceName} does not have the alarm tag {create_alarm_tag}")


def get_instance_name(instance):
    instanceName = ''
    for tag in instance.tags:
        if (tag['Key'] == "Name"):
            instanceName = (tag['Value'])
            return instanceName


def check_alarm_tag(instance_id, tag_key):
    try:
        ec2_client = boto3.client('ec2')
        instance = ec2_client.describe_instances(
            Filters=[
                {
                    'Name': 'tag-key',
                    'Values': [
                        tag_key
                    ]
                }
            ],
            InstanceIds=[
                instance_id
            ]
        )
        # can only be one instance when called by CloudWatch Events
        if 'Reservations' in instance and len(instance['Reservations']) > 0 and len(
                instance['Reservations'][0]['Instances']) > 0:
            return True
    except Exception as error:
        log.error(f"Failed to get EC2 instance information, error {error}")


def install_and_configure_cwagent(instanceId):
    log.info('========== Instances to install Cloudwatch Agents:')
    log.info(instanceId)

    ssm_prameter_store_name = os.getenv("SSM_PARAMETER_STORE_NAME")
    # Install cloudwatch agents using SSM automation
    time.sleep(30)
    response = ssm.send_command(
        InstanceIds=[instanceId],
        DocumentName='AWS-ConfigureAWSPackage',
        Parameters={
            "action": ["Install"],
            "installationType": ["Uninstall and reinstall"],
            "name": ["AmazonCloudWatchAgent"]
        }
    )
    command_id = response.get('Command', {}).get("CommandId", None)
    waiting_ssm(command_id)

    # configure cloudwatch agents
    commands = [
        f"sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c ssm:{ssm_prameter_store_name}"
    ]
    send_run_command(instanceId, commands)


def send_run_command(instance_ids, commands):
    """
    Tries to queue a RunCommand job.  If a ThrottlingException is encountered
    recursively calls itself until success.
    """
    try:
        response = ssm.send_command(
            InstanceIds=[instance_ids],
            DocumentName='AWS-RunShellScript',
            Parameters={
                'commands': commands,
                # Seconds all commands have to complete in
                'executionTimeout': ['600']
            }
        )
        command_id = response.get('Command', {}).get("CommandId", None)
        waiting_ssm(command_id)
    except ClientError as err:
        if 'ThrottlingException' in str(err):
            log.info("RunCommand throttled, automatically retrying...")
            send_run_command(instance_ids, commands)
        else:
            log.info("Run Command Failed!\n%s", str(err))
            return False


def waiting_ssm(cmd_id):
    invocation = None
    while True:
        response = ssm.list_command_invocations(
            CommandId=cmd_id, Details=True)
        """ If the command hasn't started to run yet, keep waiting """
        if len(response['CommandInvocations']) == 0:
            time.sleep(1)
            continue
        invocation = response['CommandInvocations'][0]
        if invocation['Status'] in ('Success', 'TimedOut', 'Cancelled', 'Failed'):
            break
        else:
            time.sleep(60)
    command_plugin = invocation['CommandPlugins'][-1]
    output = command_plugin['Output']
    status = command_plugin['Status']
    if status == 'Success':
        log.info('============RunCommand sent successfully')
        return True
    elif status == 'TimedOut':
        log.error(f"Command {cmd_id} got timeout, error: {output}")
    else:
        log.error(f"Command {cmd_id} failed, error: {output}")
    return False