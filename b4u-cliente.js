/**
 * b4u-cliente.js — o painel "meus dados" do cliente, num lugar só.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * A barra do topo das oito páginas do cliente terminava num botão verde de WhatsApp e
 * em mais nada. Quem estava logado, em qual empresa, com que tipo de acesso — nada
 * disso aparecia em lugar nenhum depois da home; e a folha de contatos, que é o único
 * lugar onde o responsável dá ou tira acesso de um sócio, morava dentro do index.html
 * e só era alcançável por um botão da home. De dentro do Fiscal não havia caminho.
 *
 * Agora o botão da barra diz o NOME de quem está logado e abre esta folha: a empresa
 * aberta, quem é você nela, os contatos (para quem pode mexer neles), o WhatsApp e a
 * saída do aparelho. O WhatsApp não sumiu — mudou de lugar, e continua a um toque.
 *
 * COMO USAR
 *   <script src="b4u-cliente.js" charset="utf-8"></script>   (junto do b4u-shell.js)
 *
 *   B4UCliente.ligar({ botao, rotulo, id, codigo, wa, api, jsonp, pessoa, empresa });
 *   B4UCliente.atualizar({ pessoa:d.pessoa, empresa:cfg, sair:fn });   // quando souber mais
 *
 * ---------------------------------------------------------------------------------
 * QUATRO REGRAS QUE ESTE ARQUIVO SEGUE, E O MOTIVO DE CADA UMA
 *
 * 1. O PREFIXO É `b4uc-`, E ISSO NÃO É CAPRICHO.
 *    `.ct-*` já quer dizer três coisas diferentes no projeto: no index é o cartão de
 *    contato do cliente, no contatos-equipe é o cartão de contato DA EQUIPE (com outro
 *    contrato de validação) e em outras telas `.ct-err` é só uma linha de erro. `.ov` e
 *    `.sheet` são nomes de rua igualmente. Uma folha que roda em oito páginas não pode
 *    apostar em nome comum: tudo aqui nasce em `b4uc-`, num `<style id="b4uc-css">` que
 *    entra uma vez só.
 *
 * 2. O RÓTULO GENÉRICO VEM ANTES DO NOME, NUNCA O BRANCO.
 *    O nome de quem está logado chega no payload, que demora. Botão vazio pisca; a
 *    palavra "carregando…" pisca duas vezes (aparece e sai). Então o botão nasce
 *    escrito "Meus dados" — que é verdade em qualquer estado — e vira o primeiro nome
 *    quando ele chega. É a mesma decisão que o menu lateral já tinha tomado com o
 *    item "Início", que só vira o nome da empresa quando há nome de empresa.
 *
 * 3. QUEM NÃO É PRINCIPAL NÃO VÊ A LISTA DE CONTATOS.
 *    Contato é acesso: a lista diz quem entra no painel da empresa e em quais áreas.
 *    Com `papel` conhecido e diferente de Principal, a seção não é desenhada e a
 *    chamada nem sai. O servidor continua sendo a autoridade (`podeEditar`), mas o
 *    front não pede o que não pode mostrar.
 *
 * 4. O PRÓPRIO ACESSO É PROTEGIDO DE QUEM ESTÁ MEXENDO (`euMesmo`).
 *    No cartão do próprio e-mail: o campo vem `readonly`, a opção "Secundário" nem
 *    existe no seletor e não há botão de remover. Sem isso o responsável se rebaixava a
 *    Secundário — ou se apagava — e perdia a chave da própria empresa, sem ninguém para
 *    devolvê-la. Isso é proteção real, não enfeite; veio junto na mudança de casa.
 * ---------------------------------------------------------------------------------
 *
 * SE ESTE ARQUIVO NÃO CARREGAR
 * A barra volta a mostrar o botão verde do WhatsApp — o bloco compartilhado das oito
 * páginas só troca o botão quando `window.B4UCliente` existe. Nenhuma chamada quebra:
 * todas estão atrás de `window.B4UCliente &&`.
 */
(function (w, d) {
  'use strict';
  if (w.B4UCliente) return;

  /* Os mesmos rótulos que a home e a folha de contatos já usavam. `guias` entra porque
     o backend pode devolver a área no acesso de alguém, mesmo com a agenda segurada —
     e um chip escrito "guias" na tela do cliente não quer dizer nada para ele. */
  var AREAS_LABEL = {
    fiscal: 'Fiscal', contabil: 'Contábil', pessoal: 'Pessoal',
    societario: 'Societário', equiparacao: 'Equiparação',
    guias: 'Agenda de pagamentos', financeiro: 'Financeiro'
  };

  /* Ver regra 2 no topo: o que o botão diz enquanto o nome não chegou. */
  var ROTULO_GENERICO = 'Meus dados';

  var ORDINAL = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º'];

  /* ─────────────────────────────────────────────────────────────────────────
   * A folha
   * Os números não são novos: são os que a folha de contatos do index já tinha
   * (bottom sheet no celular, caixa centrada no desktop). O que mudou foi o
   * prefixo e o fallback de cada token — este arquivo roda em oito páginas e
   * não pode contar com nenhuma delas ter declarado a variável.
   * ───────────────────────────────────────────────────────────────────────── */
  var CSS = [
    /* ── O botão do nome, na barra do topo ──────────────────────────────────
       Ele veste `.b4u-btn ghost`, que o bloco compartilhado já desenha: 44px de
       altura mínima, rótulo escondido no celular, mesmo raio e mesma cor dos
       vizinhos. Daqui saem só as duas coisas que são DELE. */
    /* Nome comprido não pode empurrar a barra para a segunda linha: o rótulo
       corta com reticências e o nome inteiro continua no `title`. No celular a
       regra do bloco esconde o rótulo antes disto, e o botão fica só com o
       ícone — 44px nos dois eixos, que é o alvo do dedo. */
    '.b4u-bar .b4uc-eu .b4u-lbl{max-width:14ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    /* Quem empurrava os botões para a direita era o `margin-right:auto` do logo.
       Com o menu lateral montado o logo some (e os atalhos também), e a folha do
       b4u-shell.js devolvia o empurrão ao `.b4u-btn.wa` — que não está mais lá.
       O empurrão passa a ser deste botão, que é o que sobra visível na barra. */
    'body.b4s .b4u-bar .b4uc-eu{margin-left:auto}',

    /* ── A folha ────────────────────────────────────────────────────────────
       Bottom sheet no celular (sobe de baixo, encosta na borda), caixa centrada
       a partir de 640px. É um desenho diferente do modal de tela cheia do
       b4u-modal.js — e continua sendo de propósito: aqui não há formulário
       longo, há uma ficha curta que se lê de uma olhada. */
    '.b4uc-ov{position:fixed;inset:0;z-index:1000;background:rgba(7,48,52,.45);',
    'display:flex;align-items:flex-end;justify-content:center;',
    'font-family:var(--sans,"Montserrat",system-ui,-apple-system,sans-serif)}',
    '@media(min-width:640px){.b4uc-ov{align-items:center;padding:24px}}',
    '.b4uc-sheet{position:relative;z-index:1010;background:var(--surface,#fff);',
    'color:var(--ink,#113D39);width:100%;max-width:560px;max-height:92vh;overflow:auto;',
    'border-radius:var(--radius-lg,8px) var(--radius-lg,8px) 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.25)}',
    '@media(min-width:640px){.b4uc-sheet{border-radius:var(--radius-lg,8px)}}',
    '.b4uc-head{position:sticky;top:0;z-index:2;background:var(--surface,#fff);display:flex;',
    'align-items:center;justify-content:space-between;gap:10px;padding:12px 12px 12px 20px;',
    'border-bottom:1px solid var(--line,#E4D9C9)}',
    '.b4uc-head b{font-size:var(--fs-4,15px);font-weight:800}',
    /* 44px de alvo no ×: no celular ele fica no canto, que é onde o polegar erra. */
    '.b4uc-x{background:none;border:0;font-size:var(--fs-4,15px);line-height:1;cursor:pointer;',
    'color:var(--muted,#6E6256);width:44px;height:44px;flex:none;border-radius:var(--radius-sm,4px)}',
    '.b4uc-x:hover{background:var(--surface-warm,#FBF6EF)}',
    '.b4uc-body{padding:16px 20px 20px}',
    '.b4uc-note{font-size:var(--fs-2,12px);color:var(--muted,#6E6256);line-height:1.5;margin-bottom:14px}',

    /* ── Blocos de ficha ────────────────────────────────────────────────── */
    '.b4uc-bloco{border-top:1px solid var(--line,#E4D9C9);padding-top:14px;margin-top:14px}',
    '.b4uc-bloco:first-child{border-top:0;padding-top:0;margin-top:0}',
    '.b4uc-rot{font-size:var(--fs-1,11px);font-weight:700;text-transform:uppercase;',
    'letter-spacing:.06em;color:var(--muted,#6E6256);margin-bottom:7px}',
    '.b4uc-emp{font-size:var(--fs-4,15px);font-weight:800;line-height:1.35;overflow-wrap:anywhere}',
    '.b4uc-linha{display:flex;gap:10px;justify-content:space-between;align-items:baseline;',
    'font-size:var(--fs-3,13px);padding:4px 0;line-height:1.45}',
    '.b4uc-linha .k{color:var(--muted,#6E6256);flex:none}',
    '.b4uc-linha .v{font-weight:600;text-align:right;overflow-wrap:anywhere;min-width:0}',
    /* Selo do papel: teal cheio para Principal (é o acesso total, e a pessoa
       precisa saber que está com ele na mão), contorno para acesso por áreas. */
    '.b4uc-selo{display:inline-block;font-size:var(--fs-1,11px);font-weight:700;',
    'text-transform:uppercase;letter-spacing:.04em;padding:3px 9px;border-radius:var(--radius-pill,6px)}',
    '.b4uc-selo.p{background:var(--brand-teal-txt,#0C756F);color:#fff}',
    '.b4uc-selo.s{background:var(--surface-warm,#FBF6EF);color:var(--ink-2,#3F5854);',
    'border:1px solid var(--line,#E4D9C9)}',
    '.b4uc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.b4uc-chip{font-size:var(--fs-1,11px);font-weight:600;padding:2px 9px;',
    'border-radius:var(--radius-pill,6px);background:var(--receita-soft,#DBEFEC);',
    'color:var(--brand-dark,#073034)}',

    /* ── Ações do rodapé da ficha ───────────────────────────────────────── */
    '.b4uc-acoes{display:flex;flex-direction:column;gap:9px;margin-top:16px}',
    /* Verde-escuro sobre o verde do WhatsApp: branco ali dá 1,98:1 e some no sol.
       Mesmo par de cores do botão que saiu da barra — nada de tinta nova. */
    '.b4uc-wa{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;',
    'background:#25D366;color:#06302b;border-radius:var(--radius,6px);font-weight:700;',
    'font-size:var(--fs-3,13px);text-decoration:none;padding:11px 14px}',
    '.b4uc-wa:hover{background:#20bd5a}',
    '.b4uc-wa svg{width:17px;height:17px;flex:none}',
    '.b4uc-sair{min-height:44px;background:none;border:1px solid var(--line-2,#D6C3AC);',
    'border-radius:var(--radius,6px);color:var(--ink-2,#3F5854);font-family:inherit;',
    'font-size:var(--fs-3,13px);font-weight:700;cursor:pointer;padding:11px 14px}',
    '.b4uc-sair:hover{border-color:var(--brand-teal,#0F8C85)}',
    '.b4uc-sair[disabled]{opacity:.6;cursor:default}',

    /* ── Botões da folha ────────────────────────────────────────────────── */
    '.b4uc-bt{font-family:inherit;font-size:var(--fs-3,13px);font-weight:700;cursor:pointer;',
    'min-height:44px;padding:11px 18px;border-radius:var(--radius-pill,6px);',
    'border:1px solid var(--line-2,#D6C3AC);background:var(--surface,#fff);',
    'color:var(--ink,#113D39);text-decoration:none;display:inline-flex;align-items:center;',
    'justify-content:center;gap:6px}',
    '.b4uc-bt:hover{border-color:var(--brand-teal,#0F8C85)}',
    '.b4uc-bt.pri{background:var(--brand-teal-txt,#0C756F);color:#fff;border-color:transparent}',
    '.b4uc-bt.pri:hover{background:var(--brand-dark,#073034)}',
    '.b4uc-bt.perigo{background:#8B2E22;color:#fff;border-color:transparent}',
    '.b4uc-bt[disabled]{opacity:.6;cursor:default}',
    '.b4uc-foot{display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;',
    'background:var(--surface,#fff);padding:12px 0 0;margin-top:14px}',
    '.b4uc-foot .b4uc-bt{flex:1}',
    '@media(min-width:640px){.b4uc-foot .b4uc-bt{flex:0 0 auto}}',
    /* #9A6B10 dava 3,84:1 no bege. Pelo token do sistema: 4,85:1. */
    '.b4uc-warn{flex:1;font-size:var(--fs-2,12px);font-weight:700;color:var(--amber-txt,#8A5A10);',
    'display:flex;align-items:center;gap:6px}',
    '.b4uc-err{color:#8B2E22;font-size:var(--fs-2,12px);min-height:16px;line-height:1.45}',
    '.b4uc-ok{text-align:center;padding:22px 4px}',
    '.b4uc-ok h4{font-size:var(--fs-5,19px);font-weight:800;margin-bottom:6px}',
    '.b4uc-ok p{font-size:var(--fs-3,13px);color:var(--ink-2,#3F5854);margin-bottom:16px}',

    /* ── A lista de contatos (mudou de casa, não mudou de desenho) ───────── */
    '.b4uc-acc{border:1px solid var(--line,#E4D9C9);border-radius:var(--radius,6px);',
    'margin-bottom:10px;background:var(--surface,#fff);overflow:hidden}',
    '.b4uc-acc.open{border-color:var(--brand-teal,#0F8C85);box-shadow:0 2px 12px rgba(15,140,133,.09)}',
    '.b4uc-acc-head{display:flex;align-items:center;gap:9px;padding:13px 14px;cursor:pointer;',
    'user-select:none;width:100%;border:0;background:none;font-family:inherit;text-align:left;min-height:44px}',
    '.b4uc-acc-head:hover{background:var(--surface-warm,#FBF6EF)}',
    '.b4uc-acc-name{flex:1;min-width:0;font-size:var(--fs-3,13px);font-weight:700;',
    'color:var(--ink,#113D39);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.b4uc-chev{color:var(--muted,#6E6256);font-size:var(--fs-1,11px);transition:transform .18s}',
    '.b4uc-acc.open .b4uc-chev{transform:rotate(180deg)}',
    '.b4uc-acc-body{display:none;padding:2px 14px 14px}',
    '.b4uc-acc.open .b4uc-acc-body{display:block}',
    '.b4uc-papel{font-size:var(--fs-1,11px);font-weight:700;text-transform:uppercase;',
    'letter-spacing:.04em;padding:2px 8px;border-radius:var(--radius-pill,6px);white-space:nowrap}',
    '.b4uc-papel.p{background:var(--brand-teal-txt,#0C756F);color:#fff}',
    '.b4uc-papel.s{background:var(--surface-warm,#FBF6EF);color:var(--ink-2,#3F5854);',
    'border:1px solid var(--line,#E4D9C9)}',
    '.b4uc-lbl{display:block;font-size:var(--fs-2,12px);font-weight:700;',
    'color:var(--ink-2,#3F5854);margin:11px 0 4px}',
    '.b4uc-mail{font-size:var(--fs-2,12px);color:var(--ink-2,#3F5854);margin:6px 0 10px;word-break:break-all}',
    '.b4uc-areas{display:flex;flex-wrap:wrap;gap:6px}',
    '.b4uc-areas-wrap.oculto{display:none}',
    '.b4uc-area-chip{font-size:var(--fs-1,11px);font-weight:600;padding:2px 9px;',
    'border-radius:var(--radius-pill,6px);background:var(--surface-warm,#FBF6EF);',
    'color:var(--muted,#6E6256);border:1px solid var(--line,#E4D9C9)}',
    '.b4uc-area-chip.on{background:var(--receita-soft,#DBEFEC);color:var(--brand-dark,#073034);border-color:transparent}',
    /* 16px no campo: abaixo disso o Safari amplia a página sozinha ao focar. */
    '.b4uc-in{width:100%;font-family:inherit;font-size:16px;padding:9px 11px;',
    'border:1px solid var(--line-2,#D6C3AC);border-radius:var(--radius-sm,4px);',
    'background:var(--surface-warm,#FBF6EF);color:var(--ink,#113D39)}',
    '.b4uc-in:focus{outline:2px solid var(--brand-teal,#0F8C85);outline-offset:1px}',
    '.b4uc-in[disabled],.b4uc-in[readonly]{opacity:.7}',
    '.b4uc-area-chk{display:inline-flex;align-items:center;gap:5px;font-size:var(--fs-2,12px);',
    'font-weight:600;color:var(--ink-2,#3F5854);background:var(--surface-warm,#FBF6EF);',
    'border:1px solid var(--line,#E4D9C9);border-radius:var(--radius-pill,6px);',
    'padding:5px 10px;cursor:pointer}',
    '.b4uc-area-chk input{accent-color:var(--brand-teal,#0F8C85)}',
    '.b4uc-rm{margin-top:14px;background:none;border:0;color:#8B2E22;font-family:inherit;',
    'font-size:var(--fs-2,12px);font-weight:700;cursor:pointer;padding:2px 0}',
    /* Remoção em dois tempos: o primeiro clique só avisa, o segundo remove. */
    '.b4uc-rm.confirmar{background:#F7EEEC;border:1px solid #E4C9C4;',
    'border-radius:var(--radius-sm,4px);padding:7px 11px;margin-top:12px}',
    '.b4uc-rm-desfazer{margin-left:10px;background:none;border:0;padding:0;font-family:inherit;',
    'font-size:var(--fs-2,12px);font-weight:700;color:var(--ink-2,#3F5854);',
    'text-decoration:underline;cursor:pointer}',
    '.b4uc-rm:hover{text-decoration:underline}',
    '.b4uc-voce{font-size:var(--fs-1,11px);font-weight:700;text-transform:uppercase;',
    'letter-spacing:.04em;color:var(--brand-teal-txt,#0C756F);background:var(--surface-warm,#FBF6EF);',
    'border:1px solid var(--line,#E4D9C9);padding:3px 9px;border-radius:var(--radius-pill,6px);white-space:nowrap}',
    '.b4uc-selfnote{font-size:var(--fs-2,12px);color:var(--muted,#6E6256);margin-top:14px}',
    /* Branco sobre --verde dá 3,44:1; sobre --verde-2, 4,92:1. Mesma família. */
    '.b4uc-add{margin-top:10px;width:100%;background:var(--verde-2,#25804C);color:#fff;',
    'border-color:transparent;font-weight:800}',
    '.b4uc-add:hover{background:#178A4B}',
    /* Vem junto com `.b4u-skel` do bloco compartilhado, que põe o brilho passando.
       Se por acaso ele não estiver ali, esta regra sozinha ainda desenha a barra —
       cinza e parada, mas com a forma e a altura certas. */
    '.b4uc-carregando{display:block;height:44px;border-radius:var(--radius,6px);',
    'background:#EADFCE;margin-bottom:10px}',

    '@media(prefers-reduced-motion:reduce){.b4uc-chev{transition:none}}'
  ].join('');

  var IC_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
    + '<path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6'
    + '-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3'
    + '.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.1.1.3 0 .5l-.3.5-.4.4'
    + 'c-.1.1-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.6 1 1.9 1.2.3.1.5.1.6-.1.2-.2.7-.8.9-1 .2-.3'
    + '.4-.2.6-.1.2.1 1.5.7 1.7.9.3.1.4.2.5.3.1.2.1.7-.1 1.3Z"/></svg>';

  function estilo() {
    if (d.getElementById('b4uc-css')) return;
    var s = d.createElement('style');
    s.id = 'b4uc-css';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Identificador é TEXTO, nunca número — quem sabe disso é o bloco B4U-TEXTO, que
     está no <head> das oito páginas. Se por algum motivo ele não estiver lá, o CNPJ
     ainda aparece: escapado e cru, sem máscara e sem a marca de dígito faltando. */
  function identHTML(v, coluna) {
    if (typeof w.b4uIdentHTML === 'function') return w.b4uIdentHTML(v, coluna);
    return esc(v);
  }
  function texto(v) {
    if (typeof w.b4uTexto === 'function') return w.b4uTexto(v);
    return String(v == null ? '' : v);
  }

  function primeiroNome(n) {
    return String(n || '').trim().split(/\s+/)[0] || '';
  }
  function ehPrincipal(papel) {
    return /principal/i.test(String(papel || ''));
  }

  /* ═══════════════ estado ═══════════════
   * `D` é tudo o que o painel sabe; ele nasce do bloco compartilhado (com o que
   * estiver guardado no aparelho) e vai sendo completado por `atualizar()` à
   * medida que cada página recebe o próprio payload. */
  var D = {
    id: '', codigo: '', wa: '', api: '', jsonp: null,
    pessoa: null,     // { nome, email, papel, areas[] }
    empresa: null,    // { razao_social, cnpj }
    sair: null        // função da página; sem ela o item nem aparece
  };
  var BT = null;      // o botão da barra
  var LBL = null;     // o <span> do rótulo dentro dele
  var ov = null;      // o véu da folha aberta
  var focoVolta = null;
  var CT = null;      // estado da lista de contatos
  var MODO = 'auto';  // 'auto' = obedece o papel; 'sempre' = a página pediu a lista

  /* ═══════════════ o botão da barra ═══════════════ */

  function pintarBotao() {
    if (!BT) return;
    var nome = (D.pessoa && D.pessoa.nome) || '';
    var pn = primeiroNome(nome);
    if (LBL) LBL.textContent = pn || ROTULO_GENERICO;
    /* O title carrega o nome inteiro: o rótulo corta com reticências, e no celular
       ele nem aparece. Sem nome, o title explica o que o botão faz — "Meus dados"
       repetido duas vezes não ajudaria ninguém. */
    BT.setAttribute('title', nome || 'Meus dados, contatos e acessos');
    BT.setAttribute('aria-label', nome ? ('Meus dados — ' + nome) : 'Meus dados');
  }

  /** Liga o botão da barra à folha. Chamado UMA vez, pelo bloco compartilhado. */
  function ligar(op) {
    op = op || {};
    estilo();
    if (op.id != null) D.id = String(op.id);
    if (op.codigo != null) D.codigo = String(op.codigo);
    if (op.wa) D.wa = String(op.wa);
    if (op.api) D.api = String(op.api);
    if (typeof op.jsonp === 'function') D.jsonp = op.jsonp;
    if (op.pessoa) D.pessoa = op.pessoa;
    if (op.empresa) D.empresa = op.empresa;
    if (typeof op.sair === 'function') D.sair = op.sair;

    BT = op.botao || null;
    LBL = op.rotulo || (BT && BT.querySelector('.b4u-lbl')) || null;
    if (BT) {
      BT.setAttribute('aria-expanded', 'false');
      BT.addEventListener('click', function () { abrir({}); });
      pintarBotao();
    }
    return API;
  }

  /** Funde o que a página descobriu depois. Repinta o botão e, se estiver aberta,
   *  a parte fixa da folha — a lista de contatos não é tocada, para não jogar fora
   *  o que a pessoa está digitando. */
  function atualizar(dados) {
    dados = dados || {};
    if (dados.id != null && dados.id !== '') D.id = String(dados.id);
    if (dados.codigo != null && dados.codigo !== '') D.codigo = String(dados.codigo);
    if (dados.wa) D.wa = String(dados.wa);
    if (dados.api) D.api = String(dados.api);
    if (typeof dados.jsonp === 'function') D.jsonp = dados.jsonp;
    if (dados.pessoa) D.pessoa = dados.pessoa;
    if (dados.empresa) D.empresa = dados.empresa;
    if (typeof dados.sair === 'function') D.sair = dados.sair;
    else if (dados.sair === null) D.sair = null;
    pintarBotao();
    if (ov) { pintarInfo(); pintarAcoes(); }
    return API;
  }

  /* ═══════════════ a folha ═══════════════ */

  function htmlInfo() {
    var emp = D.empresa || {};
    var nomeEmp = String(emp.razao_social || emp.razaoSocial || '').trim();
    var p = D.pessoa || null;
    var h = '';

    h += '<section class="b4uc-bloco"><h4 class="b4uc-rot">Empresa</h4>';
    /* Sem razão social não inventamos nome: o número do cliente é o que temos, e é
       verdade. Melhor o rótulo genérico do que um campo em branco. */
    h += '<div class="b4uc-emp">' + (nomeEmp ? esc(nomeEmp) : ('Cliente nº ' + esc(texto(D.id)))) + '</div>';
    if (emp.cnpj) h += '<div class="b4uc-linha"><span class="k">CNPJ</span>'
      + '<span class="v">' + identHTML(emp.cnpj, 'CNPJ') + '</span></div>';
    if (nomeEmp && D.id) h += '<div class="b4uc-linha"><span class="k">Cliente nº</span>'
      + '<span class="v">' + esc(texto(D.id)) + '</span></div>';
    h += '</section>';

    h += '<section class="b4uc-bloco"><h4 class="b4uc-rot">Você</h4>';
    if (!p || (!p.nome && !p.email)) {
      /* Acontece de verdade: quem entra pelo link da empresa (sem código pessoal)
         não tem contato identificado do outro lado. Dizer isso é melhor do que um
         bloco vazio — e explica por que a lista de contatos não está aqui. */
      h += '<p class="b4uc-note" style="margin:0">Você entrou pelo link da empresa. '
        + 'Entrando pelo seu e-mail, mostramos aqui o seu nome e o seu tipo de acesso.</p>';
    } else {
      if (p.nome) h += '<div class="b4uc-linha"><span class="k">Nome</span>'
        + '<span class="v">' + esc(p.nome) + '</span></div>';
      if (p.email) h += '<div class="b4uc-linha"><span class="k">E-mail</span>'
        + '<span class="v">' + esc(p.email) + '</span></div>';
      var principal = ehPrincipal(p.papel);
      h += '<div class="b4uc-linha"><span class="k">Acesso</span><span class="v">'
        + '<span class="b4uc-selo ' + (principal ? 'p' : 's') + '">'
        + (principal ? 'Responsável principal' : 'Acesso por áreas') + '</span></span></div>';
      if (principal) {
        h += '<p class="b4uc-note" style="margin:8px 0 0">Você vê todas as áreas da empresa '
          + 'e pode dar ou tirar o acesso das outras pessoas.</p>';
      } else {
        var areas = (p.areas && p.areas.length)
          ? p.areas.map(function (a) { return '<span class="b4uc-chip">' + esc(AREAS_LABEL[a] || a) + '</span>'; }).join('')
          : '';
        h += areas
          ? '<div class="b4uc-chips">' + areas + '</div>'
          : '<p class="b4uc-note" style="margin:8px 0 0">As áreas do seu acesso são definidas pelo responsável principal da empresa.</p>';
      }
    }
    h += '</section>';
    return h;
  }

  function htmlAcoes() {
    var h = '<div class="b4uc-acoes">';
    if (D.wa) {
      h += '<a class="b4uc-wa" href="' + esc(D.wa) + '" target="_blank" rel="noopener">'
        + IC_WA + 'Falar com a gente</a>';
    }
    /* "Sair deste aparelho" só existe onde a página TEM esse gesto — hoje, a home.
       Desenhar o botão nas outras seria prometer uma porta que não abre. */
    if (typeof D.sair === 'function') {
      h += '<button type="button" class="b4uc-sair" id="b4uc-sair">Sair deste aparelho</button>';
    }
    h += '</div>';
    return h;
  }

  function pintarInfo() {
    var box = ov && ov.querySelector('#b4uc-info');
    if (box) box.innerHTML = htmlInfo();
  }
  function pintarAcoes() {
    var box = ov && ov.querySelector('#b4uc-acoes');
    if (!box) return;
    box.innerHTML = htmlAcoes();
    var bs = box.querySelector('#b4uc-sair');
    if (bs) bs.addEventListener('click', function () {
      bs.disabled = true;
      bs.textContent = 'Saindo…';
      Promise.resolve()
        .then(function () { return D.sair(); })
        .then(function () { fechar(true); })
        .catch(function () {
          bs.disabled = false;
          bs.textContent = 'Tentar de novo';
        });
    });
  }

  /* A lista de contatos entra quando a pessoa é Principal — ou quando a página
     pediu explicitamente (`contatos:'sempre'`, que é o botão "E-mails e contatos"
     da home, e que existe desde antes deste painel). Papel conhecido e diferente
     de Principal: a seção não é desenhada e a chamada nem sai. */
  function querContatos() {
    if (MODO === 'sempre') return true;
    if (MODO === 'nunca') return false;
    var p = D.pessoa;
    if (!p || !p.papel) return false;
    return ehPrincipal(p.papel);
  }

  function abrir(op) {
    op = op || {};
    if (ov) return API;
    estilo();
    MODO = op.contatos || 'auto';
    focoVolta = op.focoVolta || BT || null;

    ov = d.createElement('div');
    ov.className = 'b4uc-ov';
    ov.id = 'b4uc-ov';
    ov.innerHTML =
      '<div class="b4uc-sheet" role="dialog" aria-modal="true" aria-labelledby="b4uc-tit">'
      + '<div class="b4uc-head"><b id="b4uc-tit">Meus dados</b>'
      + '<button type="button" class="b4uc-x" id="b4uc-x" aria-label="Fechar">✕</button></div>'
      + '<div class="b4uc-body">'
      + '<div id="b4uc-info"></div>'
      + '<div id="b4uc-ct"></div>'
      + '<div id="b4uc-acoes"></div>'
      + '<div class="b4uc-err" id="b4uc-err"></div>'
      + '<div class="b4uc-foot" id="b4uc-foot"></div>'
      + '</div></div>';
    (d.body || d.documentElement).appendChild(ov);

    pintarInfo();
    pintarAcoes();
    montarFoot();

    ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
    ov.querySelector('#b4uc-x').addEventListener('click', function () { fechar(); });
    d.addEventListener('keydown', tecla, true);

    if (BT) BT.setAttribute('aria-expanded', 'true');

    /* O foco entra na folha pelo ×: é o alvo que sempre existe e que devolve a
       pessoa para onde ela estava. Focar o primeiro campo levaria o teclado do
       celular para cima de uma ficha que ainda é só leitura. */
    var x = ov.querySelector('#b4uc-x');
    if (x) x.focus();

    if (querContatos()) carregarContatos();
    return API;
  }

  function tecla(e) {
    if (!ov) return;
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.stopPropagation();
      fechar();
      return;
    }
    if (e.key !== 'Tab' && e.keyCode !== 9) return;
    /* Armadilha de foco: sem ela o Tab sai da folha e passeia pela página de baixo,
       que continua inteira atrás do véu — quem navega por teclado ficava perdido
       num formulário que não estava vendo. */
    var alvos = ov.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
    if (!alvos.length) return;
    var primeiro = alvos[0], ultimo = alvos[alvos.length - 1];
    if (e.shiftKey && d.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && d.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }

  function fechar(force) {
    if (!ov) return API;
    /* Fechar não pode levar embora o que a pessoa digitou nos contatos. Primeiro
       clique avisa; o segundo (no "Sair sem salvar") fecha de verdade. */
    if (!force && CT && CT.editando && CT.dirty) { pedirDescartar(); return API; }
    d.removeEventListener('keydown', tecla, true);
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    ov = null; CT = null; MODO = 'auto';
    if (BT) BT.setAttribute('aria-expanded', 'false');
    var volta = focoVolta; focoVolta = null;
    if (volta && typeof volta.focus === 'function') volta.focus();
    return API;
  }

  function montarFoot() {
    var foot = ov && ov.querySelector('#b4uc-foot');
    if (!foot) return;
    foot.innerHTML = '<button type="button" class="b4uc-bt" id="b4uc-fechar">Fechar</button>'
      + (CT && CT.editando ? '<button type="button" class="b4uc-bt pri" id="b4uc-salvar">Salvar</button>' : '');
    foot.querySelector('#b4uc-fechar').addEventListener('click', function () { fechar(); });
    var s = foot.querySelector('#b4uc-salvar');
    if (s) s.addEventListener('click', salvarContatos);
  }

  function pedirDescartar() {
    var foot = ov && ov.querySelector('#b4uc-foot');
    if (!foot) { fechar(true); return; }
    foot.innerHTML = '<span class="b4uc-warn">⚠ Alterações não salvas</span>'
      + '<button type="button" class="b4uc-bt" id="b4uc-keep">Continuar</button>'
      + '<button type="button" class="b4uc-bt perigo" id="b4uc-discard">Sair sem salvar</button>';
    foot.querySelector('#b4uc-keep').addEventListener('click', montarFoot);
    foot.querySelector('#b4uc-discard').addEventListener('click', function () { fechar(true); });
  }

  /* ═══════════════ contatos ═══════════════
   * A folha inteira veio do index.html, onde morava sozinha e só era alcançável
   * pela home. O que mudou: o prefixo das classes, a casa (agora as oito páginas
   * têm) e o portão (o papel decide se ela aparece). As regras de dentro — a
   * validação que exige e-mail, a remoção em dois tempos e o `euMesmo` — vieram
   * inteiras, porque cada uma existe por causa de um estrago que já aconteceu.
   *
   * NÃO unificar com o modal de contato da equipe (contatos-equipe.html): lá o
   * contrato aceita nome sem e-mail e aqui o e-mail é obrigatório (sem ele o
   * backend descarta a pessoa em silêncio). Juntar os dois é decisão humana. */

  function pedir(url) {
    if (typeof D.jsonp === 'function') return D.jsonp(url);
    /* JSONP próprio, de reserva: o módulo roda em oito páginas e não pode depender
       de nenhuma delas ter passado o seu. Falhou, rejeita — quem chamou mostra a
       mesma mensagem de erro do resto do painel. */
    return new Promise(function (ok, fail) {
      var cb = 'b4uc_cb_' + Math.random().toString(36).slice(2);
      var s = d.createElement('script');
      var t = setTimeout(function () { limpa(); fail(new Error('A API não respondeu.')); }, 45000);
      function limpa() {
        clearTimeout(t);
        try { delete w[cb]; } catch (e) { w[cb] = undefined; }
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      w[cb] = function (dados) { limpa(); ok(dados); };
      s.onerror = function () { limpa(); fail(new Error('Não consegui alcançar a API.')); };
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cb;
      (d.body || d.documentElement).appendChild(s);
    });
  }

  function carregarContatos() {
    var box = ov && ov.querySelector('#b4uc-ct');
    if (!box) return;
    if (!D.api || !D.id || !D.codigo) { box.innerHTML = ''; return; }
    box.innerHTML = '<section class="b4uc-bloco"><h4 class="b4uc-rot">Contatos e acessos</h4>'
      + '<span class="b4u-skel b4uc-carregando"></span>'
      + '<span class="b4u-skel b4uc-carregando" style="width:70%"></span></section>';
    pedir(D.api + '?id=' + encodeURIComponent(D.id) + '&codigo=' + encodeURIComponent(D.codigo) + '&tipo=contatos')
      .then(function (r) {
        if (!ov) return;                       // fechou enquanto a resposta vinha
        if (!r || r.erro) throw new Error((r && r.erro) || 'contatos');
        CT = {
          dirty: false,
          contatos: (r.contatos || []).map(function (c) {
            return {
              nome: c.nome, email: c.email, papel: c.papel,
              areas: Object.keys(c.areas || {}).filter(function (a) { return c.areas[a]; }),
              _open: false
            };
          }),
          areas: (r.areas && r.areas.length) ? r.areas : Object.keys(AREAS_LABEL),
          editando: !!r.podeEditar,
          euEmail: String(r.euEmail || '').toLowerCase()
        };
        renderContatos();
      })
      .catch(function () {
        if (!ov) return;
        var b = ov.querySelector('#b4uc-ct');
        if (!b) return;
        /* Mesma mensagem de erro do resto do painel: o que deu errado é assunto
           nosso; do lado de lá, o que importa é que não carregou e dá para tentar
           de novo. O botão existe porque sem ele a única saída era fechar tudo. */
        b.innerHTML = '<section class="b4uc-bloco"><h4 class="b4uc-rot">Contatos e acessos</h4>'
          + '<p class="b4uc-note">Não consegui carregar os contatos agora. '
          + 'Tente de novo em alguns segundos.</p>'
          + '<button type="button" class="b4uc-bt" id="b4uc-ct-retry">Tentar de novo</button></section>';
        var r = b.querySelector('#b4uc-ct-retry');
        if (r) r.addEventListener('click', carregarContatos);
      });
  }

  function renderContatos() {
    var box = ov && ov.querySelector('#b4uc-ct');
    if (!box || !CT) return;
    var podeEditar = CT.editando;
    var aviso = podeEditar ? ''
      : '<p class="b4uc-note" style="color:var(--amber-txt,#8A5A10)">Você está vendo em modo leitura. '
        + 'Só um <b>responsável principal</b> (entrando com o próprio código) pode editar.</p>';
    box.innerHTML = '<section class="b4uc-bloco"><h4 class="b4uc-rot">Contatos e acessos</h4>'
      + '<p class="b4uc-note">Toque em um nome para ver ou editar. <b>Principal</b> acessa tudo; '
      + '<b>Secundário</b> recebe só as áreas marcadas.</p>'
      + aviso
      + '<div id="b4uc-lista">'
      + (CT.contatos.map(function (c, i) { return cardContato(c, i, podeEditar); }).join('')
         || '<p class="b4uc-note">Nenhum contato cadastrado ainda.</p>')
      + '</div>'
      + (podeEditar ? '<button type="button" class="b4uc-bt b4uc-add" id="b4uc-add">+ Adicionar contato</button>' : '')
      + '</section>';
    montarFoot();
    var add = box.querySelector('#b4uc-add');
    if (add) add.addEventListener('click', function () {
      CT.contatos.push({ nome: '', email: '', papel: 'Secundário', areas: [], _open: true });
      CT.dirty = true;
      renderContatos();
      /* renderContatos refaz o innerHTML inteiro e a folha volta ao topo: sem levar
         o cartão novo até os olhos, a pessoa acha que o toque não funcionou e toca
         de novo — e nascem dois contatos em branco. */
      focarUltimo();
    });
    wireCards(podeEditar);
  }

  function focarUltimo() {
    var cards = ov ? ov.querySelectorAll('#b4uc-lista .b4uc-acc') : [];
    var novo = cards[cards.length - 1];
    if (!novo) return;
    if (novo.scrollIntoView) novo.scrollIntoView({ block: 'center' });
    var nm = novo.querySelector('.b4uc-nome');
    if (nm) nm.focus({ preventScroll: true });
  }

  function cardContato(c, i, editar) {
    var principal = ehPrincipal(c.papel);
    var pill = '<span class="b4uc-papel ' + (principal ? 'p' : 's') + '">'
             + (principal ? 'Principal' : 'Secundário') + '</span>';
    var chev = '<span class="b4uc-chev" aria-hidden="true">▾</span>';

    if (!editar) {
      return '<div class="b4uc-acc' + (c._open ? ' open' : '') + '" data-i="' + i + '">'
        + '<button type="button" class="b4uc-acc-head" data-i="' + i + '" aria-expanded="' + (c._open ? 'true' : 'false') + '">'
        + '<span class="b4uc-acc-name">' + esc(c.nome || '—') + '</span>' + pill + chev + '</button>'
        + '<div class="b4uc-acc-body">'
        + '<div class="b4uc-mail">' + esc(c.email || '—') + '</div>'
        + '<div class="b4uc-areas">'
        + (principal ? '<span class="b4uc-area-chip on">Acesso total</span>'
           : CT.areas.map(function (a) {
               return '<span class="b4uc-area-chip' + (c.areas.indexOf(a) >= 0 ? ' on' : '') + '">'
                    + esc(AREAS_LABEL[a] || a) + '</span>';
             }).join(''))
        + '</div></div></div>';
    }

    /* euMesmo — ver regra 4 no topo. Três travas no MESMO cartão, e as três
       precisam existir juntas: sem o readonly ele troca o próprio e-mail por um
       que não é dele; sem tirar a opção "Secundário" ele se rebaixa; sem remover
       o botão de excluir ele se apaga. Qualquer uma das três deixa a empresa sem
       ninguém com a chave. */
    var euMesmo = !!CT.euEmail && String(c.email || '').toLowerCase() === CT.euEmail;
    return '<div class="b4uc-acc' + (c._open ? ' open' : '') + '" data-i="' + i + '">'
      + '<button type="button" class="b4uc-acc-head" data-i="' + i + '" aria-expanded="' + (c._open ? 'true' : 'false') + '">'
      + '<span class="b4uc-acc-name">' + esc(c.nome || 'Novo contato') + '</span>'
      + (euMesmo ? '<span class="b4uc-voce">você</span>' : '') + pill + chev + '</button>'
      + '<div class="b4uc-acc-body">'
      + '<label class="b4uc-lbl">Nome</label>'
      + '<input class="b4uc-in b4uc-nome" data-i="' + i + '" placeholder="Nome" value="' + esc(c.nome) + '">'
      + '<label class="b4uc-lbl">E-mail</label>'
      /* Sem isto o iPhone entrega "Ana@empresa.com" (maiúscula automática) e esconde a tecla @. */
      + '<input class="b4uc-in b4uc-email" data-i="' + i + '" type="email" inputmode="email" '
      + 'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="e-mail@empresa.com" '
      + 'value="' + esc(c.email) + '"' + (euMesmo ? ' readonly' : '') + '>'
      + '<label class="b4uc-lbl">Tipo de acesso</label>'
      + '<select class="b4uc-in b4uc-papel-sel" data-i="' + i + '"'
      + (euMesmo ? ' disabled title="Você não pode remover o seu próprio acesso principal"' : '') + '>'
      + '<option value="Principal"' + (principal ? ' selected' : '') + '>Principal · acesso total</option>'
      + (euMesmo ? '' : '<option value="Secundário"' + (!principal ? ' selected' : '') + '>Secundário · áreas escolhidas</option>')
      + '</select>'
      + '<div class="b4uc-areas-wrap' + (principal ? ' oculto' : '') + '">'
      + '<label class="b4uc-lbl">Áreas que recebe</label>'
      + '<div class="b4uc-areas">'
      + CT.areas.map(function (a) {
          return '<label class="b4uc-area-chk"><input type="checkbox" data-i="' + i + '" data-area="' + esc(a) + '"'
               + (c.areas.indexOf(a) >= 0 ? ' checked' : '') + '> ' + esc(AREAS_LABEL[a] || a) + '</label>';
        }).join('')
      + '</div></div>'
      + (euMesmo
          ? '<p class="b4uc-selfnote">Este é o seu acesso — você não pode se remover.</p>'
          : '<div class="b4uc-rm-linha"><button class="b4uc-rm" type="button" data-i="' + i + '">Remover contato</button></div>')
      + '</div></div>';
  }

  function wireCards(editar) {
    if (!ov) return;
    var lista = ov.querySelectorAll('#b4uc-lista .b4uc-acc-head');
    Array.prototype.forEach.call(lista, function (h) {
      h.addEventListener('click', function (e) {
        var acc = e.currentTarget.parentNode;
        var i = +e.currentTarget.getAttribute('data-i');
        var abre = !(acc.className.indexOf('open') >= 0);
        acc.className = 'b4uc-acc' + (abre ? ' open' : '');
        e.currentTarget.setAttribute('aria-expanded', abre ? 'true' : 'false');
        if (CT.contatos[i]) CT.contatos[i]._open = abre;
      });
    });
    if (!editar) return;

    Array.prototype.forEach.call(ov.querySelectorAll('.b4uc-nome'), function (el) {
      el.addEventListener('input', function (e) {
        var i = +e.target.getAttribute('data-i');
        CT.contatos[i].nome = e.target.value; CT.dirty = true;
        var acc = e.target.closest ? e.target.closest('.b4uc-acc') : null;
        var nm = acc && acc.querySelector('.b4uc-acc-name');
        if (nm) nm.textContent = e.target.value || 'Novo contato';
      });
    });
    Array.prototype.forEach.call(ov.querySelectorAll('.b4uc-email'), function (el) {
      el.addEventListener('input', function (e) {
        CT.contatos[+e.target.getAttribute('data-i')].email = e.target.value;
        CT.dirty = true;
      });
    });
    Array.prototype.forEach.call(ov.querySelectorAll('.b4uc-papel-sel'), function (el) {
      el.addEventListener('change', function (e) {
        var i = +e.target.getAttribute('data-i');
        var principal = ehPrincipal(e.target.value);
        CT.contatos[i].papel = e.target.value; CT.dirty = true;
        var acc = e.target.closest ? e.target.closest('.b4uc-acc') : null;
        var wrap = acc && acc.querySelector('.b4uc-areas-wrap');
        if (wrap) wrap.className = 'b4uc-areas-wrap' + (principal ? ' oculto' : '');
        var pill = acc && acc.querySelector('.b4uc-papel');
        if (pill) {
          pill.className = 'b4uc-papel ' + (principal ? 'p' : 's');
          pill.textContent = principal ? 'Principal' : 'Secundário';
        }
      });
    });
    /* Remover em dois tempos: o primeiro clique só pede confirmação (mesmo padrão
       do painel da equipe). Volta ao normal sozinho em 6 segundos. */
    Array.prototype.forEach.call(ov.querySelectorAll('.b4uc-rm'), function (btn) {
      var prazo = null;
      function repor() {
        clearTimeout(prazo); prazo = null;
        btn.className = 'b4uc-rm';
        btn.textContent = 'Remover contato';
        var x = btn.parentNode && btn.parentNode.querySelector('.b4uc-rm-desfazer');
        if (x && x.parentNode) x.parentNode.removeChild(x);
      }
      btn.addEventListener('click', function () {
        var i = +btn.getAttribute('data-i');
        if (btn.className.indexOf('confirmar') >= 0) {
          clearTimeout(prazo);
          CT.contatos.splice(i, 1); CT.dirty = true; renderContatos();
          return;
        }
        btn.className = 'b4uc-rm confirmar';
        btn.textContent = 'Clique de novo para remover';
        if (btn.parentNode && !btn.parentNode.querySelector('.b4uc-rm-desfazer')) {
          var cancelar = d.createElement('button');
          cancelar.type = 'button';
          cancelar.className = 'b4uc-rm-desfazer';
          cancelar.textContent = 'cancelar';
          cancelar.addEventListener('click', repor);
          btn.parentNode.appendChild(cancelar);
        }
        prazo = setTimeout(repor, 6000);
      });
    });
    Array.prototype.forEach.call(ov.querySelectorAll('.b4uc-area-chk input'), function (el) {
      el.addEventListener('change', function (e) {
        var i = +e.target.getAttribute('data-i');
        var a = e.target.getAttribute('data-area');
        var arr = CT.contatos[i].areas;
        if (e.target.checked) { if (arr.indexOf(a) < 0) arr.push(a); }
        else { var k = arr.indexOf(a); if (k >= 0) arr.splice(k, 1); }
        CT.dirty = true;
      });
    });
  }

  /* O backend descarta em silêncio quem está sem e-mail e ainda responde sucesso —
     o sócio some da lista e nunca recebe acesso. Barramos aqui, apontando a linha. */
  function validarContatos() {
    for (var i = 0; i < CT.contatos.length; i++) {
      var c = CT.contatos[i];
      var nome = String(c.nome || '').trim();
      var email = String(c.email || '').trim();
      var ord = ORDINAL[i] || ((i + 1) + 'º');
      var quem = nome ? ('“' + nome + '”') : ('o ' + ord + ' contato');
      if (!nome && !email) return { i: i, msg: 'O ' + ord + ' contato está em branco. Preencha nome e e-mail ou remova o cartão.' };
      if (!email) return { i: i, msg: 'Falta o e-mail de ' + quem + '. Sem e-mail ele não recebe o acesso — preencha ou remova o cartão.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { i: i, msg: 'O e-mail de ' + quem + ' está incompleto: “' + email + '”. Confira antes de salvar.' };
    }
    return null;
  }

  function salvarContatos() {
    if (!ov || !CT) return;
    var err = ov.querySelector('#b4uc-err');
    var btn = ov.querySelector('#b4uc-salvar');
    if (err) err.textContent = '';

    var falha = validarContatos();
    if (falha) {
      /* Abre o cartão do contato incompleto e leva a pessoa até ele — o erro
         sozinho, com o cartão fechado, não diz qual dos quatro nomes está faltando. */
      CT.contatos.forEach(function (c, k) { c._open = (k === falha.i); });
      renderContatos();
      var e2 = ov.querySelector('#b4uc-err');
      if (e2) e2.textContent = falha.msg;
      var card = ov.querySelectorAll('#b4uc-lista .b4uc-acc')[falha.i];
      if (card) {
        if (card.scrollIntoView) card.scrollIntoView({ block: 'center' });
        var alvo = card.querySelector(String(CT.contatos[falha.i].nome || '').trim() ? '.b4uc-email' : '.b4uc-nome');
        if (alvo) alvo.focus({ preventScroll: true });
      }
      return;
    }

    var payload = CT.contatos.map(function (c) {
      return { nome: c.nome, email: c.email, papel: c.papel, areas: ehPrincipal(c.papel) ? [] : c.areas };
    });
    var params = 'id=' + encodeURIComponent(D.id)
      + '&codigo=' + encodeURIComponent(D.codigo)
      + '&acao=salvar_contatos'
      + '&contatos=' + encodeURIComponent(JSON.stringify(payload));
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    pedir(D.api + '?' + params).then(function (r) {
      if (!ov) return;
      if (!r || r.erro) throw new Error((r && r.erro) || 'salvar');
      CT.dirty = false;
      /* Se o backend tiver descartado alguém mesmo assim, ele diz quem — e nós mostramos. */
      var ign = (r && Object.prototype.toString.call(r.ignorados) === '[object Array]')
        ? r.ignorados.filter(Boolean) : [];
      var avisoIgn = ign.length
        ? '<p class="b4uc-note" style="color:var(--amber-txt,#8A5A10)">⚠ '
          + (ign.length === 1 ? 'Não foi salvo' : 'Não foram salvos') + ': '
          + esc(ign.map(function (x) { return (x && (x.nome || x.email)) || String(x); }).join(', '))
          + '. ' + (ign.length === 1 ? 'Esse contato ficou' : 'Esses contatos ficaram')
          + ' sem e-mail válido e não ' + (ign.length === 1 ? 'recebe' : 'recebem') + ' acesso.</p>'
        : '';
      /* A confirmação é frase nossa. `d.mensagem` do backend saiu daqui porque o que
         o backend escreve muda sem aviso — inclusive para texto de exceção. O único
         dado do servidor que ainda aparece são os nomes ignorados, e esses vão por esc(). */
      var box = ov.querySelector('#b4uc-ct');
      if (box) box.innerHTML = '<section class="b4uc-bloco"><div class="b4uc-ok">'
        + '<h4>Contatos salvos ✓</h4><p>Tudo certo.</p>' + avisoIgn + '</div></section>';
      CT.editando = false;   // não há mais o que salvar nesta abertura
      montarFoot();
    }).catch(function () {
      if (!ov) return;
      var b = ov.querySelector('#b4uc-salvar');
      if (b) { b.disabled = false; b.textContent = 'Salvar'; }
      var e3 = ov.querySelector('#b4uc-err');
      // O que ele digitou continua na tela: a frase precisa dizer isso.
      if (e3) e3.textContent = 'Não consegui salvar os contatos agora. Nada foi perdido — '
        + 'o que você digitou continua aqui, tente de novo em alguns segundos.';
    });
  }

  var API = {
    ligar: ligar,
    atualizar: atualizar,
    abrir: function (op) { return abrir(op || {}); },
    fechar: function (force) { return fechar(force); },
    aberto: function () { return !!ov; },
    /* Só leitura, para quem precisa saber o que o painel já sabe (e para o teste). */
    estado: function () {
      return { id: D.id, codigo: D.codigo, wa: D.wa, pessoa: D.pessoa, empresa: D.empresa,
               temSair: typeof D.sair === 'function' };
    },
    ROTULO_GENERICO: ROTULO_GENERICO
  };

  w.B4UCliente = API;
})(window, document);
