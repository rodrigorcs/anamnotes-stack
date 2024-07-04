import { ISummarization } from '../contracts/Summarization'

export enum EWebsocketMessageTypes {
  SUMMARIZATION = 'summarization',
}

interface IWebsocketMessageError {
  message: string | null
}

export interface IWebsocketMessage<DataType> {
  success: boolean
  type: EWebsocketMessageTypes
  data?: DataType | IWebsocketMessageError
  error?: IWebsocketMessageError
}

export type TSummarizationWebsocketMessage = IWebsocketMessage<
  Pick<ISummarization, 'conversationId' | 'content'>
>
