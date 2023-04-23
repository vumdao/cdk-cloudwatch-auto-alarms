aws cloudformation create-stack --stack-name ${1} \
--template-body file://yaml/${1}.yaml \
--capabilities CAPABILITY_NAMED_IAM \
--region ap-southeast-1 \
--profile mfa