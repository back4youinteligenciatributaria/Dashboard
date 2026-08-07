# Patch do backend — o cadastro do cliente no painel da equipe

O painel da equipe passa a mostrar, na ficha do cliente, uma seção **Cadastro**
com o que hoje só existe em `registro.html`:

- **editáveis ali mesmo:** Resumo e # de funcionários;
- **só leitura:** Cidade, Natureza jurídica, Endereço, CNAEs, Número de sócios,
  Descrição dos sócios, Cadastro Municipal (número), ISS e Tem DPTO pessoal.

O front já está pronto e **não quebra sem este patch**: sem o campo `cadastro` na
resposta, a seção simplesmente não aparece. Ela nasce sozinha quando você
implantar.

## Onde isso entra, e por que não no payload da equipe

Vai no `cliente_extras` — a rota que o painel chama quando alguém **abre** um
cliente —, e não no payload da rota `equipe`.

O payload da `equipe` traz TODOS os clientes de uma vez e vive no cache
compartilhado. Endereço, CNAEs e Descrição dos sócios são textos longos: somados
a cada cliente da carteira, engordam um pacote que é servido a dez colaboradores
para mostrar uma lista onde nada disso aparece. No `cliente_extras` é um cliente
só, buscado no instante em que a ficha dele abre.

---

## 1. A função

**Arquivo:** `4_PainelEquipe.gs` · cole junto das outras `_extra…_`

```javascript
/**
 * Cadastro do cliente (aba "Registro"), para a ficha do painel da equipe.
 *
 * Devolve `valores` e `colunas`. As DUAS coisas, e isso não é redundância: o
 * front grava de volta em Resumo e # de funcionários pela rota
 * `acao=registro_salvar`, que casa a coluna pelo NOME EXATO do cabeçalho. Se o
 * front chutasse "Resumo" e a planilha tivesse "Resumo do cliente", a gravação
 * voltaria em `ignoradas` sem gravar nada — e sem erro visível. Mandando o nome
 * real junto do valor, quem renomeia a coluna na planilha não quebra nada.
 */
function _extraCadastro_(id) {
  var aba;
  try { aba = _registroAba_(); } catch (e) { return null; }
  var v = aba.getDataRange().getValues();
  if (v.length < 2) return null;

  var head = v[0].map(function (h) { return String(h == null ? '' : h).trim(); });
  var iId = _colRegistro_(head, ['id']);
  if (iId < 0) return null;

  var row = -1;
  for (var r = 1; r < v.length; r++) {
    if (normalizarId(v[r][iId]) === normalizarId(id)) { row = r; break; }
  }
  if (row < 0) return null;

  /* Os apelidos existem porque a planilha muda sozinha. O primeiro da lista é o
     nome de hoje; os outros são grafias que já apareceram ou que aparecem. */
  var CAMPOS = {
    resumo:           ['Resumo'],
    funcionarios:     ['# de funcionários', '# de funcionarios', 'Número de funcionários', 'Numero de funcionarios'],
    cidade:           ['Cidade'],
    natureza_juridica:['Natureza Jurídica', 'Natureza juridica'],
    endereco:         ['Endereço', 'Endereco'],
    cnaes:            ['CNAEs', 'CNAE', 'CNAEs secundários'],
    n_socios:         ['Número de sócios', 'Numero de socios'],
    desc_socios:      ['Descrição sócios', 'Descricao socios', 'Descrição dos sócios'],
    cad_municipal:    ['Cadastro Municipal (número)', 'Cadastro Municipal (numero)', 'Cadastro Municipal'],
    iss:              ['ISS'],
    dpto_pessoal:     ['Tem DPTO pessoal', 'Tem Departamento Pessoal', 'Tem DP']
  };

  var valores = {}, colunas = {};
  Object.keys(CAMPOS).forEach(function (k) {
    var c = _colRegistro_(head, CAMPOS[k]);
    if (c < 0) return;                       // coluna não existe: o campo nem aparece na tela
    valores[k] = _regTxt_(v[row][c]);
    colunas[k] = head[c];
  });

  return { valores: valores, colunas: colunas };
}

/**
 * Acha a coluna pelo nome NORMALIZADO e INTEIRO (sem acento, sem caixa).
 *
 * Não usa o `idxCol` de propósito. Ele tem um segundo passe que casa por
 * "contém", e aqui isso é uma armadilha: procurar "ISS" acharia "Comissão"
 * (com-ISS-ão) e o painel passaria a mostrar o valor de outra coluna como se
 * fosse o ISS do cliente — errado e silencioso, que é a pior combinação.
 */
function _colRegistro_(head, nomes) {
  for (var k = 0; k < nomes.length; k++) {
    var alvo = _regNorm_(nomes[k]);
    for (var i = 0; i < head.length; i++) if (_regNorm_(head[i]) === alvo) return i;
  }
  return -1;
}
```

## 2. Pendurar no `cliente_extras`

**Arquivo:** `4_PainelEquipe.gs` · **função:** `montarClienteExtras_`

```javascript
  return {
    id: id,
    contatos:    _extraContatos_(id),
    licencas:    _extraLicencas_(id, cnpj),
```

vira

```javascript
  return {
    id: id,
    cadastro:    _extraCadastro_(id),
    contatos:    _extraContatos_(id),
    licencas:    _extraLicencas_(id, cnpj),
```

---

## Sobre a gravação

O front usa a rota que já existe: `acao=registro_salvar`, a mesma do
`registro.html`. Ela é guardada por `exigirAreaEquipe_(params, AREAS_OPERACAO)`,
que a chave do dia do colaborador já satisfaz — quem enxerga a ficha do cliente
no painel da equipe é exatamente quem pode editar o cadastro dele. **Nenhuma
permissão nova foi aberta.**

O histórico continua sendo escrito pelo `registroSalvar_`: uma alteração feita
pela ficha do painel aparece no log igual a uma feita pelo `registro.html`, com
o nome e o e-mail de quem mexeu.

## Depois de implantar

Abra `colaborador.html`, busque um cliente e confira, na seção **Cadastro**:

1. os campos de leitura trazem o que está na planilha;
2. digitar no Resumo mostra "Salvando…" e depois "Salvo ✓";
3. o valor está na aba Registro, na linha daquele cliente;
4. recarregar a página traz o texto novo.

Se um campo não aparecer, é porque a coluna não existe na aba Registro com
nenhum dos nomes da lista `CAMPOS` — acrescente o nome real como apelido.
