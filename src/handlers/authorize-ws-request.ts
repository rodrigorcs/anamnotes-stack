import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { logger } from '../common/powertools/logger'
import { allowExecuteAPIPolicy, denyAllPolicy } from '../lib/helpers/iam'

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env as Record<string, string>

    const verifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      clientId: USER_POOL_CLIENT_ID,
      tokenUse: 'id',
    })

    const encodedToken = event?.queryStringParameters?.idToken
    if (!encodedToken) throw new Error('idToken is missing in query string parameters')

    const payload = await verifier.verify(encodedToken)
    logger.info('Token is valid. Payload:', payload)

    return allowExecuteAPIPolicy(event.methodArn, payload)
  } catch (error) {
    logger.error(JSON.stringify(error))
    logger.info('Denying access')
    return denyAllPolicy()
  }
}
