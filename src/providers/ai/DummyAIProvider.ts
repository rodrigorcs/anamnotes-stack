import {
  IAIProvider,
  TSummarizeResponse,
  TTranscribeResponse,
} from '../../models/providers/AIProvider'

export class DummyAIProvider implements IAIProvider {
  transcribe = async (): TTranscribeResponse => {
    return [
      {
        text: 'Boa tarde, senhor. Qual é o seu nome? Meu nome é Roque. E o senhor tem quantos anos? Quarenta e seis. O senhor é daqui de Salvador mesmo? Sou sim. Mora onde? Águas Claras. Ah, entendi. E qual é a data de nascimento do senhor? Dezessete de dois mil novecentos e setenta e oito. E o grau de escolaridade? Terceiro grau. O senhor é casado ou solteiro? Sou casado. E o meu estômago tá doendo, moça. Deve ter voado aí. Entendi. E o que é que traz o senhor aqui hoje? O meu estômago tá doendo. Você é surda? Entendi. Entendi. E tá doendo em que parte do estômago? Aponte aí pra mim. Aqui no meio aqui, assim. Ah, tá. E começou há quanto tempo essa dor? Uma semana. Uma semana? E piorou hoje? Foi pior hoje. Senti náusea. Hum, entendi. Mas a dor continua igual? Continua igual. E se o senhor pudesse graduar essa dor de zero a dez? Sendo zero sem dor e dez a pior dor que o senhor já sentiu? Seis. E era seis desde o início? Sim. Entendi. E o senhor teve algum outro sintoma associado? Só náusea. Só náusea só hoje. Teve vômito, diarreia? Diarreia, sim. Diarreia só hoje também ou teve antes? Ontem e hoje. E a diarreia foi com sangue, com muco? Não. E o senhor comeu alguma coisa diferente do habitual esses dias? Comi. Comi uma carajé. Então acho que tava estragado. E o senhor comeu carajé quando começou a dor? Deve ter sido. Ah, uma semana? Ah, entendi. Tá doendo até hoje. Você comeu muito carajé, não foi não? Entendi. Eu vou passar os exames pro senhor, tá certo? Tem mais alguma queixa? Não, só isso mesmo. Ah, tá bom. Eu quero que você passe uma medicação na veia pra eu passar logo essa dor. Na veia? Mas não precisa disso tudo não. Eu vou fazer o exame físico no senhor, vou fazer o exame, passar o exame pro senhor e eu avalio o que eu vou passar pro senhor de medicação, tá bom? Tá certo. Tá bom.',
      },
    ]
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
