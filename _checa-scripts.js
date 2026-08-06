/**
 * _checa-scripts.js — node --check em cada bloco <script> inline dos HTMLs.
 *
 * O corte é feito como o NAVEGADOR faz: um bloco inline termina no primeiro
 * `</script>` do texto, venha ele de onde vier. Regex "esperta" que tenta
 * emparelhar abertura e fechamento erra justamente nos arquivos que importam —
 * os que montam HTML em string e escrevem `<\/script>` no meio.
 *
 *     node _checa-scripts.js
 */
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');
const os = require('os');

const arquivos = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync('.').filter(f => f.endsWith('.html')).sort();

let blocos = 0, erros = 0;

for (const arq of arquivos) {
  const html = fs.readFileSync(arq, 'utf8');
  let i = 0, n = 0;
  while (true) {
    const abre = html.indexOf('<script', i);
    if (abre < 0) break;
    const fimTag = html.indexOf('>', abre);
    if (fimTag < 0) break;
    const tag = html.slice(abre, fimTag + 1);
    const fecha = html.indexOf('</script', fimTag);          // como o navegador
    if (fecha < 0) break;
    const corpo = html.slice(fimTag + 1, fecha);
    i = fecha + 9;
    if (/\ssrc=/.test(tag) || !corpo.trim()) continue;        // externo ou vazio
    n++; blocos++;
    const linha = html.slice(0, fimTag).split('\n').length;
    const tmp = path.join(os.tmpdir(), 'chk_' + arq.replace(/\W/g, '_') + '_' + n + '.js');
    fs.writeFileSync(tmp, corpo, 'utf8');
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      erros++;
      console.log('ERRO  ' + arq + '  bloco ' + n + ' (linha ' + linha + ')');
      console.log('   ' + String(e.stderr || e.message).split('\n').slice(0, 6).join('\n   '));
    }
    fs.unlinkSync(tmp);
  }
}

/* BOM em UTF-8 quebra o primeiro seletor do CSS e, em alguns servidores, o
   charset inteiro — barato de checar junto. */
for (const arq of arquivos) {
  const b = fs.readFileSync(arq);
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) { erros++; console.log('ERRO  ' + arq + ' começa com BOM'); }
}

console.log((erros ? 'FALHOU: ' + erros + ' problema(s) em ' : 'OK: ') + blocos + ' bloco(s) inline verificados');
process.exit(erros ? 1 : 0);
