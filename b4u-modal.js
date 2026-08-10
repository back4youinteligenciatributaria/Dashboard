/**
 * b4u-modal.js — a CASCA do modal do painel, num lugar só.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O painel não tem "um modal de cliente": tem CINCO fichas de assuntos diferentes
 * (cadastro, certificado, documentos, restituição, processo) e uma de tarefa. O que
 * se repetia não era o formulário — era a MOLDURA em volta dele, copiada byte a byte
 * em sete arquivos: o mesmo véu, o mesmo cabeçalho escuro, o mesmo rodapé, o mesmo
 * texto de "ainda não gravei o que você mudou", o mesmo comentário de oito linhas
 * sobre fechar em dois tempos. Sete cópias que já começavam a divergir: o véu de um
 * era .45 e o dos outros .55; um nascia em z-index 90 e outro em 960; um deles nem
 * avisava antes de fechar.
 *
 * Extrair o FORMULÁRIO faria um arquivo cheio de exceções — cada ficha é de um
 * assunto e não se parece com a outra. Extrair a MOLDURA resolve os sete de uma vez
 * e não cria exceção nenhuma.
 *
 * COMO USAR
 *   <script src="b4u-modal.js" charset="utf-8"></script>   (junto do b4u-shell.js)
 *
 *   const CAD = window.B4UModal && B4UModal.adotar('modalCad', {
 *     ids:{ titulo:'cadTitulo', selo:'cadId', pill:'cadSit', corpo:'cadBody',
 *           status:'saveStatusCad', aviso:'cadAviso', fechar:'cadFechar', x:'fechaCad' },
 *     sujo:      ()=>temPendencia(),
 *     aoFechar:  forcado=>{ ... },
 *     focoVolta: ()=>document.querySelector('.cli[data-id="..."] .cli-head')
 *   });
 *
 * ---------------------------------------------------------------------------------
 * QUATRO REGRAS QUE ESTE ARQUIVO SEGUE, E O MOTIVO DE CADA UMA
 *
 * 1. `adotar()` É O CAMINHO NORMAL; `criar()` É PARA O MODAL QUE AINDA NÃO EXISTE.
 *    As páginas já têm o `<div class="modal">` escrito à mão e DEZENAS de
 *    `getElementById` apontando para os ids de dentro dele — e ainda há links de
 *    fora (`?abrir=`, `?novo=`, `?t=`) que contam com esses ids. `adotar()` pega o
 *    nó que já está lá, mantém TODOS os ids como estão e só passa a mandar no
 *    COMPORTAMENTO. Nenhum id precisa ser renomeado para a casca entrar.
 *
 * 2. A CASCA É DONA DA MOLDURA, NUNCA DO CONTEÚDO.
 *    Dela: véu e clique fora, Esc, trava de rolagem do fundo, armadilha de foco,
 *    foco inicial e foco de volta, o aviso de "tem coisa por gravar", o fechar em
 *    dois tempos e o `beforeunload`. Da página: autosave, fila de pendências,
 *    chamada de API, layout do formulário. É essa fronteira que impede este arquivo
 *    de virar um catálogo de exceções — o dia em que ele souber o que é "SUJOS" ou
 *    "FALHAS", já virou.
 *
 * 3. O PREFIXO É `b4m-`, E ISSO NÃO É CAPRICHO.
 *    `.modal-*`, `.fld`, `.in`, `.sec`, `.msg`, `.pill` e `.x` já existem nas páginas
 *    com valores DIFERENTES em cada uma; `.ct-nome` é um input numa página e uma
 *    `<div>` de exibição em outra. Trazer qualquer um desses nomes numa folha
 *    compartilhada repintaria formulários que não são modais. Tudo aqui nasce em
 *    `b4m-` e a folha entra uma vez só, num `<style id="b4m-css">`.
 *
 * 4. O CAMPO EM FOCO ENTRA NA CONTA ANTES DE QUALQUER DECISÃO DE FECHAR.
 *    A gravação das fichas sai do `change`, que só dispara quando o campo perde o
 *    foco. Fechar pelo Esc não passa por blur nenhum: sem soltar o foco primeiro,
 *    sair logo depois de digitar levava embora justamente o que a pessoa acabou de
 *    escrever — e sem nem o aviso de "tem coisa por gravar", porque para a página
 *    ainda não havia nada por gravar. Uma única página tratava disso à mão; agora é
 *    o padrão de todas, e é a casca que garante.
 * ---------------------------------------------------------------------------------
 *
 * SE ESTE ARQUIVO NÃO CARREGAR
 * A ficha não abre — e mais nada acontece. As páginas guardam a chamada atrás de
 * `window.B4UModal &&`, o `<div class="modal">` continua com o atributo `hidden`
 * (que o próprio navegador respeita, sem folha nenhuma) e a lista por baixo segue
 * inteira, com busca, filtros e links funcionando.
 */
(function (w, d) {
  'use strict';
  if (w.B4UModal) return;

  /* ─────────────────────────────────────────────────────────────────────────
   * A folha
   * Os números não são novos: são os que quatro das sete cópias já tinham. Onde
   * as cópias divergiam, ficou o valor da maioria — e a divergência morre aqui.
   * ───────────────────────────────────────────────────────────────────────── */
  var CSS = [
    '.b4m[hidden]{display:none}',

    /* z-index 960 e não 90: o modal cobre a janela inteira, inclusive a faixa de
       264px onde mora o menu lateral do b4u-shell.js — e o menu é 940. Com 90, o
       menu ficava POR CIMA do véu: clicável enquanto se digita, e um clique
       distraído trocava de página com o formulário aberto. As páginas resolviam
       isso com duas regras (`body.b4s .modal` e `.modal.modal-cad`), porque a
       primeira só existe quando o shell carrega. Aqui é um número só, e ele já
       vale sem depender de o shell ter carregado. */
    '.b4m{position:fixed;inset:0;z-index:960;background:rgba(7,48,52,.55);',
    'display:flex;align-items:flex-start;justify-content:center;padding:20px 12px;overflow:auto}',

    /* A caixa é uma COLUNA com altura de tela: o miolo rola por dentro e o
       cabeçalho (quem é a ficha) e o rodapé (o que gravou, e os botões) ficam
       sempre à vista. Sem isso, numa ficha longa a pessoa rolava até o fim para
       achar o botão de salvar e perdia de vista de quem era a ficha. */
    '.b4m-box{background:var(--canvas,#FFFDF9);border-radius:var(--radius-lg,14px);width:100%;',
    'max-width:920px;margin:36px auto;display:flex;flex-direction:column;',
    'max-height:calc(100vh - 72px);overflow:hidden;box-shadow:0 20px 60px rgba(7,48,52,.35)}',

    '.b4m-top{flex:none;position:sticky;top:0;z-index:2;background:var(--brand-dark,#073034);',
    'color:#fff;display:flex;align-items:center;gap:10px;padding:13px 16px}',
    '.b4m-tit{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    'font-size:var(--fs-4,15px);font-weight:800}',
    '.b4m-selo{font-size:var(--fs-2,12px);font-weight:700;color:#cfe6e2;white-space:nowrap}',
    /* O empurrão que joga o × para a direita. Existe como classe própria porque
       `.spacer` é nome de rua: cada página tem o seu, com valores diferentes. */
    '.b4m-esp{flex:1}',
    '.b4m-x{font-family:var(--sans,system-ui,sans-serif);font-size:var(--fs-5,19px);font-weight:800;',
    'line-height:1;background:rgba(255,255,255,.12);color:#fff;border:0;flex:none;',
    'border-radius:var(--radius-pill,999px);width:32px;height:32px;cursor:pointer}',
    '.b4m-x:hover{background:rgba(255,255,255,.28)}',

    '.b4m-corpo{flex:1;min-height:0;overflow:auto;padding:16px}',
    '.b4m-pe{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:11px 16px;',
    'background:var(--surface,#fff);border-top:1px solid var(--line,#E6DFD4)}',

    /* Aviso de "tem coisa por gravar": aparece no primeiro pedido de fechar e o
       segundo fecha assim mesmo — confirmação em dois tempos, nunca uma caixa do
       navegador. Âmbar: não é erro, é recado. */
    '.b4m-aviso{font-size:var(--fs-2,12px);font-weight:700;color:#8a5117;',
    'background:var(--amber-soft,#FBF0DF);border:1px solid var(--amber-line,#EBD9BC);',
    'border-radius:var(--radius-sm,8px);padding:6px 10px}',
    '.b4m-aviso[hidden]{display:none}',

    /* Só o modal montado por criar() usa estes botões e este indicador — quem foi
       adotado continua com os botões que a página já desenhou. */
    '.b4m-bt{font-family:var(--sans,system-ui,sans-serif);font-size:13px;font-weight:800;',
    'padding:9px 15px;border-radius:var(--radius-pill,999px);border:1px solid transparent;cursor:pointer}',
    '.b4m-bt.pri{background:var(--brand-teal,#0F8C85);color:#fff}',
    '.b4m-bt.sec{background:var(--surface-warm,#F3EDE3);color:var(--ink-2,#3B4A48);',
    'border-color:var(--line-2,#D9D1C4)}',
    '.b4m-bt.danger{background:var(--vermelho,#B3402F);color:#fff}',
    '.b4m-bt[disabled]{opacity:.55;cursor:default}',
    '.b4m-status{font-size:13px;font-weight:800;padding:6px 13px;white-space:nowrap;',
    'border-radius:var(--radius-pill,999px);background:var(--surface-warm,#F3EDE3);color:var(--ink-2,#3B4A48)}',
    '.b4m-status:empty{display:none}',

    /* No celular a moldura é o que sobra de espaço: o véu perde a margem e a caixa
       ocupa a tela quase inteira. */
    '@media(max-width:640px){.b4m{padding:8px}.b4m-box{max-height:calc(100vh - 16px);margin:0 auto}}'
  ].join('');

  function estilo() {
    if (d.getElementById('b4m-css')) return;
    var s = d.createElement('style');
    s.id = 'b4m-css';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Estado compartilhado
   * PILHA é a ordem de quem está por cima: Esc e Tab respondem sempre ao ÚLTIMO
   * modal aberto. Uma tela do painel chega a ter dois (a lista de clientes tem o
   * "cliente novo" e o "cadastro"), e sem a pilha o Esc fechava o de baixo.
   * ROLAGEM guarda o `overflow` que o `<body>` tinha ANTES do primeiro modal —
   * devolver '' às cegas apagaria uma trava que a página tivesse posto por conta.
   * ───────────────────────────────────────────────────────────────────────── */
  var PILHA = [];
  var ROLAGEM = null;

  var FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
                 'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function pega(x) {
    if (!x) return null;
    return typeof x === 'string' ? d.getElementById(x) : x;
  }
  function veste(no, c) { if (no && !no.classList.contains(c)) no.classList.add(c); }
  function escreve(no, t) { if (no) no.textContent = t == null ? '' : String(t); }

  function travarFundo() {
    if (PILHA.length) return;                 // já travado por outro modal
    ROLAGEM = d.body.style.overflow;
    d.body.style.overflow = 'hidden';
  }
  function destravarFundo() {
    if (PILHA.length) return;                 // ainda tem modal aberto por baixo
    d.body.style.overflow = ROLAGEM || '';
    ROLAGEM = null;
  }

  /* Esc e Tab vêm na CAPTURA, de propósito. As páginas escutam `keydown` no
     `document` para os atalhos delas ("/" foca a busca, Esc limpa a busca) — e com
     um modal aberto nenhum desses atalhos pode disparar. Escutar antes e cortar a
     propagação faz isso valer para todas de uma vez, em vez de cada página ter de
     lembrar de perguntar "tem modal aberto?" no começo do handler dela. */
  d.addEventListener('keydown', function (e) {
    if (!PILHA.length) return;
    var topo = PILHA[PILHA.length - 1];
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      topo._esc();
      return;
    }
    if (e.key === 'Tab' || e.keyCode === 9) topo._tab(e);
  }, true);

  /* ─────────────────────────────────────────────────────────────────────────
   * A ficha
   * ───────────────────────────────────────────────────────────────────────── */
  function montar(no, op) {
    op = op || {};
    estilo();

    var ids  = op.ids || {};
    var box  = pega(ids.box) || no.querySelector('.modal-box') || no.querySelector('.b4m-box') || no.firstElementChild;
    var topo = box && (pega(ids.topo) || box.querySelector('.modal-top') || box.querySelector('.b4m-top'));
    var pe   = box && (pega(ids.pe)   || box.querySelector('.modal-foot') || box.querySelector('.b4m-pe'));
    var corpo  = pega(ids.corpo)  || (box && (box.querySelector('.modal-body') || box.querySelector('.b4m-corpo')));
    var titulo = pega(ids.titulo) || (topo && topo.querySelector('b'));
    var selo   = pega(ids.selo)   || (topo && topo.querySelector('.cad-id'));
    var pill   = pega(ids.pill)   || (topo && topo.querySelector('.pill'));
    var btX    = pega(ids.x)      || (topo && topo.querySelector('button'));
    var status = pega(ids.status) || (pe && pe.querySelector('.save-status'));
    var aviso  = pega(ids.aviso)  || (pe && pe.querySelector('.cad-aviso'));
    var msg    = pega(ids.msg)    || (pe && pe.querySelector('.msg'));
    var btFechar = pega(ids.fechar);

    /* Vestir o que foi adotado: as classes da página CONTINUAM no elemento (o CSS
       da ficha depende delas), a folha da casca só se soma. */
    veste(no, 'b4m');
    veste(box, 'b4m-box');
    veste(topo, 'b4m-top');
    veste(pe, 'b4m-pe');
    veste(corpo, 'b4m-corpo');
    veste(titulo, 'b4m-tit');
    veste(selo, 'b4m-selo');
    veste(btX, 'b4m-x');
    veste(aviso, 'b4m-aviso');
    [topo, pe].forEach(function (n) {
      if (!n) return;
      Array.prototype.forEach.call(n.querySelectorAll('.spacer'), function (s) { veste(s, 'b4m-esp'); });
    });

    if (op.largura && box) box.style.maxWidth = typeof op.largura === 'number' ? op.largura + 'px' : op.largura;

    /* A caixa é o diálogo — e é ela que recebe o foco ao abrir. `tabindex="-1"`
       porque um `<div>` não é focável por natureza, e sem foco dentro do modal o
       leitor de tela continuaria lendo a página de trás. */
    if (box) {
      if (!box.getAttribute('role')) box.setAttribute('role', 'dialog');
      if (!box.hasAttribute('aria-modal')) box.setAttribute('aria-modal', 'true');
      if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');
      if (!box.getAttribute('aria-labelledby') && titulo && titulo.id) {
        box.setAttribute('aria-labelledby', titulo.id);
      }
    }

    var avisado = false;     // já avisamos que tem coisa por gravar? (fechar em 2 tempos)
    var rotFechar = null;    // rótulo original do botão secundário, para devolver depois
    var focoAnterior = null; // quem tinha o foco quando o modal abriu

    function perdeAoFechar() {
      if (typeof op.perdeAoFechar === 'function') return !!op.perdeAoFechar();
      return typeof op.sujo === 'function' ? !!op.sujo() : false;
    }

    /* Ver a regra 4 no topo: o que está no campo em foco tem de virar `change`
       ANTES de a casca perguntar se há algo por gravar. */
    function soltarFoco() {
      var a = d.activeElement;
      if (!a || !no.contains(a)) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName || '') || a.isContentEditable) {
        try { a.blur(); } catch (e) {}
      }
    }

    function avisar(mostrar) {
      if (aviso) aviso.hidden = !mostrar;
      if (!btFechar) return;
      if (mostrar) {
        if (rotFechar == null) rotFechar = btFechar.textContent;
        btFechar.textContent = 'Fechar assim mesmo';
      } else if (rotFechar != null) {
        /* Devolve o rótulo que o botão TINHA, não a palavra "Fechar": numa ficha
           de coisa nova ele diz "Cancelar", e trocar isso por "Fechar" mudaria o
           gesto de desistir de criar para o de sair de algo que já existe. */
        btFechar.textContent = rotFechar;
        rotFechar = null;
      }
    }

    function focaveis() {
      if (!box) return [];
      return Array.prototype.filter.call(box.querySelectorAll(FOCAVEIS), function (el) {
        return !el.hidden && el.offsetParent !== null;
      });
    }

    /* Tab não escapa do modal. Sem isto, quem navega por teclado saía por trás do
       véu e ia parar nos filtros da lista — visíveis, escurecidos e clicáveis. */
    function prender(e) {
      var lista = focaveis();
      if (!lista.length) { e.preventDefault(); if (box) box.focus(); return; }
      var primeiro = lista[0], ultimo = lista[lista.length - 1], a = d.activeElement;
      if (e.shiftKey) {
        if (a === primeiro || a === box || !box.contains(a)) { e.preventDefault(); ultimo.focus(); }
      } else if (a === ultimo || !box.contains(a)) {
        e.preventDefault(); primeiro.focus();
      }
    }

    var api = {
      /* Abrir um modal que JÁ está aberto acontece de propósito: é a lista
         trocando de ficha sem fechar a moldura. Nesse caso não se trava nada de
         novo nem se empilha de novo — só se devolve o foco para o alto da caixa,
         que é o gesto de "esta agora é outra ficha". */
      abrir: function () {
        if (no.hidden) {
          focoAnterior = d.activeElement;
          travarFundo();
          no.hidden = false;
          PILHA.push(api);
        }
        avisado = false;
        avisar(false);
        if (box) box.focus();
        return api;
      },

      /* `forcado` = já decidimos sair (o salvamento entrou, ou a página está
         encerrando o gesto por conta própria): pula o aviso de dois tempos. A
         TRAVA, essa, não tem forçado — ver `travado` na documentação da API. */
      fechar: function (forcado) {
        if (no.hidden) return api;
        if (typeof op.travado === 'function' && op.travado()) return api;
        soltarFoco();
        if (!forcado && perdeAoFechar() && !avisado) { avisado = true; avisar(true); return api; }
        no.hidden = true;
        var i = PILHA.indexOf(api);
        if (i >= 0) PILHA.splice(i, 1);
        destravarFundo();
        avisado = false;
        avisar(false);
        if (typeof op.aoFechar === 'function') op.aoFechar(!!forcado);
        /* O foco volta DEPOIS do aoFechar: é ele que repinta a linha da lista, e
           mirar antes seria mirar num nó que a repintura já jogou fora. */
        var alvo = typeof op.focoVolta === 'function' ? op.focoVolta() : focoAnterior;
        if (alvo && alvo.focus) { try { alvo.focus(); } catch (e) {} }
        return api;
      },

      aberto: function () { return !no.hidden; },

      /* A página retira o aviso quando a pendência que o gerou entrou: deixar
         "Fechar assim mesmo" na tela depois de tudo gravado é mentira, e o
         próximo Fechar sairia sem avisar de uma pendência NOVA. */
      aviso: function (mostrar) { avisado = !!mostrar; avisar(!!mostrar); return api; },
      no:     function () { return no; },
      corpo:  function () { return corpo; },
      titulo: function (t) { escreve(titulo, t); return api; },
      selo:   function (s) { escreve(selo, s); return api; },

      /* `pill(null)` esconde. A classe vem da página (é ela que sabe o que é
         "vencido" ou "Principal"); a casca só preserva as classes que o elemento
         já tinha no HTML, para não apagar a base que o CSS da página estiliza. */
      pill: function (o) {
        if (!pill) return api;
        if (!o) { pill.hidden = true; return api; }
        pill.hidden = false;
        pill.className = (pill.dataset.b4mBase || '') + (o.classe ? ' ' + o.classe : '');
        pill.title = o.dica || '';
        escreve(pill, o.texto);
        return api;
      },

      status: function (classe, texto) {
        if (!status) return api;
        status.className = (status.dataset.b4mBase || '') + (classe ? ' ' + classe : '');
        escreve(status, texto);
        return api;
      },

      msg: function (classe, texto) {
        if (!msg) return api;
        msg.className = (msg.dataset.b4mBase || '') + (classe ? ' ' + classe : '');
        escreve(msg, texto);
        return api;
      },

      acao: function (id) { return pega(id); },

      _esc: function () { api.fechar(false); },
      _tab: prender
    };

    /* A classe "de fábrica" de cada elemento variável fica guardada: é sobre ela
       que pill()/status()/msg() escrevem o estado, sem apagar o que o CSS da
       página usa para achar o elemento. Quando o HTML já nasce com uma classe de
       ESTADO (`class="pill sit-sem"`, o vazio do começo), a página diz qual é a
       base em `op.base` — a casca não tem como adivinhar qual das classes é o
       estado e qual é o elemento. */
    var base = op.base || {};
    [[pill, 'pill'], [status, 'status'], [msg, 'msg']].forEach(function (par) {
      if (par[0]) par[0].dataset.b4mBase = base[par[1]] != null ? base[par[1]] : par[0].className;
    });

    if (op.titulo != null) api.titulo(op.titulo);
    if (op.selo != null) api.selo(op.selo);
    if (op.pill) api.pill(op.pill);

    /* Fechar pelo véu: só quando o clique foi NO véu, nunca dentro da caixa. */
    no.addEventListener('click', function (e) { if (e.target === no) api.fechar(false); });
    if (btX) btX.addEventListener('click', function () { api.fechar(false); });
    if (btFechar) btFechar.addEventListener('click', function () { api.fechar(false); });

    /* Sair da PÁGINA com alteração por gravar pede confirmação. Fica aqui, e não
       em cada tela, porque é a mesma pergunta em todas — e porque a tela que não
       tinha essa linha (a de tarefas) perdia o formulário inteiro em silêncio. */
    if (typeof op.sujo === 'function') {
      w.addEventListener('beforeunload', function (e) {
        if (op.sujo()) { e.preventDefault(); e.returnValue = ''; }
      });
    }

    return api;
  }

  var API = {
    /**
     * Adota um `<div class="modal">` que JÁ existe no HTML da página.
     *
     * op.ids       { box, topo, pe, corpo, titulo, selo, pill, x, fechar, status,
     *                aviso, msg } — quem a casca deve mandar. O que não vier é
     *                procurado pela estrutura (.modal-box, .modal-top, …).
     * op.titulo    texto inicial do cabeçalho
     * op.selo      texto do selo ao lado do título (o antigo #cadId)
     * op.pill      { texto, classe, dica } (o antigo #cadSit)
     * op.base      { pill, status, msg } — a classe FIXA de cada um desses, sobre
     *              a qual pill()/status()/msg() escrevem o estado
     * op.largura   max-width da caixa
     * op.sujo      ()=>bool — "esta TELA tem coisa por gravar". Liga o
     *              `beforeunload` e, por padrão, o fechar em dois tempos.
     * op.perdeAoFechar ()=>bool — "fechar ESTE modal AGORA perde alguma coisa".
     *              Só existe porque as duas perguntas nem sempre têm a mesma
     *              resposta: uma ficha de contato NOVO não tem autosave (fechá-la
     *              não perde nada), mas a gravação pendente de OUTRO contato
     *              continua valendo se a pessoa fechar a aba. Sem esta separação,
     *              ou o aviso de fechar mentia, ou o da aba sumia.
     * op.travado   ()=>bool — Esc, véu e × não fecham. É para a operação que não
     *              pode ser interrompida: enquanto o cadastro de cliente novo está
     *              sendo criado, cada nova tentativa gera OUTRO cliente com OUTRAS
     *              pastas no Drive. Por isso a trava vale inclusive para o fechar
     *              forçado: quem trava não quer ser convencido.
     * op.aoFechar  (forcado)=>{} — a limpeza da página depois de o modal sumir
     * op.focoVolta ()=>elemento — para onde o foco volta (chamado DEPOIS de aoFechar)
     */
    adotar: function (idOuNo, op) {
      var no = pega(idOuNo);
      if (!no) return null;
      return montar(no, op);
    },

    /**
     * Monta um modal do zero e o pendura no `<body>`. Mesmas opções do adotar(),
     * mais:
     *   op.id        id do véu (obrigatório)
     *   op.acoes     [{id, rot, tipo:'pri'|'sec'|'danger'}] — botões do rodapé
     *   op.status    true monta o indicador de gravação no rodapé
     *   op.avisoSujo texto do aviso de "tem coisa por gravar"
     *
     * Ninguém usa isto ainda: os sete modais de hoje foram todos adotados, que é
     * o caminho seguro para quem já tem ids espalhados pela página. Existe para o
     * PRÓXIMO — para que o oitavo modal do painel não volte a ser escrito à mão.
     */
    criar: function (op) {
      op = op || {};
      estilo();
      var id = op.id || ('b4m-' + Math.random().toString(36).slice(2));
      var tid = id + '-tit';
      var no = d.createElement('div');
      no.className = 'b4m';
      no.id = id;
      no.hidden = true;

      var acoes = (op.acoes || []).map(function (a) {
        return '<button type="button" class="b4m-bt ' + (a.tipo || 'sec') + '" id="' + a.id + '">' +
               (a.rot || '') + '</button>';
      }).join('');

      no.innerHTML =
        '<div class="b4m-box" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="' + tid + '">' +
          '<div class="b4m-top">' +
            '<b class="b4m-tit" id="' + tid + '"></b>' +
            '<span class="b4m-selo"></span>' +
            '<span class="pill" hidden></span>' +
            '<span class="b4m-esp"></span>' +
            '<button type="button" class="b4m-x" aria-label="Fechar">×</button>' +
          '</div>' +
          '<div class="b4m-corpo"></div>' +
          '<div class="b4m-pe">' +
            (op.status ? '<span class="b4m-status"></span>' : '') +
            (op.avisoSujo ? '<span class="b4m-aviso" hidden>' + op.avisoSujo + '</span>' : '') +
            '<span class="b4m-esp"></span>' + acoes +
          '</div>' +
        '</div>';

      (d.body || d.documentElement).appendChild(no);

      /* O primeiro botão secundário é o que vira "Fechar assim mesmo" no segundo
         clique — é o gesto de sair, e é nele que o aviso mora. */
      var sec = (op.acoes || []).filter(function (a) { return (a.tipo || 'sec') === 'sec'; })[0];
      var ids = {};
      Object.keys(op.ids || {}).forEach(function (k) { ids[k] = op.ids[k]; });
      if (!ids.fechar && sec) ids.fechar = sec.id;
      ids.status = ids.status || no.querySelector('.b4m-status');
      ids.aviso  = ids.aviso  || no.querySelector('.b4m-aviso');

      var op2 = {};
      Object.keys(op).forEach(function (k) { op2[k] = op[k]; });
      op2.ids = ids;
      return montar(no, op2);
    },

    /** Tem algum modal aberto na tela? */
    algumAberto: function () { return PILHA.length > 0; }
  };

  w.B4UModal = API;
})(window, document);
