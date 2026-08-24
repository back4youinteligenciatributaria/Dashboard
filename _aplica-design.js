/**
 * _aplica-design.js — copia o `:root` canônico de `b4u-design.css` para dentro
 * de cada HTML, e apaga do `:root` da página as declarações que viraram cópia.
 *
 * Mesmo padrão do `_aplica-texto.js`, pelo mesmo motivo: o bloco é COPIADO, e
 * não incluído por <link>, porque se o arquivo faltasse as 22 páginas
 * apareceriam sem cor nenhuma. O menu lateral pode faltar (e a página só perde
 * o menu); a paleta, não.
 *
 * Rodar depois de qualquer alteração em `b4u-design.css`:
 *     node _aplica-design.js
 *     node _aplica-design.js --check     (não grava; só diz o que mudaria)
 *
 * É idempotente: reescreve o que está entre os marcadores, sem duplicar.
 *
 * ---------------------------------------------------------------------------
 * A PARTE QUE NÃO É ÓBVIA: APAGAR DEPOIS DE COPIAR
 *
 * Copiar sozinho não centraliza nada. O bloco entra ANTES do <style> da página,
 * então se a página continuasse declarando `--canvas` no `:root` dela, seria o
 * dela que valeria — e mexer no arquivo canônico não mudaria um pixel. Por isso
 * o segundo passo: para cada token do núcleo, apagar a declaração da página
 * *desde que o valor seja idêntico ao canônico*.
 *
 * O "desde que" é a trava de segurança. Página com valor diferente NÃO é
 * tocada: ela fica como está, o token dela continua vencendo (vem depois), e o
 * script AVISA no fim. Assim uma divergência de propósito sobrevive, e uma
 * divergência por descuido aparece na tela em vez de sumir calada.
 * ---------------------------------------------------------------------------
 */
const fs = require('fs');

const INI = 'B4U-DESIGN:INICIO';
const FIM = 'B4U-DESIGN:FIM';
const FONTE = 'b4u-design.css';
const CHECAR = process.argv.includes('--check');

/* As 23 (o juridico.html entrou em 24/08/2026). Diferente do `_aplica-texto.js`, que pula as quatro páginas sem
   `b4u-shell.js` (analise-tributaria, calculadora, onboarding, simulador):
   aquelas quatro não têm menu lateral, mas têm fundo bege e cartão branco como
   todas as outras. Paleta é para as 23. */
const ARQUIVOS = [
  'analise-tributaria.html', 'calculadora-equiparacao.html', 'certificados.html',
  'clientes-ativos.html', 'colaborador.html', 'comercial.html', 'contabil.html',
  'contatos-equipe.html', 'daily.html', 'dptopessoal.html', 'equiparacao.html',
  'fiscal.html', 'guias.html', 'index.html', 'juridico.html', 'licencas.html',
  'meustickets.html',
  'onboarding.html', 'registro.html', 'restituicao.html',
  'simulador-equiparacao.html', 'societario-equipe.html', 'societario.html'
];

/* ── Ler o arquivo canônico ─────────────────────────────────────────────────
   O corpo que viaja é do primeiro `:root{` até a `}` que o fecha. O cabeçalho
   longo lá de cima fala do ARQUIVO (por que ele existe, por que só 21 tokens),
   não do CSS — e não faz sentido repetir quarenta linhas de prosa vinte e duas
   vezes. Os comentários de dentro do `:root`, esses vêm junto: eles explicam
   POR QUE aquele hex e não outro, e é dentro da página que alguém vai ler. */
function corpoCanonico() {
  const txt = fs.readFileSync(FONTE, 'utf8');
  const i = txt.indexOf(':root{');
  if (i < 0) throw new Error('não achei `:root{` em ' + FONTE);
  const j = txt.indexOf('\n}', i);
  if (j < 0) throw new Error('não achei o fecha-chaves do `:root` em ' + FONTE);
  return txt.slice(i, j + 2);
}

/** {'--canvas':'#F1E7DC', ...} — o que o núcleo define, para saber o que apagar. */
function tokensCanonicos(corpo) {
  const m = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let x;
  while ((x = re.exec(corpo))) m[x[1]] = x[2].trim().replace(/\s+/g, ' ');
  return m;
}

const CABECA = `/* ${INI} — paleta, cantos e fonte que as 22 páginas dividem.
   Bloco copiado de ${FONTE} (fonte canônica, com a explicação completa).
   Não edite aqui: edite lá e rode \`node _aplica-design.js\`.

   Entra ANTES do <style> da página de propósito — é a camada base. Se esta
   página precisar mesmo de um valor diferente, redeclare o token no \`:root\`
   dela, que vem depois e vence. */`;

function bloco(corpo) {
  return '<style>\n' + CABECA + '\n' + corpo + '\n/* ' + FIM + ' */\n</style>\n';
}

/* ── Apagar do `:root` da página o que virou cópia ──────────────────────────
   Mexe SÓ dentro de blocos `:root{...}`, nunca no CSS solto: `--radius` também
   aparece do lado direito de dezenas de regras (`border-radius:var(--radius)`)
   e essas não podem ser tocadas.

   Aqui NÃO dá para trabalhar com expressão regular no corpo inteiro, e a razão
   é uma cicatriz: a primeira versão apagava "comentário órfão" com um regex de
   busca preguiçosa e lookahead. Como `[\s\S]*?` faz backtracking, quando o
   lookahead falhava no primeiro `*​/` ele ESTICAVA até o `*​/` seguinte — e
   levava junto tudo que estivesse no meio. Foi assim que `--fs-1` a `--fs-6`
   sumiram de nove arquivos entre dois comentários vizinhos, calados. Regex não
   sabe onde um comentário acaba; um scanner sabe.

   Então o corpo é FATIADO em itens (comentário | declaração | espaço) por uma
   varredura caractere a caractere, os itens são filtrados, e o resultado é
   remontado. Um comentário só cai quando, dele até o próximo comentário ou até
   o fim, não sobrou nenhuma declaração — ou seja, quando ele passou mesmo a
   explicar o vazio. */
function fatiar(corpo) {
  const itens = [];
  let i = 0;
  while (i < corpo.length) {
    if (corpo[i] === '/' && corpo[i + 1] === '*') {
      const f = corpo.indexOf('*/', i + 2);
      const fim = f < 0 ? corpo.length : f + 2;
      itens.push({ t: 'com', s: corpo.slice(i, fim) });
      i = fim;
    } else if (/\s/.test(corpo[i])) {
      let j = i; while (j < corpo.length && /\s/.test(corpo[j])) j++;
      itens.push({ t: 'esp', s: corpo.slice(i, j) });
      i = j;
    } else {
      /* Uma declaração vai até o `;` — respeitando parênteses, porque
         `--lift:0 8px 20px rgba(17,61,57,.10);` tem vírgula e ponto dentro. */
      let j = i, par = 0;
      while (j < corpo.length) {
        const c = corpo[j];
        if (c === '(') par++;
        else if (c === ')') par--;
        else if (c === ';' && par === 0) { j++; break; }
        else if (c === '/' && corpo[j + 1] === '*' && par === 0) break;
        j++;
      }
      itens.push({ t: 'dec', s: corpo.slice(i, j) });
      i = j;
    }
  }
  return itens;
}

function limparRoot(html, canon, avisos, arq) {
  return html.replace(/(:root\s*\{)([\s\S]*?)(\})/g, function (tudo, ab, corpo, fe) {
    let itens = fatiar(corpo);

    /* 1. Fora as declarações que o núcleo passou a fazer — e só essas. */
    itens = itens.filter(function (it) {
      if (it.t !== 'dec') return true;
      const m = it.s.match(/^\s*(--[a-z0-9-]+)\s*:\s*([\s\S]*?);?\s*$/i);
      if (!m || !(m[1] in canon)) return true;
      const v = m[2].trim().replace(/\s+/g, ' ');
      if (v !== canon[m[1]]) {
        /* Valor diferente do canônico: NÃO apaga. A página continua mandando
           (ela vem depois do bloco copiado) e o aviso sai no fim. */
        avisos.push(arq + ': ' + m[1] + ' = ' + v + '  (canônico: ' + canon[m[1]] +
                    ') — mantido como exceção desta página');
        return true;
      }
      return false;
    });

    /* 2. Fora os comentários que ficaram explicando o vazio. */
    itens = itens.filter(function (it, k) {
      if (it.t !== 'com') return true;
      for (let n = k + 1; n < itens.length; n++) {
        if (itens[n].t === 'dec') return true;    // ainda explica alguma coisa
        if (itens[n].t === 'com') break;          // o próximo comentário assume
      }
      return false;
    });

    let novo = itens.map(it => it.s).join('');
    novo = novo.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n');
    if (!/\S/.test(novo)) return '';   // `:root{}` vazio é lixo: some inteiro
    return ab + '\n' + novo.replace(/^\s*\n/, '').replace(/\s*$/, '\n') + fe;
  });
}

/* Onde enfiar: imediatamente ANTES do primeiro <style> da página — que nas 22 é
   justamente o que abre com `:root{`. Não usamos o <script src="b4u-shell.js">
   como âncora (como faz o `_aplica-texto.js`) por dois motivos: quatro páginas
   não têm esse script, e nas outras dezoito ele vem DEPOIS do `:root` — o bloco
   cairia na frente do que devia servir de base. */
const ANCORA = /<style>\s*\r?\n\s*:root\s*\{/;

const RE_BLOCO = new RegExp('<style>\\s*\\n/\\* ' + INI + '[\\s\\S]*?' + FIM + ' \\*/\\s*\\n</style>\\n?');

const corpo = corpoCanonico();
const canon = tokensCanonicos(corpo);
console.log('núcleo canônico: ' + Object.keys(canon).length + ' tokens\n');

let mudados = 0, iguais = 0;
const pulados = [], avisos = [];

for (const arq of ARQUIVOS) {
  if (!fs.existsSync(arq)) { pulados.push(arq + ' (arquivo não existe)'); continue; }
  let html = fs.readFileSync(arq, 'utf8');
  const antes = html;

  /* 1. O bloco: reescreve entre os marcadores, ou insere na âncora. */
  if (RE_BLOCO.test(html)) {
    html = html.replace(RE_BLOCO, bloco(corpo));
  } else {
    if (!ANCORA.test(html)) { pulados.push(arq + ' (não achei o <style> que abre com :root)'); continue; }
    html = html.replace(ANCORA, m => bloco(corpo) + m);
  }

  /* 2. A limpeza: só nos `:root` que NÃO são o nosso (o nosso está entre os
        marcadores e acabou de ser escrito a partir do canônico). */
  const i = html.indexOf(FIM);
  const cabeca = html.slice(0, i);
  const resto = limparRoot(html.slice(i), canon, avisos, arq);
  html = cabeca + resto;

  if (html !== antes) {
    if (!CHECAR) fs.writeFileSync(arq, html, 'utf8');
    mudados++;
  } else iguais++;
}

console.log((CHECAR ? 'MUDARIAM: ' : 'bloco aplicado em ') + mudados + ' arquivo(s)'
          + (iguais ? '  ·  ' + iguais + ' já estava(m) em dia' : ''));
if (pulados.length) console.log('\nPULADOS:\n  ' + pulados.join('\n  '));
if (avisos.length) console.log('\nEXCEÇÕES MANTIDAS (a página vence; confira se é de propósito):\n  ' + avisos.join('\n  '));
