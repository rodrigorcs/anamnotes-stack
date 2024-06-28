import { OpenAI, toFile } from 'openai'
import {
  IAIProvider,
  ITranscribeParams,
  TTranscribeResponse,
} from '../../models/providers/AIProvider'

export class OpenAIProvider implements IAIProvider {
  transcribe = async ({ fileByteArray, fileName }: ITranscribeParams): TTranscribeResponse => {
    const file = await toFile(fileByteArray, fileName)

    const openAIClient = new OpenAI()

    const transcription = await openAIClient.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'pt',
    })

    return [
      {
        text: transcription.text,
      },
    ]
  }
}
