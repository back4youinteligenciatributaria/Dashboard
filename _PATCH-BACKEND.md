# Patch do backend — o zero à esquerda morre antes de sair do Apps Script

Os HTMLs já estão consertados: eles nunca mais pioram um identificador, mostram
o número como veio quando falta dígito, marcam com ⚠ e devolvem CNPJ/CPF/CEP
mascarados para a planilha não reconverter. **Isso não conserta a origem.**

A origem é esta: a planilha guarda como **número** toda célula cujo conteúdo é só
dígito. `00623904000173` vira `623904000173` no instante em que alguém aperta
Enter — e o `getValues()` do Apps Script devolve o número, não o que foi digitado.
Quando o painel recebe, os dois zeros já não existem em lugar nenhum.

São três consertos, e eles são independentes: dá para fazer um hoje e os outros
depois. O **1** para o sangramento, o **2** melhora a leitura, o **3** recupera o
que já se perdeu.

---

## 1. Escrita: a coluna vira Texto antes de receber o valor

**Arquivo:** `1_Base.gs` · **função:** `gravarMudancas_`

É o gargalo único de escrita das grades — o mesmo lugar onde já mora o
`_textoNaoVireFormula_`, que resolve exatamente esta classe de problema (valor
que o Sheets reinterpreta sozinho). O identificador é o caso irmão: em vez de
virar fórmula, vira número.

Cole estas duas funções **logo acima** de `gravarMudancas_`:

```javascript
/**
 * Colunas cujo conteúdo é IDENTIFICADOR, não quantidade: ninguém soma um CNPJ.
 * A lista é a mesma do bloco B4U-TEXTO dos HTMLs (fonte: painel-out/_b4u-texto.js).
 * Mexeu aqui? Mexa lá também, senão as duas pontas passam a discordar.
 */
function _identNorm_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
var _IDENT_RE_ = [
  /\bcnpj\b/, /\bcpf\b/, /\bcep\b/, /\bpis\b/, /\bnit\b/, /\bpasep\b/,
  /\bmatricula\b/, /\binscricao\b/, /\bcadastro municipal\b/, /\bregistro na junta\b/,
  /\btelefone\b/, /\bcelular\b/, /\bwhatsapp\b/, /\bfone\b/, /\bagencia\b/
];
function _ehIdentificador_(coluna) {
  var n = _identNorm_(coluna);
  for (var i = 0; i < _IDENT_RE_.length; i++) if (_IDENT_RE_[i].test(n)) return true;
  return false;
}

/**
 * Marca as colunas de identificador desta linha como Texto ANTES de gravar.
 * Sem isto, `setValues` com "00623904000173" devolve o número 623904000173 para
 * a célula — e o zero morre na frente de quem acabou de digitar certo.
 *
 * O formato é aplicado só nas colunas que estão sendo gravadas, e só quando
 * ainda não são texto: `setNumberFormat` é barato, mas não é de graça, e o
 * salvamento automático desta grade dispara a cada 700 ms de digitação.
 */
function _forcarTextoIdent_(aba, row, alvo, head) {
  for (var i = 0; i < alvo.length; i++) {
    var c = alvo[i];
    if (!_ehIdentificador_(head[c])) continue;
    var cel = aba.getRange(row, c + 1);
    if (cel.getNumberFormat() !== '@') cel.setNumberFormat('@');
  }
}
```

E dentro de `gravarMudancas_`, **entre o laço que monta `alvo` e o `while` que
grava os trechos**, acrescente uma linha:

```javascript
  var i = 0;
  while (i < alvo.length) {
```

vira

```javascript
  /* Identificador é texto: o formato da célula muda ANTES do setValues, senão a
     planilha reinterpreta o valor e come o zero à esquerda de novo. */
  if (alvo.length) {
    try {
      var _head = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
      _forcarTextoIdent_(aba, row, alvo, _head);
    } catch (eFmt) { /* formato é melhoria, não pré-requisito: gravar continua */ }
  }

  var i = 0;
  while (i < alvo.length) {
```

O `try` em volta é de propósito: se o `setNumberFormat` falhar (planilha
protegida, cota), a gravação continua exatamente como hoje. Formato é melhoria,
não pré-requisito — e um salvamento que morre por causa de formatação seria pior
que o problema que ele resolve.

---

## 2. Leitura: `getDisplayValues()` nas grades

**Arquivo:** `4_PainelEquipe.gs` · **funções:** `montarRegistroEquipe_`,
`montarEquipe_`, `montarAtivosEquipe_`, `montarContatosEquipe_`,
`montarSocietarioEquipe_` (e as irmãs de licenças/certificados no mesmo arquivo)

`getValues()` devolve o **valor** da célula; `getDisplayValues()` devolve o que
está **escrito na tela**. Para uma célula já formatada como Texto os dois são
iguais — mas para uma célula numérica com formato personalizado (o jeito antigo
de segurar zero à esquerda: formato `00000000000000`) só o segundo traz o zero.
E acima de 1e21 o `getValues()` entrega notação científica, que vira lixo na
busca por dígitos.

Em `montarRegistroEquipe_`, onde hoje está:

```javascript
  var v = aba.getDataRange().getValues();
```

fica:

```javascript
  var faixa = aba.getDataRange();
  var v  = faixa.getValues();
  var vd = faixa.getDisplayValues();   // o que está escrito na tela, com zero e tudo
```

e, no laço que monta `valores`, a coluna de identificador passa a preferir o que
está na tela:

```javascript
    for (var k = 0; k < cols.length; k++) {
      var _col = cols[k], _i = idxs[k];
      /* Identificador vem do que está ESCRITO na célula. O valor numérico já
         perdeu o zero; o texto exibido pode tê-lo, se a célula tiver formato. */
      valores[_col] = _ehIdentificador_(_col)
        ? String(vd[r][_i] == null ? '' : vd[r][_i]).trim()
        : _regTxt_(v[r][_i]);
    }
```

`_ehIdentificador_` é a mesma do item 1 — funções em `1_Base.gs` enxergam o
projeto inteiro, não precisa duplicar.

> Uma leitura só continua sendo uma leitura: `getValues()` e `getDisplayValues()`
> saem da mesma faixa e custam praticamente o mesmo que a chamada de hoje.

---

## 3. Uma vez, na planilha: formatar como Texto e redigitar

Os itens 1 e 2 impedem novas perdas. **O que já se perdeu não volta sozinho** —
o dado não existe mais na planilha, e o painel se recusa a inventá-lo (completar
`623904000173` até 14 dígitos daria um CNPJ que não existe, com cara de certo).

Em cada aba que tem coluna de CNPJ/CPF, CEP, PIS, telefone, inscrição ou
cadastro municipal:

1. clique no cabeçalho da coluna para selecioná-la inteira;
2. **Formatar › Número › Texto simples**;
3. redigite os valores que o painel está marcando com ⚠.

O painel já diz quais são: eles aparecem sublinhados em âmbar com o ⚠ na lista, e
a ficha do cliente mostra a frase por extenso, com a contagem de dígitos que
falta. Abra `registro.html`, `licencas.html` e `certificados.html` e procure o ⚠ —
essa é a lista de trabalho.

Feito o passo 2, a coluna para de converter, e o item 1 garante que ela continue
assim mesmo se alguém colar dados por cima depois.

---

## Como conferir que funcionou

Depois de aplicar 1 e 2 e implantar (**Implantar › Gerenciar implantações ›
lápis › Versão: Nova**, para a URL não mudar):

1. Abra `registro.html`, entre num cliente e digite no CNPJ `00623904000173`
   (só dígitos, com os dois zeros).
2. Espere o "Salvo ✓".
3. Abra a planilha: a célula tem de estar **alinhada à esquerda** (sinal de
   texto) e mostrar `00.623.904/0001-73`.
4. Recarregue o painel: o CNPJ continua com os dois zeros e **sem** o ⚠.

Se a célula voltar alinhada à direita e sem os zeros, o item 1 não entrou — a
implantação provavelmente subiu como "Nova implantação" e o painel está falando
com a versão antiga.
