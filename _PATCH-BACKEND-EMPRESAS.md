# Patch do backend — `minhas_empresas`, para trocar de empresa a qualquer momento

A barra lateral passa a mostrar, no lugar do "Início", o **nome da empresa
aberta**. Quando o e-mail da pessoa está em mais de um cadastro, o nome ganha uma
seta e abre a lista para trocar de painel sem sair da tela.

Para isso a barra precisa saber **quais empresas essa pessoa tem** — e hoje essa
lista só existe por um instante, no login por e-mail: o `verificarLoginEmail`
monta `{multi:true, empresas:[…]}`, o `index.html` usa para desenhar a tela de
escolha e joga fora. Quem entra por link salvo ou por aparelho confiável nunca
passa por ali.

Este patch cria a rota que responde essa pergunta a qualquer momento, com o
`id` e o `codigo` que a página já tem na URL.

> **Por que não guardar a lista no aparelho?** Porque o `hash` de cada empresa
> *é* a senha dela. Guardar a lista no `localStorage` seria deixar a senha de
> todas as empresas da pessoa gravada no aparelho — inclusive num computador
> compartilhado, onde o painel hoje faz questão de limpar (`b4u_pl_`, `b4u_disp_`)
> justamente para o próximo não herdar nada do anterior. A rota busca na hora e
> nada fica para trás.

---

## 1. A rota

**Arquivo:** `2_Acesso.gs` · **função:** `consultar`

Junto das outras rotas sem sessão, logo abaixo do `entrar_token`:

```javascript
  if (tipo === 'entrar_token')         return entrarComToken(params);       // "confiar neste aparelho": token -> acesso do dia
  if (tipo === 'minhas_empresas')      return minhasEmpresas(params);       // barra lateral: trocar de empresa sem sair da tela
```

---

## 2. A função

**Arquivo:** `2_Acesso.gs` · cole ao lado de `verificarLoginEmail`, que é sua
irmã: as duas respondem "quais empresas são desta pessoa", uma no login e outra
com a pessoa já dentro.

```javascript
/**
 * Todas as empresas do e-mail de quem está com o painel aberto.
 *
 * QUEM PODE PERGUNTAR
 * Os dois fatores que o painel já exige para mostrar qualquer dado: o código da
 * EMPRESA (localizarLinhaGeral joga se não bater) e o código individual do
 * CONTATO (pessoaPorCodigo identifica a pessoa). Só depois disso o e-mail dela
 * vira a chave da busca — que é exatamente o critério do login por e-mail, onde
 * um código pessoal já abre todos os cadastros daquele e-mail. Nenhuma porta
 * nova: a mesma, alcançável de dentro.
 *
 * O QUE VOLTA
 * Para cada empresa, o `hash` de acesso pronto (#ID-SENHAEMPRESA-SENHACONTATO) e
 * as `areas` contratadas. As áreas viajam junto porque a barra precisa delas
 * ANTES de trocar: quem está no Fiscal e troca de empresa vai para o Fiscal da
 * outra — e, se a outra não tiver Fiscal, tem de cair no Início dela sabendo
 * disso, em vez de bater numa tela de erro.
 */
function minhasEmpresas(params) {
  params = params || {};
  var id = String(params.id || '').trim();
  var codigo = String(params.codigo || '').trim();

  localizarLinhaGeral(id, codigo);                 // código da empresa: joga se não bater
  var pessoa = pessoaPorCodigo(id, codigo);        // código individual: identifica a pessoa
  if (!pessoa) throw new Error('Acesso incompleto: informe também o seu código individual de contato.');

  var email = String(pessoa.email || '').trim();
  var lista = email ? acharContatosPorEmail_(email) : [];
  if (!lista.length) lista = [pessoa];             // sem e-mail na planilha: só a empresa atual

  /* Teto de segurança. Cada empresa custa uma leitura da aba Geral para as áreas,
     e a barra não tem como desenhar uma lista de trinta linhas de forma útil.
     Doze cobre com folga o caso real (duas, três) e impede que um e-mail
     cadastrado por engano em dezenas de clientes torne esta rota cara. */
  var TETO = 12;
  var cortou = lista.length > TETO;
  if (cortou) lista = lista.slice(0, TETO);

  var empresas = [];
  for (var i = 0; i < lista.length; i++) {
    var c = lista[i];
    var lg = localizarLinhaGeralPorId_(c.id);
    var hash = montarHashAcesso_(c);
    var areas = null;
    try {
      /* O codigo desta empresa é o hash sem o ID: SENHAEMPRESA-SENHACONTATO. */
      var codEmpresa = hash.slice(String(c.id).length + 1);
      areas = linksDisponiveis(c.id, codEmpresa).disponiveis || null;
    } catch (e) {
      /* Empresa cujo acesso está inconsistente não derruba a lista inteira: ela
         entra sem áreas, e a barra trata isso como "não sei" — troca levando
         para o Início dela, que existe sempre. */
      areas = null;
    }
    empresas.push({
      id: String(c.id),
      nome: (lg && lg.nome) ? lg.nome : (c.nome || ('Empresa ' + c.id)),
      hash: hash,
      areas: areas
    });
  }

  empresas.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); });
  return { ok: true, atual: String(id), empresas: empresas, cortou: cortou };
}
```

---

## 3. Depois de colar

**Implantar › Gerenciar implantações › lápis › Versão: Nova** — assim a URL não
muda e o `config.js` continua valendo.

Para conferir sem abrir o painel, chame a rota direto no navegador, trocando o
`ID` e o `CODIGO` pelos de um cliente de teste que tenha duas empresas:

```
<URL do app>/exec?tipo=minhas_empresas&id=250032&codigo=719081-992544
```

A resposta tem de trazer as duas empresas, cada uma com `hash` e `areas`.

---

## Enquanto o patch não estiver no ar

A barra **não quebra**. Ela pede a lista uma vez; se a rota não existir ainda, a
resposta vem com erro e ela simplesmente mostra o nome da empresa atual sem a
seta — que é exatamente o comportamento correto para quem tem uma empresa só.
Ninguém vê erro, e o seletor aparece sozinho no dia em que você implantar.
