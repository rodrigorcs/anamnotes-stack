export interface IRDSDatabaseCredentialsSecret {
  username: string
  password: string
  engine: string
  host: string
  port: number
  dbname: string
  dbInstanceIdentifier: string
}

export interface IExternalBucketCredentials {
  bucketName: string
  bucketRegion: string
  accessKeyId: string
  secretAccessKey: string
}
