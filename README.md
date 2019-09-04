# lambdaInvocation-cfn-custom-resource

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CircleCI](https://circleci.com/gh/lumigo-io/SAR-lambdaInvocation-cfn-custom-resource.svg?style=svg)](https://circleci.com/gh/lumigo-io/SAR-lambdaInvocation-cfn-custom-resource)
[![codecov](https://codecov.io/gh/lumigo-io/SAR-lambdaInvocation-cfn-custom-resource/branch/master/graph/badge.svg)](https://codecov.io/gh/lumigo-io/SAR-lambdaInvocation-cfn-custom-resource)

CloudFormation custom resource for invoking a Lambda function

## Deploying to your account (via the console)

Go to this [page](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:374852340823:applications~lambda-invocation-cfn-custom-resource) and click the `Deploy` button.

## Deploying via SAM/Serverless framework/CloudFormation

To deploy this app via SAM, you need something like this in the CloudFormation template:

```yml
LambdaInvocationCustomResource:
  Type: AWS::Serverless::Application
  Properties:
    Location:
      ApplicationId: arn:aws:serverlessrepo:us-east-1:374852340823:applications/lambda-invocation-cfn-custom-resource
      SemanticVersion: <enter latest version>

# custom resource to invoke the PropagateAll function during deployment
InvokePropagateAll:
  Type: Custom::LambdaInvocation
  DependsOn:
    - PropagateAll
    - LambdaInvocationCustomResource
  Properties:
    ServiceToken: !GetAtt LambdaInvocationCustomResource.Outputs.FunctionArn
    FunctionName: !Ref PropagateAll
    Payload: {}
```

To do the same via CloudFormation or the Serverless framework, you need to first add the following `Transform`:

```yml
Transform: AWS::Serverless-2016-10-31
```

For more details, read this [post](https://theburningmonk.com/2019/05/how-to-include-serverless-repository-apps-in-serverless-yml/).
