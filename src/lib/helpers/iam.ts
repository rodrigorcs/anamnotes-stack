import { APIGatewayAuthorizerResult } from 'aws-lambda'
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model'

export const denyAllPolicy = (): APIGatewayAuthorizerResult => {
  return {
    principalId: '*',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: '*',
          Effect: 'Deny',
          Resource: '*',
        },
      ],
    },
  }
}

export const allowExecuteAPIPolicy = (
  methodArn: string,
  idToken: CognitoIdTokenPayload,
): APIGatewayAuthorizerResult => {
  return {
    principalId: idToken.sub,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: methodArn,
        },
      ],
    },
    context: {
      userId: idToken.username as string,
    },
  }
}
