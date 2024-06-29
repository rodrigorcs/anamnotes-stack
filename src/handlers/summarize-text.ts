import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { WebSocketConnectionsRepository } from '../repositories/WebSocketConnectionsRepository'
import { logger } from '../common/powertools/logger'
import { ChunkTranscriptionsRepository } from '../repositories/ChunkTranscriptionsRepository'
import { DynamoDBStreamHandler } from 'aws-lambda'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { IChunkTranscriptionEntity } from '../models/schemas/ChunkTranscription/schema'
import { OpenAI } from 'openai'

export const handler: DynamoDBStreamHandler = async (event) => {
  const websocketURL = `https://q5nwr2lnm7.execute-api.us-east-1.amazonaws.com/prod`
  const client = new ApiGatewayManagementApiClient({ endpoint: websocketURL })
  const chunkTranscriptionsRepository = new ChunkTranscriptionsRepository()
  const wsConnectionsRepository = new WebSocketConnectionsRepository()

  // TODO: Add try/catch
  logger.info('Ingested event', { event })
  for (const record of event.Records) {
    logger.info('Ingested record', { record })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedRecord = record as any // TODO: Add schema validator
    const chunkTranscriptionEntity = unmarshall(
      parsedRecord.dynamodb.NewImage,
    ) as IChunkTranscriptionEntity
    logger.info('Entity after unmarshall', { chunkTranscriptionEntity })

    const { userId, conversationId, id: chunkId } = chunkTranscriptionEntity

    const chunkTranscriptions = await chunkTranscriptionsRepository.get({
      conversationId,
      userId,
      id: chunkId,
    })

    logger.info('chunkTranscriptions', { chunkTranscriptions })

    const openaiClient = new OpenAI()
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente médico, especializado em escrever os resumos das anamneses feitas pelo médico com o paciente.\n\nO médico fez a seguinte anamnese verbal com um paciente, a anamnese passou por uma transcrição que pode conter erros. Visto isso, considere o contexto médico ao ler a transcrição, principalmente exames, procedimentos, orgãos e remédios.\nCaso haja informação relevante e você esteja confiante quanto ao resumo, chame a função `resume_anamnesis`. Se não, chame a função `throw_error`.\n\nEvite sugerir diagnósticos ou tratamentos, apenas resuma o que foi dito na anamnese.',
        },
        { role: 'user', content: JSON.stringify(chunkTranscriptions[0].contentSections) },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'summarize',
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
            name: 'throwError',
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

    const connections = await wsConnectionsRepository.get({
      userId: 'test-userId',
      conversationId,
    })
    const connectionId = connections[0].id

    const requestParams = {
      ConnectionId: connectionId,
      Data: JSON.stringify(response),
    }

    logger.info('connectionId', { connections, connectionId })

    const command = new PostToConnectionCommand(requestParams)
    await client.send(command)
  }
}
