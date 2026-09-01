/**
 * b4u-registro-campos.js — o CATÁLOGO da aba "Registro".
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * Até 08/2026 o `registro.html` guardava um objeto `HINTS` com a seção e o tipo
 * de cada coluna, escrito à mão dentro da página. Enquanto eram 41 colunas isso
 * funcionava. Quando o formulário de diagnóstico da reunião inicial virou parte
 * do cadastro, passaram de 170 — e um catálogo desse tamanho não pode morar
 * dentro de uma página, porque três coisas precisam concordar sobre ele:
 *
 *   1. o `registro.html`, que monta a ficha do cliente em seções;
 *   2. o Apps Script, que CRIA as colunas que ainda não existem na planilha;
 *   3. quem for acrescentar uma pergunta nova daqui a seis meses.
 *
 * Então o catálogo é este arquivo, e só ele. A planilha continua sendo a fonte
 * da verdade sobre quais colunas EXISTEM — a página segue montando a ficha a
 * partir dos cabeçalhos vivos, e coluna que alguém criar na mão continua
 * aparecendo sozinha na seção "Outros". O que este arquivo diz é outra coisa:
 * em que SEÇÃO cada coluna conhecida entra, que TIPO de campo ela é, e quais
 * são as opções quando é uma escolha. É decoração informada, não autoridade.
 *
 * ---------------------------------------------------------------------------
 * A REGRA QUE NÃO PODE SER QUEBRADA: NOME DE COLUNA É CONTRATO
 *
 * Vários painéis (colaborador, clientes ativos, equipe, restituição) leem a aba
 * Registro POR NOME de coluna. Renomear uma coluna que já existe quebra todos
 * eles em silêncio — a leitura não dá erro, só devolve vazio. Por isso as 41
 * colunas originais aparecem aqui com o nome EXATO que já têm na planilha,
 * incluindo as maiúsculas de "VALE TRANSPORTE" e a interrogação de "Paga
 * aluguel?". Nada aqui renomeia nada: este arquivo só ACRESCENTA.
 *
 * `nova:1` marca as colunas que ainda não existem na aba. É o que o
 * `criarColunasRegistro_()` do Apps Script usa para saber o que anexar ao fim da
 * planilha, na ordem em que estão aqui. Depois de criadas, a marca pode ficar:
 * ela é histórica, e a criação é idempotente (coluna que já existe é pulada).
 *
 * ---------------------------------------------------------------------------
 * TIPOS
 *
 *   text      uma linha
 *   textarea  bloco (observação, lista, descrição)
 *   date      aaaa-mm-dd
 *   select    escolha única, `opts` (a primeira é '' = não respondido)
 *   multi     várias escolhas, `opts`; gravadas numa célula só, unidas por ' · '
 *   money     texto com máscara de valor — a planilha guarda como texto
 *
 * `req:1`  obrigatório no cadastro de cliente novo (e SÓ lá)
 * `full:1` ocupa a linha inteira do formulário
 * `role`   apelido usado pelo código (id, nome, cnpj, razao, cidade, uf…)
 * `dica`   texto de apoio abaixo do campo
 */
(function (w) {

/* A ordem das seções na ficha. "Outros" é sempre a última: é onde cai a coluna
   que alguém criou na planilha e ainda não catalogou aqui. */
var ORDEM = [
  'Identificação',
  'Empresa e societário',
  'Fiscal',
  'Faturamento',
  'Equiparação — situação',
  'Tomador de serviços',
  'Departamento pessoal',
  'Outras contratações',
  'Estrutura e funcionamento',
  'Aluguel',
  'Acessos',
  'Controladoria',
  'Transição contábil',
  'Jurídico e adequação societária',
  'Diagnóstico de equiparação',
  'Outros'
];

/* Uma frase por seção, mostrada quando ela está recolhida. Serve para o
   colaborador decidir se AQUELE cliente precisa daquela seção sem abrir. */
var SOBRE = {
  'Identificação':                  'Quem é a empresa e como falamos com ela.',
  'Empresa e societário':           'Quadro societário, especialidades e pendências.',
  'Fiscal':                         'Regime, ISS, débitos e parcelamentos.',
  'Faturamento':                    'De onde vem a receita, quem emite a nota e como ela é descrita.',
  'Equiparação — situação':         'Cliente já equiparado, e os acessos para trabalhar o caso.',
  'Tomador de serviços':            'NFs que a empresa RECEBE. Só Contabilidade + Controladoria.',
  'Departamento pessoal':           'Folha, benefícios, ponto e saúde ocupacional.',
  'Outras contratações':            'Autônomos, repasses a médicos e contratos informais.',
  'Estrutura e funcionamento':      'Imóvel, salas, alvarás, AVCB e CNES.',
  'Aluguel':                        'Contrato, valor e para quem é pago.',
  'Acessos':                        'Certificado digital, procurações e login de prefeitura.',
  'Controladoria':                  'Controle financeiro, recebimentos, taxas e custos recorrentes.',
  'Transição contábil':             'A saída da contabilidade anterior e a data de início.',
  'Jurídico e adequação societária': 'Alteração contratual, minuta e alvarás hospitalares.',
  'Diagnóstico de equiparação':     'Preenchido pela página de diagnóstico. Aqui só se lê.',
  'Outros':                         'Colunas que existem na planilha e ainda não foram catalogadas.'
};

/* Os produtos que tornam cada seção RELEVANTE. Não escondem nada — todas as
   seções aparecem para todo cliente, porque quem decide se preenche é quem está
   na reunião. Servem para marcar a seção como "provavelmente sua" e para abrir
   as certas por padrão. */
var RELEVANCIA = {
  'Faturamento':                     ['Contabilidade', 'Controladoria', 'Equiparação'],
  'Equiparação — situação':          ['Equiparação'],
  'Tomador de serviços':             ['Contabilidade', 'Controladoria'],
  'Departamento pessoal':            ['Contabilidade', 'Controladoria', 'DP pessoa física'],
  'Outras contratações':             ['Contabilidade', 'Controladoria', 'DP pessoa física'],
  'Controladoria':                   ['Controladoria'],
  'Transição contábil':              ['Contabilidade', 'Controladoria'],
  'Jurídico e adequação societária': ['Equiparação'],
  'Diagnóstico de equiparação':      ['Equiparação']
};

var SIM_NAO       = ['', 'Sim', 'Não'];
var SIM_NAO_SEI   = ['', 'Sim', 'Não', 'Não sabe'];
var SIM_NAO_PARC  = ['', 'Sim', 'Não', 'Parcial', 'Não sabe'];

/* ═══════════════════════════════════════════════════════════════════════════
   AS COLUNAS, na ordem em que entram na planilha.
   ═══════════════════════════════════════════════════════════════════════════ */
var CAMPOS = [

/* ── Identificação ─────────────────────────────────────────────────────────
   As cinco primeiras são do sistema: aparecem na ficha só de leitura e NUNCA
   no formulário de cliente novo (quem cria pasta e planilha é o onboarding). */
{col:'ID',                        s:'Identificação', t:'text', role:'id',       sistema:1},
{col:'Nome',                      s:'Identificação', t:'text', role:'nome',     sistema:1, full:1},
{col:'Ativo',                     s:'Identificação', t:'select', role:'ativo',  sistema:1, opts:['','Ativo','Em inativação','Inativo','Prospect']},
{col:'Drive',                     s:'Identificação', t:'text', role:'drive',    sistema:1, full:1},
{col:'Produtos Back4you',         s:'Identificação', t:'text', role:'produtos', sistema:1, full:1},

{col:'CNPJ ou CPF',               s:'Identificação', t:'text', req:1, role:'cnpj'},
{col:'Razão social da empresa',   s:'Identificação', t:'text', req:1, full:1, role:'razao'},
{col:'Nome Fantasia',             s:'Identificação', t:'text'},
{col:'Como se referem à empresa', s:'Identificação', t:'text', nova:1,
 dica:'o apelido que o cliente usa — é assim que a equipe vai chamar nas mensagens'},
{col:'Cidade',                    s:'Identificação', t:'text', req:1, role:'cidade'},
{col:'UF',                        s:'Identificação', t:'text', req:1, max:2, up:1, role:'uf', nova:1},
{col:'Endereço',                  s:'Identificação', t:'text', full:1},
{col:'Cadastro Municipal (número)', s:'Identificação', t:'text'},
{col:'CNES',                      s:'Identificação', t:'text', nova:1,
 dica:'sete dígitos — muitos começam com zero, então a coluna é texto'},
{col:'Resumo',                    s:'Identificação', t:'textarea', full:1},
{col:'Link Form Diagnóstico',     s:'Identificação', t:'text', full:1},
{col:'Responsável pela conta na B4Y', s:'Identificação', t:'text', nova:1},
{col:'Meio preferível de contato', s:'Identificação', t:'select', nova:1,
 opts:['','WhatsApp','E-mail','Telefone','Reunião marcada']},
{col:'Data do onboarding',        s:'Identificação', t:'date', nova:1},
{col:'Consultor do onboarding',   s:'Identificação', t:'text', nova:1},

/* ── Empresa e societário ───────────────────────────────────────────────── */
{col:'Data de Abertura',          s:'Empresa e societário', t:'date'},
{col:'Porte',                     s:'Empresa e societário', t:'select',
 opts:['','Microempresa','Empresa de Pequeno Porte','Sem enquadramento']},
{col:'Natureza Jurídica',         s:'Empresa e societário', t:'select',
 opts:['','Sociedade Empresária Limitada','Sociedade Simples Limitada','Sociedade Simples Pura','Sociedade Limitada Unipessoal','Empresário (Individual)','Pessoa física']},
{col:'Registro na Junta',         s:'Empresa e societário', t:'select',
 opts:['','Junta','Junta (EI/SLU)','Cartório','Não sabe'],
 dica:'sociedade simples registrada em cartório costuma ter a equiparação negada na entrada'},
{col:'CNAEs',                     s:'Empresa e societário', t:'textarea', full:1},
{col:'Número de sócios',          s:'Empresa e societário', t:'text'},
{col:'Descrição sócios',          s:'Empresa e societário', t:'textarea', full:1},
{col:'Sócio em contato e especialidade', s:'Empresa e societário', t:'text', nova:1, full:1,
 dica:'nome, CRM e especialidade'},
{col:'Demais sócios e especialidades',   s:'Empresa e societário', t:'textarea', nova:1, full:1},
{col:'Contatos dos sócios',       s:'Empresa e societário', t:'textarea', nova:1, full:1},
{col:'Gestor financeiro',         s:'Empresa e societário', t:'text', nova:1,
 dica:'quem cuida do financeiro no dia a dia — às vezes é um terceiro'},
{col:'Como cada sócio fatura',    s:'Empresa e societário', t:'textarea', nova:1, full:1,
 dica:'uma frase curta por sócio: de onde vem a receita dele'},
{col:'Acordo de sócios ou atas',  s:'Empresa e societário', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Outros CNPJs do grupo',     s:'Empresa e societário', t:'textarea', nova:1, full:1,
 dica:'CNPJ, situação e para que serve — inclusive os que só existem no papel'},
{col:'Pendências societárias em aberto', s:'Empresa e societário', t:'textarea', nova:1, full:1,
 dica:'conflito com sócio, sócio a retirar, alteração parada'},

/* ── Fiscal ─────────────────────────────────────────────────────────────── */
{col:'Regime',                    s:'Fiscal', t:'select', role:'regime',
 opts:['','Lucro Presumido','Lucro Real','Simples Nacional','Outro']},
{col:'Fator R?',                  s:'Fiscal', t:'select', opts:SIM_NAO},
{col:'Equiparados',               s:'Fiscal', t:'select',
 opts:['','Sim','Não','Em processo administrativo','N/A']},
{col:'ISS',                       s:'Fiscal', t:'select', opts:['','Fixo','Variável','N/A']},
{col:'ISS alíquota (%)',          s:'Fiscal', t:'text', nova:1},
{col:'ISS município',             s:'Fiscal', t:'text', nova:1},
{col:'Livro caixa',               s:'Fiscal', t:'select', opts:SIM_NAO},
{col:'Contabilidade prévia',      s:'Fiscal', t:'text'},
{col:'Data de início da contabilidade', s:'Fiscal', t:'date', role:'inicio'},
{col:'Data de fim da contabilidade',    s:'Fiscal', t:'date'},
{col:'Débitos na Receita Federal',      s:'Fiscal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Parcelamentos ativos',      s:'Fiscal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Parcelamento em dia',       s:'Fiscal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Risco de exclusão do Simples', s:'Fiscal', t:'textarea', nova:1, full:1,
 dica:'há comunicado de exclusão? a partir de quando? por qual motivo?'},
{col:'Observações fiscais',       s:'Fiscal', t:'textarea', nova:1, full:1},

/* ── Faturamento ────────────────────────────────────────────────────────── */
{col:'Faturamento mensal médio',  s:'Faturamento', t:'money', nova:1},
{col:'Fontes de recebimento',     s:'Faturamento', t:'multi', nova:1, full:1,
 opts:['Particular','Convênios','Hospitais','Poder público','Outras PJ','Outros']},
{col:'Detalhe das fontes de recebimento', s:'Faturamento', t:'textarea', nova:1, full:1},
{col:'Modalidades de atendimento e emissão', s:'Faturamento', t:'multi', nova:1, full:1,
 dica:'como o atendimento vira nota — é o que separa receita equiparável de consulta',
 opts:[
   'Atende particular e emite NF direto ao paciente',
   'Atende convênio e emite NF direto ao convênio',
   'Atende no hospital em ambulatório e emite NF ao hospital',
   'Atende no hospital em plantão e emite NF ao hospital',
   'Atende no hospital em visita de enfermaria e emite NF ao hospital',
   'Atende no hospital em unidade intensiva e emite NF ao hospital',
   'Pede ao hospital para faturar seus pacientes e emite NF ao hospital',
   'Realiza treinamentos ou aulas e emite NF para PF',
   'Realiza treinamentos ou aulas e emite NF para PJ (laboratórios ou cursos)'
 ]},
{col:'Possui contratos com convênios ou hospitais', s:'Faturamento', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Quais convênios e hospitais', s:'Faturamento', t:'textarea', nova:1, full:1,
 dica:'o nome de cada um, e se o contrato está vigente'},
{col:'Médicos que recebem pela PJ', s:'Faturamento', t:'textarea', nova:1, full:1},
{col:'NF identifica o médico que prestou', s:'Faturamento', t:'select', nova:1,
 opts:['','Sim','Não','Às vezes','Não sabe']},
{col:'Todos os atendimentos geram NF', s:'Faturamento', t:'select', nova:1,
 opts:['','Sim','Não','Às vezes','Não sabe']},
{col:'Entradas na conta PJ sem NF', s:'Faturamento', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Volume mensal sem NF',      s:'Faturamento', t:'textarea', nova:1, full:1},
{col:'% Procedimentos e cirurgias', s:'Faturamento', t:'text', nova:1},
{col:'% Consultas',               s:'Faturamento', t:'text', nova:1},
{col:'% Exames',                  s:'Faturamento', t:'text', nova:1},
{col:'% Educação',                s:'Faturamento', t:'text', nova:1},
{col:'% Outros',                  s:'Faturamento', t:'text', nova:1},
{col:'Detalhe da divisão de faturamento', s:'Faturamento', t:'textarea', nova:1, full:1},
{col:'NF descreve serviço e profissional', s:'Faturamento', t:'select', nova:1, opts:SIM_NAO_PARC},
{col:'Exemplo de descrição da NF', s:'Faturamento', t:'textarea', nova:1, full:1},
{col:'Distribuição de lucros mensal (PJ→PF)', s:'Faturamento', t:'textarea', nova:1, full:1,
 dica:'atenção a valores acima de R$ 50 mil'},
{col:'Observações de faturamento', s:'Faturamento', t:'textarea', nova:1, full:1},

/* ── Equiparação — situação ─────────────────────────────────────────────── */
{col:'Cliente já equiparado',     s:'Equiparação — situação', t:'select', nova:1,
 opts:['','Não','Sim','Aplicou e parou','Não sabe']},
{col:'Equiparação obtida por',    s:'Equiparação — situação', t:'select', nova:1,
 opts:['','Ação judicial com trânsito em julgado','Via administrativa com despacho','Via administrativa declaratória','Não sabe']},
{col:'NFs da equiparação identificam o serviço', s:'Equiparação — situação', t:'select', nova:1, opts:SIM_NAO_PARC},
{col:'Observações da equiparação', s:'Equiparação — situação', t:'textarea', nova:1, full:1},
{col:'Acessos necessários (equiparação)', s:'Equiparação — situação', t:'multi', nova:1, full:1,
 opts:['Procuração e-CAC','Certificado digital','Login da prefeitura']},
{col:'Login e senha da prefeitura', s:'Equiparação — situação', t:'select', nova:1,
 opts:['','Recebido','Pendente','N/A']},
{col:'Podemos solicitar documentos ao contador', s:'Equiparação — situação', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Contato do contador',       s:'Equiparação — situação', t:'text', nova:1, full:1},

/* ── Tomador de serviços ────────────────────────────────────────────────── */
{col:'Recebe NFs de prestadores', s:'Tomador de serviços', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Principais prestadores e serviços', s:'Tomador de serviços', t:'textarea', nova:1, full:1,
 dica:'nome, valor e recorrência'},
{col:'Frequência de envio à Back4You', s:'Tomador de serviços', t:'select', nova:1,
 opts:['','Imediato após emissão','Semanal','Até dia 05 do mês seguinte','Outro']},
{col:'Observações de tomador',    s:'Tomador de serviços', t:'textarea', nova:1, full:1},

/* ── Departamento pessoal ───────────────────────────────────────────────── */
{col:'Tem DPTO pessoal',          s:'Departamento pessoal', t:'select', opts:SIM_NAO},
{col:'Possui funcionários registrados', s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'# de funcionários',         s:'Departamento pessoal', t:'text'},
{col:'Todos registrados neste CNPJ', s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Onde estão os demais',      s:'Departamento pessoal', t:'select', nova:1,
 opts:['','Outro CNPJ','Pessoa Física','Ambos','N/A']},
{col:'Detalhe dos demais registros', s:'Departamento pessoal', t:'textarea', nova:1, full:1},
{col:'Pró Labore',                s:'Departamento pessoal', t:'text'},
{col:'Data de pagamento dos salários', s:'Departamento pessoal', t:'textarea', nova:1, full:1},
{col:'Quando recebe a folha da contabilidade atual', s:'Departamento pessoal', t:'text', nova:1},
{col:'Adiantamento salarial',     s:'Departamento pessoal', t:'select', opts:SIM_NAO},
{col:'Vale Alimentação',          s:'Departamento pessoal', t:'select', opts:SIM_NAO},
{col:'VALE TRANSPORTE',           s:'Departamento pessoal', t:'select', opts:SIM_NAO},
{col:'Benefícios pagos',          s:'Departamento pessoal', t:'multi', nova:1, full:1,
 opts:['VT','VA','VR','Plano de saúde','Outros']},
{col:'Benefício ou valor pago por fora', s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Detalhe do pagamento por fora', s:'Departamento pessoal', t:'textarea', nova:1, full:1},
{col:'Desconta benefícios em faltas', s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Suspende VA/VR nas férias', s:'Departamento pessoal', t:'select', nova:1,
 opts:['','Sim','Não','Não sabe','N/A']},
{col:'Recebe recibos ou boletos', s:'Departamento pessoal', t:'select', nova:1,
 opts:['','Somente recibos','Também boletos','Não sabe']},
{col:'Outro pagamento por fora de prestação de serviço', s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Controle de Ponto',         s:'Departamento pessoal', t:'select',
 opts:['','Manual','Planilha','App','Relógio eletrônico','Não faz','Outro']},
{col:'B4Y envia folhas de ponto', s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO},
{col:'Possui banco de horas',     s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Medicina e segurança do trabalho', s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Possui PCMSO e PGR',        s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Exames ocupacionais',       s:'Departamento pessoal', t:'select', nova:1, opts:SIM_NAO_PARC},
{col:'Funcionário de pessoa física', s:'Departamento pessoal', t:'select', opts:SIM_NAO},
{col:'Empregada doméstica sob a B4Y', s:'Departamento pessoal', t:'select', nova:1,
 opts:['','Sim','Não','N/A']},
{col:'O que é pago à doméstica',  s:'Departamento pessoal', t:'multi', nova:1, full:1,
 opts:['Salário','VT','Outros']},
{col:'Acesso gov.br PF',          s:'Departamento pessoal', t:'select', nova:1,
 opts:['','Procuração e-CAC','Acesso temporário','A definir','N/A']},
{col:'Passivo trabalhista conhecido', s:'Departamento pessoal', t:'textarea', nova:1, full:1,
 dica:'processo em curso, ex-funcionário de longa data, salário por fora'},
{col:'Observações de DP',         s:'Departamento pessoal', t:'textarea', nova:1, full:1},

/* ── Outras contratações ────────────────────────────────────────────────── */
{col:'Possui prestadores autônomos', s:'Outras contratações', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Funções dos autônomos',     s:'Outras contratações', t:'textarea', nova:1, full:1},
{col:'Contrato formal com autônomos', s:'Outras contratações', t:'select', nova:1, opts:SIM_NAO_PARC},
{col:'Forma de pagamento dos autônomos', s:'Outras contratações', t:'textarea', nova:1, full:1},
{col:'Autônomos emitem NF',       s:'Outras contratações', t:'select', nova:1,
 opts:['','Sim','Não','Alguns','Não sabe']},
{col:'Pagamento sai da conta PJ', s:'Outras contratações', t:'select', nova:1,
 opts:['','Sim','Não','Às vezes','Não sabe']},
{col:'Regra de repasse aos médicos', s:'Outras contratações', t:'textarea', nova:1, full:1,
 dica:'percentual por médico, base de cálculo e o que muda conforme a forma de pagamento'},
{col:'Observações de contratações', s:'Outras contratações', t:'textarea', nova:1, full:1},

/* ── Estrutura e funcionamento ──────────────────────────────────────────── */
{col:'Endereço próprio ou alugado', s:'Estrutura e funcionamento', t:'select', nova:1,
 opts:['','Próprio','Alugado','Cedido','Estrutura de terceiro']},
{col:'Metragem do imóvel',        s:'Estrutura e funcionamento', t:'text', nova:1},
{col:'Atividades exercidas no local', s:'Estrutura e funcionamento', t:'textarea', nova:1, full:1},
{col:'Número de salas',           s:'Estrutura e funcionamento', t:'text', nova:1,
 dica:'consultórios · salas de procedimento · leitos de observação'},
{col:'Alvará de funcionamento',   s:'Estrutura e funcionamento', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Alvará sanitário',          s:'Estrutura e funcionamento', t:'select', nova:1,
 opts:['','Vigente','Vencido','Não possui','Não sabe']},
{col:'AVCB',                      s:'Estrutura e funcionamento', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'CNES (situação)',           s:'Estrutura e funcionamento', t:'select', nova:1,
 opts:['','Possui','Possui, desatualizado','Não possui','Não sabe']},
{col:'Autuações ou multas sanitárias', s:'Estrutura e funcionamento', t:'textarea', nova:1, full:1},
{col:'Observações de estrutura',  s:'Estrutura e funcionamento', t:'textarea', nova:1, full:1},

/* ── Aluguel ────────────────────────────────────────────────────────────── */
{col:'Paga aluguel?',             s:'Aluguel', t:'select', opts:SIM_NAO},
{col:'Aluguel para PF?',          s:'Aluguel', t:'select', opts:SIM_NAO},
{col:'Pagamento Aluguel',         s:'Aluguel', t:'text'},
{col:'Valor do Aluguel',          s:'Aluguel', t:'text'},
{col:'Caução ou depósito',        s:'Aluguel', t:'text', nova:1},
{col:'Vigência do contrato de aluguel', s:'Aluguel', t:'text', nova:1},
{col:'Obs Aluguel',               s:'Aluguel', t:'textarea', full:1},

/* ── Acessos ────────────────────────────────────────────────────────────── */
{col:'Tipo de certificado digital', s:'Acessos', t:'select', nova:1,
 opts:['','A1 — arquivo no computador','A3 — token ou pen-drive','Não possui','Não sabe']},
{col:'Validade do certificado digital', s:'Acessos', t:'date', nova:1},
{col:'Quem está de posse do certificado', s:'Acessos', t:'text', nova:1},
{col:'Procuração e-CAC',          s:'Acessos', t:'select', nova:1,
 opts:['','Ativa','Solicitada','Não possui','N/A']},
{col:'Procuração SPE',            s:'Acessos', t:'select', nova:1,
 opts:['','Ativa','Solicitada','Não possui','N/A']},
{col:'Login da prefeitura',       s:'Acessos', t:'select', nova:1,
 opts:['','Recebido','Pendente','N/A']},
{col:'Solicitação enviada ao contador', s:'Acessos', t:'select', nova:1,
 opts:['','Sim','Não, direto para o cliente','N/A']},
{col:'Observações de acessos',    s:'Acessos', t:'textarea', nova:1, full:1},

/* ── Controladoria ──────────────────────────────────────────────────────── */
{col:'Possui controle financeiro', s:'Controladoria', t:'select', nova:1,
 opts:['','Sim','Não','Está iniciando']},
{col:'Formato do controle',       s:'Controladoria', t:'select', nova:1,
 opts:['','Planilha','Sistema','Outro','Nenhum']},
{col:'Responsável pelo controle', s:'Controladoria', t:'text', nova:1},
{col:'Recebe por cartão de crédito', s:'Controladoria', t:'select', nova:1, opts:SIM_NAO},
{col:'Recebe por link de pagamento', s:'Controladoria', t:'select', nova:1, opts:SIM_NAO},
{col:'Marcas das maquininhas',    s:'Controladoria', t:'text', nova:1},
{col:'Marcas dos links de pagamento', s:'Controladoria', t:'text', nova:1},
{col:'Descritivo das taxas',      s:'Controladoria', t:'select', nova:1, opts:SIM_NAO_SEI},
{col:'Contas bancárias PJ',       s:'Controladoria', t:'textarea', nova:1, full:1},
{col:'Investimentos da PJ',       s:'Controladoria', t:'textarea', nova:1, full:1,
 dica:'quanto e onde'},
{col:'Conta de investimento separada', s:'Controladoria', t:'select', nova:1, opts:SIM_NAO},
{col:'Utiliza cobrança recorrente', s:'Controladoria', t:'select', nova:1, opts:SIM_NAO},
{col:'Qual cobrança recorrente',  s:'Controladoria', t:'text', nova:1},
{col:'Custo de produto recorrente por atendimento', s:'Controladoria', t:'select', nova:1, opts:SIM_NAO,
 dica:'preenchimento, botox, insumo que sobe conforme o atendimento'},
{col:'Qual produto recorrente',   s:'Controladoria', t:'textarea', nova:1, full:1,
 dica:'nome, recorrência e valor'},
{col:'Custo de equipamento recorrente por atendimento', s:'Controladoria', t:'select', nova:1, opts:SIM_NAO,
 dica:'ponteiras, lasers, consumível de equipamento'},
{col:'Qual equipamento recorrente', s:'Controladoria', t:'textarea', nova:1, full:1,
 dica:'nome, recorrência e valor'},
{col:'Observações de controladoria', s:'Controladoria', t:'textarea', nova:1, full:1},

/* ── Transição contábil ─────────────────────────────────────────────────── */
{col:'Contabilidade anterior avisada', s:'Transição contábil', t:'select', nova:1,
 opts:['','Sim','Não','Não, mas será avisada']},
{col:'Data de início programada', s:'Transição contábil', t:'text', nova:1,
 dica:'competência — mm/aaaa'},
{col:'Multa ou aviso prévio da contabilidade anterior', s:'Transição contábil', t:'textarea', nova:1, full:1},
{col:'Cliente é Contabilizei',    s:'Transição contábil', t:'select', nova:1, opts:SIM_NAO},
{col:'Cliente baixará documentos via login', s:'Transição contábil', t:'select', nova:1,
 opts:['','Sim','Não','N/A']},
{col:'Observações de transição',  s:'Transição contábil', t:'textarea', nova:1, full:1},

/* ── Jurídico e adequação societária ────────────────────────────────────── */
{col:'Alteração contratual necessária', s:'Jurídico e adequação societária', t:'select', nova:1,
 opts:['','Sim','Não','A confirmar']},
{col:'O que precisa ser alterado', s:'Jurídico e adequação societária', t:'textarea', nova:1, full:1},
{col:'Jurídico enviará e-mail',   s:'Jurídico e adequação societária', t:'select', nova:1,
 opts:['','Combinado','Enviado','Pendente','N/A']},
{col:'Prazo da minuta',           s:'Jurídico e adequação societária', t:'text', nova:1,
 dica:'padrão: até 7 dias úteis após o retorno do cliente'},
{col:'Necessidade de alvarás hospitalares', s:'Jurídico e adequação societária', t:'select', nova:1,
 opts:['','Sim','Não','Depende']},
{col:'Observações jurídicas',     s:'Jurídico e adequação societária', t:'textarea', nova:1, full:1},

/* ── Diagnóstico de equiparação ─────────────────────────────────────────────
   Estas colunas são escritas pela página `diagnostico-equiparacao.html`, que
   calcula o escore. Na ficha do Registro elas aparecem para LEITURA — editar o
   escore à mão faria a nota deixar de corresponder às respostas que a
   produziram, e é isso que a coluna "Diag Dados (JSON)" existe para impedir:
   ela é o formulário inteiro, e é dela que o diagnóstico é reaberto. */
{col:'Diag Data',                 s:'Diagnóstico de equiparação', t:'date', ro:1, nova:1},
{col:'Diag Consultor',            s:'Diagnóstico de equiparação', t:'text', ro:1, nova:1},
{col:'Diag Escore Fato',          s:'Diagnóstico de equiparação', t:'text', ro:1, nova:1,
 dica:'1 a 100 — atuação empresarial de fato. 50 é o muro.'},
{col:'Diag Classificação',        s:'Diagnóstico de equiparação', t:'text', ro:1, nova:1},
{col:'Diag Prontidão Prova %',    s:'Diagnóstico de equiparação', t:'text', ro:1, nova:1,
 dica:'o quanto está provado em documento — não entra no escore'},
{col:'Diag Completude %',         s:'Diagnóstico de equiparação', t:'text', ro:1, nova:1},
{col:'Diag Trava',                s:'Diagnóstico de equiparação', t:'text', ro:1, nova:1},
{col:'Diag Pendências',           s:'Diagnóstico de equiparação', t:'textarea', ro:1, full:1, nova:1},
{col:'Diag Recomendação',         s:'Diagnóstico de equiparação', t:'textarea', ro:1, full:1, nova:1},
{col:'Diag Alertas',              s:'Diagnóstico de equiparação', t:'textarea', ro:1, full:1, nova:1},
{col:'Diag Dados (JSON)',         s:'Diagnóstico de equiparação', t:'textarea', ro:1, full:1, nova:1,
 dica:'o formulário inteiro, para reabrir o diagnóstico. Não editar à mão.'}
];

/* As colunas do diagnóstico que a página cria sozinha (uma por pergunta) NÃO
   entram nesta lista de propósito: elas nascem da rota `diag_salvar`, na ordem
   do formulário, e o catálogo as recebe na seção "Outros" até alguém decidir
   promovê-las. Catalogar quarenta perguntas aqui e outras quarenta lá dentro
   criaria duas verdades sobre a mesma coisa — e a que vale é a do formulário,
   que é quem faz a pergunta. */

w.B4U_REGISTRO_CAMPOS = {
  ordem: ORDEM,
  sobre: SOBRE,
  relevancia: RELEVANCIA,
  campos: CAMPOS,
  /* Só as que ainda não existem na planilha, na ordem — é o que o Apps Script
     anexa ao fim da aba. */
  novas: CAMPOS.filter(function (c) { return c.nova; }).map(function (c) { return c.col; })
};

})(window);
