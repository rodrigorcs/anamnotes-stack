import {
  GetObjectAttributesCommand,
  GetObjectAttributesCommandOutput,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  S3ClientConfig,
  SelectObjectContentCommand,
  SelectObjectContentCommandInput,
} from '@aws-sdk/client-s3'
import { Upload as UploadStream } from '@aws-sdk/lib-storage'
import { logger } from '../../common/powertools/logger'
import { parseStream } from 'fast-csv'
import { Readable } from 'stream'
import dayjs from 'dayjs'

export const queryFromBucketCSV = async ({
  bucketName,
  fileKey,
  queryString,
}: {
  bucketName: string
  fileKey: string
  queryString: string
}) => {
  const s3Client = new S3Client()

  const commandInput: SelectObjectContentCommandInput = {
    Bucket: bucketName,
    Key: fileKey,
    ExpressionType: 'SQL',
    Expression: queryString,
    InputSerialization: {
      CSV: {
        FileHeaderInfo: 'USE',
        AllowQuotedRecordDelimiter: false,
      },
    },
    OutputSerialization: {
      CSV: {},
    },
  }

  try {
    const queryCommand = new SelectObjectContentCommand(commandInput)
    const response = await s3Client.send(queryCommand)
    return response
  } catch (error) {
    logger.warn(
      'Error querying CSV file with default settings, trying with AllowQuotedRecordDelimiter...',
      { error },
    )
    const queryCommandWithQuotedDelimiter = new SelectObjectContentCommand({
      ...commandInput,
      InputSerialization: {
        ...commandInput.InputSerialization,
        CSV: { ...commandInput.InputSerialization?.CSV, AllowQuotedRecordDelimiter: true },
      },
    })
    const responseWithQuotedDelimiter = await s3Client.send(queryCommandWithQuotedDelimiter)
    return responseWithQuotedDelimiter
  }
}

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

export const uploadFileToBucket = async ({
  bucketName,
  fileName,
  fileBuffer,
  clientConfig,
}: {
  bucketName: string
  fileName: string
  fileBuffer: PutObjectCommandInput['Body']
  clientConfig?: S3ClientConfig
}) => {
  const s3Client = new S3Client(clientConfig ?? [])
  const putExternalObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
  })

  const putCommandResponse = await s3Client.send(putExternalObjectCommand)

  return { response: putCommandResponse, dumpedAt: dayjs() }
}

export const listObjectsFromBucket = async ({
  bucketName,
  prefix,
}: {
  bucketName: string
  prefix: string
}) => {
  const s3Client = new S3Client()
  const listObjectsCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  })

  const listObjectsCommandResponse = await s3Client.send(listObjectsCommand)

  return listObjectsCommandResponse.Contents ?? []
}

export const uploadMultipartObjectToBucket = async ({
  bucketName,
  fileName,
  fileStream,
  clientConfig,
}: {
  bucketName: string
  fileName: string
  fileStream: PutObjectCommandInput['Body']
  clientConfig?: S3ClientConfig
}) => {
  const s3Client = new S3Client(clientConfig ?? {})

  const upload = new UploadStream({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: fileName,
      Body: fileStream,
    },
  })

  await upload.done()
}

export const getS3ObjectMetadata = async ({
  bucketName,
  objectKey,
}: {
  bucketName: string
  objectKey: string
}) => {
  try {
    const s3Client = new S3Client()

    const getAttributesCommand = new GetObjectAttributesCommand({
      Bucket: bucketName,
      Key: objectKey,
      ObjectAttributes: ['ObjectSize'],
    })

    const response = await s3Client.send(getAttributesCommand)

    return response
  } catch (error) {
    logger.warn(
      `Unable to get file metadata from bucket (${bucketName}), returning undefined values`,
      { error },
    )
    const response: Partial<GetObjectAttributesCommandOutput> = {
      LastModified: undefined,
      ObjectSize: undefined,
    }
    return response
  }
}

export const countDistinctValuesFromCSV = async (fileUri: string, columnNames: string[]) => {
  const { bucketName, fileKey } = getBucketKeyFromURI(fileUri)
  const fileBuffer = await downloadFileFromBucket({ bucketName, objectKey: fileKey })
  const fileStream = Readable.from(fileBuffer)

  const columnsValues: string[][] = new Array(columnNames.length).fill(null).map(() => [])
  await new Promise((resolve, reject) => {
    parseStream(fileStream, { headers: true, objectMode: true })
      .on('data', (row) => {
        if (row) {
          columnNames.forEach((columnName, index) => {
            columnsValues[index].push(row[columnName])
          })
        }
      })
      .on('error', reject)
      .on('end', resolve)
  })

  const distinctColumnsValuesCounts = columnsValues.map((columnValues) => {
    const distinctColumnValuesSet = new Set(columnValues)
    return distinctColumnValuesSet.size
  })

  return distinctColumnsValuesCounts
}

export const getS3FileURI = (bucketName: string, fileKey: string) => {
  return `s3://${bucketName}/${fileKey}`
}

export const getBucketKeyFromURI = (s3URI: string) => {
  const path = s3URI.split('//').pop()
  if (!path) throw new Error('Invalid S3 URI')

  const [bucketName, ...fileKeyPaths] = path.split('/')
  return { bucketName, fileKey: fileKeyPaths.join('/') }
}
