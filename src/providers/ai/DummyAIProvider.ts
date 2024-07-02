import {
  IAIProvider,
  TSummarizeResponse,
  TTranscribeResponse,
} from '../../models/providers/AIProvider'

export class DummyAIProvider implements IAIProvider {
  transcribe = async (): TTranscribeResponse => {
    return {
      duration: 28.2,
      segments: [
        {
          start: 0,
          end: 5,
          text: 'Boa tarde, senhor. Qual é o seu nome?',
        },
        {
          start: 5,
          end: 7,
          text: 'Meu nome é Roque.',
        },
        {
          start: 7,
          end: 9,
          text: 'E o senhor tem quantos anos?',
        },
        {
          start: 9,
          end: 10,
          text: 'Quarenta e seis.',
        },
        {
          start: 10,
          end: 12,
          text: 'O senhor é daqui de Salvador mesmo?',
        },
        {
          start: 12,
          end: 13,
          text: 'Sou sim.',
        },
        {
          start: 13,
          end: 15,
          text: 'Mora onde?',
        },
        {
          start: 15,
          end: 17,
          text: 'Águas Claras.',
        },
        {
          start: 17,
          end: 22,
          text: 'Ah, entendi. E qual a data de nascimento do senhor?',
        },
        {
          start: 22,
          end: 25,
          text: 'Dezessete dois mil novecentos e oitenta e oito.',
        },
        {
          start: 25,
          end: 27,
          text: 'E o grau de escolaridade?',
        },
        {
          start: 27,
          end: 29,
          text: 'Terceiro grau.',
        },
      ],
    }
  }
  summarize = async (): TSummarizeResponse => {
    return [
      {
        slug: 'identificacaoPaciente',
        content:
          'Nome: Roque, Idade: 46 anos, Data de nascimento: 17/02/1978, Procedência: Salvador, Endereço: Águas Claras, Estado civil: Casado, Grau de escolaridade: Terceiro grau',
      },
      {
        slug: 'queixaPrincipal',
        content: 'Dor no estômago',
      },
      {
        slug: 'historiaDoencaAtual',
        content:
          'Paciente relata dor no estômago há uma semana, localizada na região central do abdômen. A dor é constante, graduada em 6/10 desde o início. Piora da dor hoje, associada a náusea e diarreia (sem sangue ou muco) desde ontem. Suspeita de ingestão de alimento estragado (acarajé) uma semana atrás. Paciente recusa outros sintomas.',
      },
      {
        slug: 'conduta',
        content:
          'Foram solicitados exames para avaliação da condição do paciente. Médico realizou exame físico e discutiu a possibilidade de medicação conforme os resultados dos exames.',
      },
      {
        slug: 'exameFisico',
        content: 'Médico realizará exame físico.',
      },
    ]
  }
}
