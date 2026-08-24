/**
 * _aplica-texto.js — copia o bloco de `_b4u-texto.js` para dentro de cada HTML.
 *
 * O bloco é copiado, e não incluído por <script src>, porque formatar CNPJ não
 * pode depender de um arquivo chegar: se ele faltasse, a lista inteira sairia em
 * branco. O menu lateral pode faltar (e a página só perde o menu); isto não.
 *
 * Rodar depois de qualquer alteração em `_b4u-texto.js`:
 *     node _aplica-texto.js
 *
 * É idempotente: reescreve o que está entre os marcadores, sem duplicar.
 */
const fs = require('fs');

const INI = 'B4U-TEXTO:INICIO';
const FIM = 'B4U-TEXTO:FIM';

/* Cabeçalho curto da cópia. O texto longo — por que o zero some, por que não
   completamos, onde é o conserto de verdade — fica no arquivo canônico, para
   não repetir trinta linhas de prosa dezessete vezes. */
const CABECA = `/* ${INI} — identificador é TEXTO, nunca número.
   Bloco copiado de _b4u-texto.js (fonte canônica, com a explicação completa).
   Não edite aqui: edite lá e rode \`node _aplica-texto.js\`.

   Em uma frase: a planilha converte para número toda célula que só tem dígito,
   e 00.623.904/0001-73 chega no painel como 623904000173 — dois zeros a menos,
   calado. Estas funções são a fronteira: todo identificador passa por elas antes
   de ir para a tela e antes de voltar para a planilha. Elas NÃO completam o zero
   que sumiu (isso esconderia erro de cadastro): mostram o número como veio e
   sinalizam que falta dígito. O conserto definitivo é formatar a coluna como
   Texto na planilha e ler com getDisplayValues() no backend. */`;

const CSS = `<style>
/* Identificador que chegou da planilha com dígito faltando. O número aparece
   como veio — inventar o zero deixaria um CNPJ inexistente com cara de certo —
   e ganha um sublinhado pontilhado âmbar mais o ⚠. O title diz quantos dígitos
   vieram, quantos deveriam vir e onde consertar. Cor só de aviso: âmbar, não
   vermelho, porque o cadastro não está errado, está incompleto na origem. */
.b4u-trunc{text-decoration:underline dotted var(--amber,#E8892E);text-underline-offset:2px;cursor:help}
.b4u-trunc-m{color:var(--amber-txt,#8A5A10);font-size:.85em;margin-left:3px;vertical-align:1px}
/* Só para leitor de tela: o ⚠ é aria-hidden, e sem isto quem não vê a tela não
   ficaria sabendo que o número está incompleto. */
.b4u-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* O mesmo aviso por extenso, dentro da ficha. Na lista cabe um ⚠; aqui, com o
   campo à vista e espaço para uma linha, cabe dizer o que aconteceu e o que
   fazer — que é o único jeito de o dado ser corrigido na origem. */
.fld-aviso{display:block;margin-top:4px;font-size:var(--fs-1,11px);line-height:1.35;
  color:var(--amber-txt,#8A5A10);font-weight:600}
</style>`;

const ARQUIVOS = [
  'certificados.html', 'clientes-ativos.html', 'colaborador.html', 'comercial.html', 'daily.html',
  'contabil.html', 'contatos-equipe.html', 'dptopessoal.html', 'equiparacao.html',
  'fiscal.html', 'guias.html', 'index.html', 'juridico.html', 'licencas.html', 'meustickets.html',
  'registro.html', 'restituicao.html', 'societario-equipe.html', 'societario.html'
];

/* O corpo do bloco é tudo do arquivo canônico a partir da primeira função — o
   cabeçalho longo dele fala do arquivo, não do código, e não viaja junto. */
function corpoCanonico() {
  const txt = fs.readFileSync('_b4u-texto.js', 'utf8');
  const i = txt.indexOf('/* String de verdade');
  if (i < 0) throw new Error('não achei o início do corpo em _b4u-texto.js');
  return txt.slice(i).trim();
}

function bloco() {
  return CSS + '\n<script charset="utf-8">\n' + CABECA + '\n' + corpoCanonico() +
         '\n/* ' + FIM + ' */\n<\/script>';
}

/* Onde enfiar: logo depois do b4u-shell.js, que todas as páginas carregam e que
   fica no <head>, antes de qualquer script inline que vá usar estas funções. */
const ANCORA = /<script src="b4u-shell\.js"[^>]*><\/script>/;

let mudados = 0, pulados = [];
for (const arq of ARQUIVOS) {
  let html = fs.readFileSync(arq, 'utf8');
  const antes = html;
  const jaTem = html.indexOf(INI) >= 0;

  if (jaTem) {
    /* Reescreve entre os marcadores, incluindo o <style> que vem antes. */
    const re = new RegExp('<style>\\n/\\* Identificador que chegou[\\s\\S]*?' + FIM + ' \\*/\\n<\\/script>');
    if (!re.test(html)) { pulados.push(arq + ' (marcador presente mas bloco irreconhecível)'); continue; }
    html = html.replace(re, bloco());
  } else {
    if (!ANCORA.test(html)) { pulados.push(arq + ' (sem <script src="b4u-shell.js">)'); continue; }
    html = html.replace(ANCORA, m => m + '\n' + bloco());
  }

  if (html !== antes) { fs.writeFileSync(arq, html, 'utf8'); mudados++; }
}

console.log('bloco aplicado em ' + mudados + ' arquivo(s)');
if (pulados.length) console.log('PULADOS:\n  ' + pulados.join('\n  '));
