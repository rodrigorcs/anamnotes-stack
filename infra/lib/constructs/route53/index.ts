import { aws_route53 as route53 } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { config } from '../../../config'

interface ICNameRecordProps {
  hostedZoneId: string
  hostedZoneName: string
  recordName: string
  domainName: string
}

export class CNameRecord extends Construct {
  public readonly cNameRecord: route53.CnameRecord

  constructor(scope: Construct, props: ICNameRecordProps) {
    const cdkId = `${config.projectName}-${props.hostedZoneId}-${props.recordName}-cname-record`
    super(scope, cdkId)

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      `${config.projectName}-${props.hostedZoneId}-${props.recordName}-hosted-zone`,
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneName,
      },
    )

    this.cNameRecord = new route53.CnameRecord(this, cdkId, {
      zone: hostedZone,
      recordName: props.recordName,
      domainName: props.domainName,
    })
  }
}
