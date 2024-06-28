import { GetObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3'

export const downloadFileFromBucket = async ({
  bucketName,
  objectKey,
  clientConfig,
}: {
  bucketName: string
  objectKey: string
  clientConfig?: S3ClientConfig
}): Promise<Buffer> => {
  const s3Client = new S3Client(clientConfig ?? [])
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  })

  const { Body: fileStream } = await s3Client.send(getObjectCommand)
  if (!fileStream) throw new Error('No file stream available to download from source bucket')

  const fileAsString = await fileStream.transformToString()
  const sourceFileBuffer = Buffer.from(fileAsString)

  return sourceFileBuffer
}
