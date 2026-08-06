/* ══════════════════ identificador é TEXTO, nunca número ══════════════════
 *
 * FONTE CANÔNICA. Este arquivo NÃO é carregado por ninguém: ele é o original de
 * um bloco que vive copiado dentro de cada HTML do painel. A cópia é de
 * propósito. O menu lateral pode faltar que a página só perde o menu — está
 * escrito assim, com `window.B4UShell &&` em toda chamada. Formatar CNPJ não é
 * desse tipo: se o arquivo não carregasse, a lista inteira apareceria em branco.
 * O que não pode falhar não mora em <script src>.
 *
 * Mexeu aqui? Rode `node _aplica-texto.js` para reescrever as cópias.
 *
 * ── O PROBLEMA ────────────────────────────────────────────────────────────
 * A planilha guarda CNPJ, CPF, CEP, PIS, telefone e inscrição em células que o
 * Sheets converte para número no instante em que o conteúdo é só dígito. O
 * 00.623.904/0001-73 vira o número 623904000173 e chega assim no painel: dois
 * zeros a menos. Ninguém estranha, porque número truncado continua parecendo
 * número — o cadastro fica errado calado, e só aparece quando alguém copia o
 * CNPJ para a Receita e o site diz que não existe.
 *
 * Este bloco é a fronteira. Todo identificador passa por aqui antes de aparecer
 * na tela e antes de voltar para a planilha.
 *
 * ── O QUE ELE NÃO FAZ ─────────────────────────────────────────────────────
 * Inventar o zero que sumiu. Completar 12 dígitos até 14 acerta quase sempre e
 * erra CALADO no resto: quando o cadastro tem um dígito a menos por erro de
 * digitação, o painel passaria a exibir um CNPJ que não existe, com cara de
 * certo — e o erro ficaria escondido para sempre, porque a tela mostraria 14
 * dígitos bonitos. Decisão do dono: mostra o número como veio e sinaliza que
 * falta dígito, para alguém corrigir na origem.
 *
 * ── ONDE ESTÁ A CORREÇÃO DE VERDADE ───────────────────────────────────────
 * Na planilha: selecionar a coluna e Formatar > Número > Texto simples. E no
 * backend: essas colunas precisam ser lidas com getDisplayValues() em vez de
 * getValues(), senão o zero morre antes de sair do Apps Script. Ver o patch em
 * _PATCH-BACKEND.md. Enquanto isso não é feito, o que este bloco garante é que
 * o painel nunca PIORA o dado e nunca esconde que ele está quebrado.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* String de verdade, sem notação científica.
   `String()` só recorre a expoente a partir de 1e21 — abaixo disso ela já
   devolve o número por extenso, e é o que esta função faz na esmagadora maioria
   das vezes. Acima, "6.2e+21" não é só feio: `soDigitos()` extrai "62" mais o
   expoente e a busca passa a achar cliente errado. Aí o BigInt reescreve por
   extenso.

   O caminho `toLocaleString('fullwide', …)`, que é a receita que se acha por aí,
   está ERRADO aqui: 'fullwide' não é locale nenhum, o motor cai no locale do
   navegador e, num pt-BR, 1234.5 volta como "1234,5". Como esta função também
   atende o `esc()` da página inteira, isso trocaria a vírgula decimal em todo
   valor em dinheiro da tela. */
function b4uTexto(v){
  if(v==null)return '';
  if(typeof v==='number'){
    if(!isFinite(v))return '';
    const s=String(v);
    if(!/e/i.test(s))return s;
    if(Number.isInteger(v)){try{return BigInt(v).toString();}catch(_){}}
    return s;
  }
  if(v instanceof Date){
    /* Data em coluna de identificador é a planilha tendo interpretado errado.
       Devolve ISO em vez de "Tue Aug 04 2026 ...", que ninguém consegue ler. */
    const p=n=>String(n).padStart(2,'0');
    return v.getFullYear()+'-'+p(v.getMonth()+1)+'-'+p(v.getDate());
  }
  return String(v);
}

function b4uDigitos(v){return b4uTexto(v).replace(/\D/g,'');}

function b4uEsc(s){
  return b4uTexto(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Normalização de nome de coluna: sem acento, sem caixa, sem pontuação. Os nomes
   reais vêm do backend em tempo de execução e mudam sozinhos quando alguém
   renomeia a coluna na planilha — comparar string crua quebraria no primeiro
   "CNPJ/CPF" que virasse "CNPJ ou CPF". */
function b4uNorm(s){
  return b4uTexto(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

/* Que tipo de identificador é esta coluna, e quantos dígitos ele deveria ter.
   `tam` null = comprimento variável (telefone, inscrição): dá para garantir que
   é texto, não dá para dizer que está faltando dígito. */
const B4U_IDENT=[
  {re:/\bcnpj\b.*\bcpf\b|\bcpf\b.*\bcnpj\b/, tipo:'doc',   tam:[11,14], rot:'CNPJ ou CPF'},
  {re:/\bcnpj\b/,                            tipo:'cnpj',  tam:[14],    rot:'CNPJ'},
  {re:/\bcpf\b/,                             tipo:'cpf',   tam:[11],    rot:'CPF'},
  {re:/\bcep\b/,                             tipo:'cep',   tam:[8],     rot:'CEP'},
  {re:/\bpis\b|\bnit\b|\bpasep\b/,           tipo:'pis',   tam:[11],    rot:'PIS/NIT'},
  {re:/\bmatricula\b/,                       tipo:'gen',   tam:null,    rot:'matrícula'},
  {re:/\binscricao\b|\bcadastro municipal\b|\bregistro na junta\b/, tipo:'gen', tam:null, rot:'inscrição'},
  {re:/\btelefone\b|\bcelular\b|\bwhatsapp\b|\bfone\b/, tipo:'tel', tam:null, rot:'telefone'},
  {re:/\bagencia\b|\bconta\b/,               tipo:'gen',   tam:null,    rot:'conta'}
];
function b4uIdent(coluna){
  const n=b4uNorm(coluna);
  for(const d of B4U_IDENT)if(d.re.test(n))return d;
  return null;
}
function b4uEhIdentificador(coluna){return !!b4uIdent(coluna);}

/* O diagnóstico de um valor: veio inteiro, veio truncado, ou não dá para dizer.
   `truncado` só é true quando o valor é SÓ DÍGITO e mais curto do que o tipo
   pede — que é exatamente a assinatura de zero comido pela planilha. Valor com
   pontuação ("00.623.904/0001-73") chegou como texto e está a salvo; valor de
   comprimento livre nunca é acusado. */
function b4uEstado(valor,coluna){
  const s=b4uTexto(valor).trim();
  const d=b4uDigitos(s);
  const tipo=b4uIdent(coluna);
  const tam=tipo&&tipo.tam;
  if(!s||!tam)return {vazio:!s,truncado:false,digitos:d,tipo:tipo,completo:!!s};
  const completo=tam.indexOf(d.length)>=0;
  /* Só acusa quando é dígito puro: pontuado veio como texto e está íntegro. */
  const soDigito=/^\d+$/.test(s);
  const esperado=tam[tam.length-1];
  return {
    vazio:false,
    completo:completo,
    truncado:!completo&&soDigito&&d.length>0&&d.length<esperado,
    digitos:d,
    tipo:tipo,
    esperado:tam
  };
}

/* Máscara só quando o número está inteiro. Documento curto vai como veio: pôr
   máscara em 12 dígitos produziria "62.390.400/017" — um CNPJ que não existe,
   com aparência de CNPJ que existe. */
function b4uFmtDoc(v){
  const d=b4uDigitos(v);
  if(d.length===14)return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');
  if(d.length===11)return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
  return b4uTexto(v);
}
function b4uFmtCep(v){
  const d=b4uDigitos(v);
  return d.length===8?d.replace(/(\d{5})(\d{3})/,'$1-$2'):b4uTexto(v);
}
function b4uFmt(valor,coluna){
  const t=b4uIdent(coluna);
  if(!t)return b4uTexto(valor);
  if(t.tipo==='cep')return b4uFmtCep(valor);
  if(t.tipo==='doc'||t.tipo==='cnpj'||t.tipo==='cpf')return b4uFmtDoc(valor);
  return b4uTexto(valor);
}

/* A frase que explica o estrago, no title do valor marcado. Ela precisa dizer
   três coisas em uma linha: quantos dígitos vieram, quantos deveriam vir, e que
   o conserto é na planilha — senão a marca vira enfeite e ninguém age. */
function b4uAviso(e){
  const rot=(e.tipo&&e.tipo.rot)||'identificador';
  const alvo=e.esperado.join(' ou ');
  const faltam=e.esperado[e.esperado.length-1]-e.digitos.length;
  return rot+' chegou com '+e.digitos.length+' dígito'+(e.digitos.length>1?'s':'')+
    ', e deveria ter '+alvo+': a planilha guardou a célula como número e comeu '+
    faltam+' zero'+(faltam>1?'s':'')+' à esquerda. Para consertar, formate a coluna '+
    'como Texto na planilha e digite o número inteiro de novo.';
}

/* O valor pronto para a tela: já mascarado, e marcado quando está truncado.
   `vazio` é o que aparece no lugar do branco ("sem CNPJ") — a lista diz o que
   falta em vez de deixar buraco. */
function b4uIdentHTML(valor,coluna,vazio){
  const e=b4uEstado(valor,coluna);
  if(e.vazio)return vazio?'<span class="c-falta">'+b4uEsc(vazio)+'</span>':'';
  const txt=b4uEsc(b4uFmt(valor,coluna));
  if(!e.truncado)return txt;
  return '<span class="b4u-trunc" title="'+b4uEsc(b4uAviso(e))+'">'+txt+
         '<span class="b4u-trunc-m" aria-hidden="true">⚠</span>'+
         '<span class="b4u-sr"> (faltam dígitos)</span></span>';
}

/* Volta para a planilha em forma que o Sheets NÃO consegue reinterpretar como
   número. Enquanto a coluna não estiver formatada como Texto, gravar
   "00623904000173" faz a planilha comer os zeros de novo — desta vez com o
   usuário assistindo, logo depois de ele ter digitado certo. Com a máscara, a
   célula tem ponto e barra, o Sheets desiste e guarda texto.
   Onde não existe máscara canônica (telefone, inscrição), o valor vai como foi
   digitado: o conserto ali depende do patch do backend. */
function b4uParaPlanilha(valor,coluna){
  const s=b4uTexto(valor).trim();
  const t=b4uIdent(coluna);
  if(!s||!t||!/^\d+$/.test(s))return s;
  const d=b4uDigitos(s);
  if((t.tipo==='doc'||t.tipo==='cnpj')&&d.length===14)return b4uFmtDoc(d);
  if((t.tipo==='doc'||t.tipo==='cpf')&&d.length===11)return b4uFmtDoc(d);
  if(t.tipo==='cep'&&d.length===8)return b4uFmtCep(d);
  return s;
}
