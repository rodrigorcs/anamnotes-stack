import { OpenAI, toFile } from 'openai'
import {
  IAIProvider,
  ISummarizeParams,
  ITranscribeParams,
  TSummarizeResponse,
  TTranscribeResponse,
} from '../../models/providers/AIProvider'
import { logger } from '../../common/powertools/logger'
import {
  IChunkTranscriptionContent,
  IChunkTranscriptionContentSection,
} from '../../models/contracts/ChunkTranscription'

enum ESummarizeFunctionNames {
  SUMMARIZE = 'summarize',
  THROW_ERROR = 'throwError',
}

// https://platform.openai.com/docs/api-reference/audio/verbose-json-object
interface IOpenAIVerboseSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
}
interface IOpenAIVerboseTranscription {
  task: string
  language: string
  duration: number
  text: string
  segments: IOpenAIVerboseSegment[]
}

export class OpenAIProvider implements IAIProvider {
  transcribe = async ({
    fileByteArray,
    fileName,
    previousContext,
  }: ITranscribeParams): TTranscribeResponse => {
    const file = await toFile(fileByteArray, fileName)

    const openAIClient = new OpenAI()

    const transcriptionProps: Omit<OpenAI.Audio.Transcriptions.TranscriptionCreateParams, 'file'> =
      {
        model: 'whisper-1',
        language: 'pt',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
        prompt: previousContext,
      }
    logger.info('Transcription', { transcriptionProps })

    const transcription = (await openAIClient.audio.transcriptions.create({
      ...transcriptionProps,
      file,
    })) as IOpenAIVerboseTranscription

    logger.info('Transcription', { transcription })

    const parsedSegments: IChunkTranscriptionContentSection[] = transcription.segments.map(
      (segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
        confidence: Math.exp(segment.avg_logprob),
        hasSpeech: segment.no_speech_prob <= 1 || segment.avg_logprob >= -1,
      }),
    )

    const parsedTranscription: IChunkTranscriptionContent = {
      duration: transcription.duration,
      segments: parsedSegments,
    }

    return parsedTranscription
  }
  summarize = async ({ contentSections }: ISummarizeParams): TSummarizeResponse => {
    logger.info('Summarizing content sections', { contentSections })

    const openAIClient = new OpenAI()

    const response = await openAIClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente médico, especializado em escrever os resumos das anamneses feitas pelo médico com o paciente.\n\nO médico fez a seguinte anamnese verbal com um paciente, a anamnese passou por uma transcrição que pode conter erros. Visto isso, considere o contexto médico ao ler a transcrição, principalmente exames, procedimentos, orgãos e remédios.\nCaso haja informação relevante e você esteja confiante quanto ao resumo, chame a função `resume_anamnesis`. Se não, chame a função `throw_error`.\n\nEvite sugerir diagnósticos ou tratamentos, apenas resuma o que foi dito na anamnese, não inclua a propriedade se não houver informação relevante.',
        },
        { role: 'user', content: JSON.stringify(contentSections) },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: ESummarizeFunctionNames.SUMMARIZE,
            description: 'Resume a anamnese dividindo em diferentes tópicos',
            parameters: {
              type: 'object',
              properties: {
                identificacaoPaciente: {
                  type: 'string',
                  description:
                    'nome, idade, data de nascimento, filiação, estado civil, raça, sexo, religião, profissão, naturalidade, procedência, endereço e telefone',
                },
                queixaPrincipal: {
                  type: 'string',
                  description: 'descrição sucinta da razão da consulta',
                },
                historiaDoencaAtual: {
                  type: 'string',
                  description:
                    'relato do adoecimento, início, principais sinais e sintomas, tempo de duração, forma de evolução, consequências, tratamentos realizados, internações, outras informações relevantes',
                },
                historiaFamiliar: {
                  type: 'string',
                  description:
                    'doenças pregressas na família, estado de saúde dos pais, se falecidos, a idade e a causa, principal ocupação dos pais, quantos filhos na prole, forma de relacionamento familiar, nas avaliações psiquiátricas registrar a existência de doença mental na família',
                },
                historiaPessoal: {
                  type: 'string',
                  description:
                    'informações sobre gestação, doenças intercorrentes da mãe durante a gestação, doenças fetais, parto eutócico ou distócico, condições de nascimento, evolução psicomotora com informações sobre idade em que falou e deambulou; doenças intercorrentes na infância, ciclo vacinal, aprendizado na escola, sociabilidade em casa, na escola e na comunidade; trabalho, adoecimento no trabalho, relações interpessoais na família, no trabalho e na comunidade; puberdade, vida sexual e reprodutiva, menopausa e andropausa; se professa alguma religião e qual; doenças preexistentes relacionadas ou não ao atual adoecimento; situação atual de vida',
                },
                exameFisico: {
                  type: 'string',
                  description:
                    'pele e anexos, sistema olfatório e gustativo, visual, auditivo, sensitivo-sensorial, cardiocirculatório e linfático, osteomuscular e articular, gênito-urinário e neurológico com avaliação da capacidade mental',
                },
                exameEstadoMental: {
                  type: 'string',
                  description:
                    'senso-percepção, representação, conceito, juízo e raciocínio, atenção, consciência, memória, afetividade, volição e linguagem',
                },
                hipotesesDiagnosticas: {
                  type: 'string',
                  description:
                    'possíveis doenças que orientarão o diagnóstico diferencial e a requisição de exames complementares',
                },
                examesComplementares: {
                  type: 'string',
                  description:
                    'exames solicitados e registro dos resultados (ou cópia dos próprios exames)',
                },
                conduta: {
                  type: 'string',
                  description: 'terapêutica instituída e encaminhamento a outros profissionais',
                },
                prognostico: {
                  type: 'string',
                  description: 'quando necessário por razões clínicas ou legais',
                },
                sequelas: {
                  type: 'string',
                  description:
                    'encaminhamento para outros profissionais ou prescrições específicas como órteses e próteses',
                },
              },
              required: ['queixaPrincipal'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: ESummarizeFunctionNames.THROW_ERROR,
            description: 'Retorna um erro',
            parameters: {
              type: 'object',
              properties: {
                errorMessage: {
                  type: 'string',
                  description:
                    "Motivo do erro (exemplo: 'Não foi possível gerar um resumo, há pouca informação relevante na anamnese')",
                },
              },
              required: ['errorMessage'],
            },
          },
        },
      ],
    })

    logger.info('OpenAI completions response', { response })

    const functionCalled = response.choices[0].message.tool_calls?.[0].function
    const functionParams = functionCalled?.arguments ? JSON.parse(functionCalled.arguments) : null

    if (!functionCalled || functionCalled.name === ESummarizeFunctionNames.THROW_ERROR) {
      throw new Error(functionParams.errorMessage)
    }

    const sections = Object.entries(functionParams)
      .map(([key, value]) => ({
        slug: key,
        content: value as string,
      }))
      .filter((section) => section.content?.length)

    return sections
  }
}
