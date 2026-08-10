/**
 * b4u-shell.js — o menu lateral do painel, num lugar só.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * Cada página do painel era uma ilha: para ir de Fiscal para Societário, o cliente
 * voltava para a home e clicava de novo. A barra do topo tentava resolver isso com
 * `.slice(0,2)` — dois atalhos, escolhidos por sorteio da ordem das áreas. Quem tinha
 * cinco áreas nunca via as outras três.
 *
 * Agora existe navegação de verdade, do lado, sempre visível. E o bloco da barra, que
 * estava copiado à mão em oito arquivos e já tinha derivado em duas gerações que
 * diferiam entre si, passa a ter um dono só: este arquivo.
 *
 * COMO USAR
 *   <script src="b4u-shell.js" charset="utf-8"></script>   (depois do config.js)
 *   B4UShell.montar({ perfil:'cliente', ativo:'fiscal', contexto:{...}, link:fn });
 *
 * ---------------------------------------------------------------------------------
 * TRÊS REGRAS QUE ESTE ARQUIVO SEGUE, E O MOTIVO DE CADA UMA
 *
 * 1. A ROLAGEM CONTINUA SENDO A DA JANELA.
 *    A tentação era fazer a área de conteúdo rolar por dentro, como no Conta Azul.
 *    Mas dez pontos do painel leem `window.scrollY` — e o puxar-para-atualizar das
 *    oito páginas do cliente é contido por `topo(){ return window.scrollY<=0 }`. Num
 *    container, `scrollY` é sempre 0: qualquer arrasto para baixo recarregaria a tela.
 *    Por isso a barra lateral é `position:fixed` e o `<body>` só ganha recuo.
 *
 * 2. A BARRA LATERAL SÓ ENCAIXA ACIMA DE 1100px; ABAIXO DISSO É GAVETA.
 *    O painel tem 177 pontos de quebra de largura e UMA única container query. Media
 *    query mede a JANELA, e uma barra de 264px não encolhe a janela: num notebook de
 *    1280px a coluna vira 1016px e nada dispara — a tabela de impostos não vira
 *    cartão e a lista de resumo empurra a página para o lado. Com o encaixe só acima
 *    de 1100px, a coluna nunca desce de ~836px enquanto a barra está visível, e os
 *    137 pontos de quebra abaixo de 900px continuam valendo exatamente como antes.
 *
 * 3. NADA É REMOVIDO — O QUE SOBRA É ESCONDIDO.
 *    As páginas referenciam ~30 elementos por `getElementById`. Apagar o logo ou o
 *    "← Painel" da barra porque agora eles vivem no menu lateral quebraria o script
 *    que escreve o `href` deles. Então a folha abaixo esconde; o elemento continua no
 *    DOM, continua recebendo `href`, e ninguém quebra.
 * ---------------------------------------------------------------------------------
 *
 * SE ESTE ARQUIVO NÃO CARREGAR
 * A página fica exatamente como era antes do menu lateral: as chamadas são protegidas
 * por `window.B4UShell &&`, o `<body>` não ganha a classe e a folha nunca entra.
 */
(function (w, d) {
  'use strict';
  if (w.B4UShell) return;

  var LARGURA = 264;     // barra lateral
  var ENCAIXE = 1100;    // abaixo disto vira gaveta (ver regra 2 no topo)

  /* ─────────────────────────────────────────────────────────────────────────
   * Menus
   * A ordem é a da rotina de quem usa, não a do organograma: o cliente abre o
   * painel para saber o que vence; o colaborador, para saber o que está parado.
   * ───────────────────────────────────────────────────────────────────────── */
  var MENU = {
    cliente: [
      { sec: 'Meu negócio' },
      { id: 'home',        rot: 'Início',                pag: 'index',        ic: 'home' },
      { id: 'guias',       rot: 'Agenda de pagamentos',  pag: 'guias',        ic: 'guias',   area: 'guias' },
      { id: 'fiscal',      rot: 'Fiscal',                pag: 'fiscal',       ic: 'fiscal',  area: 'fiscal' },
      { id: 'contabil',    rot: 'Contábil',              pag: 'contabil',     ic: 'livro',   area: 'contabil' },
      { id: 'pessoal',     rot: 'Departamento Pessoal',  pag: 'dptopessoal',  ic: 'pessoal', area: 'pessoal' },
      { sec: 'Jurídico' },
      { id: 'equiparacao', rot: 'Equiparação hospitalar', pag: 'equiparacao', ic: 'escudo',  area: 'equiparacao' },
      { id: 'societario',  rot: 'Societário',            pag: 'societario',   ic: 'doc',     area: 'societario' }
      /* "Meus chamados" fica de fora POR ORA, a pedido: a abertura de chamado está
         segurada (o #b4u-open e o "?" da barra já saem por CSS nas oito páginas), e
         um menu que leva a uma lista que ninguém consegue alimentar só gera dúvida.
         Quando o chamado voltar, é uma linha aqui — e o item volta para todo mundo
         de uma vez, que é a graça de o menu morar num arquivo só. */
    ],
    equipe: [
      { sec: 'Carteira' },
      { id: 'painel',      rot: 'Painel da equipe',      pag: 'colaborador',      ic: 'home' },
      { id: 'registro',    rot: 'Registros de clientes', pag: 'registro',         ic: 'pessoal' },
      { id: 'ativos',      rot: 'Clientes ativos',       pag: 'clientes-ativos',  ic: 'fiscal' },
      { sec: 'Operação' },
      { id: 'daily',       rot: 'Tarefas Daily',         pag: 'daily',            ic: 'guias' },
      { id: 'licencas',    rot: 'Documentos e licenças', pag: 'licencas',         ic: 'doc' },
      { id: 'certificados',rot: 'Certificados e acessos',pag: 'certificados',     ic: 'escudo' },
      { id: 'societario',  rot: 'Societário',            pag: 'societario-equipe',ic: 'livro' },
      { id: 'restituicao', rot: 'Restituição',           pag: 'restituicao',      ic: 'guias' },
      { sec: 'Relacionamento' },
      { id: 'contatos',    rot: 'Contatos',              pag: 'contatos-equipe',  ic: 'chat' },
      { id: 'comercial',   rot: 'Comercial',             pag: 'comercial',        ic: 'grafico' }
    ]
  };

  /* ═════════════════════════════════════════════════════════════════════════
   * TEMAS — quatro peles do painel do colaborador
   *
   * O QUE VARIA, O QUE NUNCA VARIA E POR QUÊ está escrito por extenso no
   * `b4u-design.css`, seção OS QUATRO TEMAS. Em uma linha: tema mexe em
   * superfície, letra, cantos, densidade e fonte; NÃO mexe em SINAL
   * (--amber/--amber-txt/--verde/--vermelho, que são informação: quem passa o
   * dia nesta tela lê a cor antes de ler a palavra) nem em IDENTIDADE
   * (--brand-*, porque tema é pele e não rebrand).
   *
   * POR QUE O CSS ESTÁ AQUI E NÃO NO `b4u-design.css`
   * Porque de lá ele não sairia. O `_aplica-design.js` não copia aquele arquivo:
   * copia um PEDAÇO dele — a `corpoCanonico()` fatia do `:root` até a primeira
   * chave de fechamento em começo de linha. Regra escrita depois disso é
   * decoração de arquivo, nunca entra em página nenhuma.
   *
   * E vir por aqui não é remendo: resolve três coisas de uma vez.
   *   a) O tema é SÓ do colaborador, e este arquivo já sabe quais são as
   *      páginas dele (MENU.equipe). Se o CSS viajasse no bloco copiado, as 12
   *      páginas do cliente carregariam quatro blocos que nunca casam com nada.
   *   b) ANTES DA PRIMEIRA PINTURA. As 18 páginas trazem
   *      `<script src="b4u-shell.js" charset="utf-8">` no <head>, sem defer e
   *      sem async: o parser PARA ali. O atributo e a folha entram antes de
   *      existir <body>, então a tela nunca aparece na pele errada para depois
   *      se corrigir. É por isso que isto roda no topo do IIFE e NÃO dentro do
   *      `montar()` — o `montar()` só acontece com o DOM pronto, e a pele
   *      chegando lá piscaria a cada navegação.
   *   c) UM MODO DE FALHAR SÓ. Sem este arquivo não vem nem folha nem atributo,
   *      e a página fica exatamente como é hoje. Não existe o estado meio-torto
   *      de ter a folha sem o atributo.
   *
   * POR QUE NÃO PRECISA DE !important
   * `html[data-tema=papel]` tem especificidade (0,1,1) — um tipo mais um
   * atributo. `:root` tem (0,1,0) — uma pseudo-classe só. O tema ganha do
   * `:root` do bloco copiado E do `:root` escrito à mão na página, venha ele
   * antes ou depois desta folha. Ordem de fonte não decide nada aqui; decide o
   * um-a-mais do seletor de atributo. (Conferido de verdade, não só no papel:
   * um documento com o tema declarado ANTES de um `:root` que redeclara o mesmo
   * token resolve para o valor do tema.)
   * ═════════════════════════════════════════════════════════════════════════ */

  var TEMA_CHAVE = 'b4s_tema';
  var TEMA_PADRAO = 'areia';

  /* A ordem é a da conversa com quem escolhe: primeiro o que ele já conhece,
     depois as três razões de trocar — ler melhor, caber mais, cansar menos.
     A dica não é enfeite: "Sereno" sozinho não diz nada a ninguém. */
  var TEMAS = [
    { id:'areia',    rot:'Areia',    dica:'O padrão da casa: fundo bege e cantos discretos.' },
    { id:'papel',    rot:'Papel',    dica:'Branco e letra com serifa, para leitura longa.' },
    { id:'compacto', rot:'Compacto', dica:'Letra e cantos menores: cabe mais lista na tela.' },
    { id:'sereno',   rot:'Sereno',   dica:'Tons frios, cantos redondos e mais respiro.' }
  ];

  /* AREIA NÃO TEM BLOCO, e isso é escolha. Ela É o `:root` do núcleo, letra por
     letra. Um bloco `html[data-tema=areia]` teria de repetir 19 tokens só para
     chegar no mesmo lugar — e no dia em que alguém mudasse um hex do núcleo, a
     areia seria o único tema que NÃO mudaria junto, porque estaria congelada na
     cópia. Sem bloco, "areia" quer dizer literalmente "sem pele por cima".

     Nenhum bloco redeclara token que ele não muda: valor repetido é valor que
     alguém esquece de atualizar junto. Por isso o `compacto` não tem uma cor, o
     `papel` não tem um raio, e NENHUM dos três declara `--surface` — o cartão é
     branco nas quatro peles, e repetir #FFFFFF três vezes só criaria três
     lugares para esquecer no dia em que ele deixar de ser branco.

     Os hexes destes blocos passaram todos em 4,5:1 (WCAG AA) — `ink`, `ink-2` e
     `muted` sobre `canvas`, `surface` e `surface-warm` de cada tema. O `muted` é
     o mais apertado dos três em todos eles, porque é a cor de quase todo rótulo
     do sistema: quem for mexer em `canvas` ou `muted` refaz a conta antes. */
  var CSS_TEMA = [
    /* PAPEL — eixo FONTE (+ superfície). Papel branco em vez de bege, traço mais
       frio e serifa DE SISTEMA. Nenhuma fonte nova do Google: seria mais uma
       requisição bloqueante em 22 páginas para servir uma pele que nem todo
       mundo escolhe. Cantos e densidade continuam os da areia — de propósito:
       quem escolhe "papel" está resolvendo leitura, não tamanho. */
    'html[data-tema="papel"]{',
    '--canvas:#F4F2ED;--surface-warm:#FAF9F6;',
    '--ink:#1B2B29;--ink-2:#43524F;--muted:#5E6A67;',
    '--line:#E2E0DA;--line-2:#CFCCC4;',
    '--sans:Georgia,"Iowan Old Style","Times New Roman",serif}',

    /* COMPACTO — eixo DENSIDADE + CANTOS, e só. A paleta é a da areia, sem uma
       linha de cor aqui: quem escolhe compacto está resolvendo espaço de tela,
       não gosto de cor.
       LIMITE HONESTO: `padding`, `gap` e altura de linha estão escritos à mão
       nas 22 páginas e não passam por token nenhum. Este tema aperta a LETRA e
       esquadra o CANTO; ele não fecha o respiro entre as linhas. Para isso
       faltaria um `--esp-1..n` e uma varredura nas 22 páginas. */
    'html[data-tema="compacto"]{',
    '--radius-sm:2px;--radius:4px;--radius-lg:6px;--radius-pill:4px;',
    '--fs-1:10px;--fs-2:11px;--fs-3:12px;--fs-4:14px;--fs-5:17px;--fs-6:21px}',

    /* SERENO — os quatro eixos ao mesmo tempo, para o outro extremo: menos
       saturação, canto redondo e escala um degrau acima. É a pele de quem passa
       o dia na tela e não precisa de muita coisa na mesma janela. */
    'html[data-tema="sereno"]{',
    '--canvas:#EDEEEA;--surface-warm:#F7F8F5;',
    '--ink:#22332F;--ink-2:#455551;--muted:#606B67;',
    '--line:#E0E3DE;--line-2:#CBD0CA;',
    '--radius-sm:8px;--radius:12px;--radius-lg:16px;--radius-pill:10px;',
    '--fs-1:12px;--fs-2:13px;--fs-3:14px;--fs-4:16px;--fs-5:20px;--fs-6:25px}'
  ].join('');

  /** Id conhecido, ou o padrão. Valor estranho no localStorage não pinta nada. */
  function temaValido(id) {
    for (var i = 0; i < TEMAS.length; i++) if (TEMAS[i].id === id) return id;
    return TEMA_PADRAO;
  }

  /* Navegação privada e localStorage desligado por política dão exceção só de
     ENCOSTAR em `w.localStorage` — por isso o try engloba o acesso, não só a
     chamada. Falhou: cai no padrão e o painel funciona igual, sem lembrar da
     escolha. É a mesma postura do `nEmpresasCache()` aqui embaixo. */
  function temaGravado() {
    try { return temaValido(w.localStorage.getItem(TEMA_CHAVE)); }
    catch (e) { return TEMA_PADRAO; }
  }

  /* O tema é do COLABORADOR e não pode vazar para o cliente. A lista de páginas
     dele já existe (MENU.equipe), é síncrona e não depende do `montar({perfil})`
     — dá para decidir aqui no <head>, antes de qualquer pintura, sem esperar a
     página dizer quem ela é. Esperar o `montar()` seria justamente o que faz
     piscar.
     Comparar por `pag` é seguro: nenhum nome de página está nos dois menus. O
     Societário do cliente é `societario`; o da equipe é `societario-equipe`. */
  function paginaDoColaborador() {
    var p = paginaAtual();
    for (var i = 0; i < MENU.equipe.length; i++) if (MENU.equipe[i].pag === p) return true;
    return false;
  }

  var TEMA_LIGADO = paginaDoColaborador();
  var temaAtual = TEMA_PADRAO;
  var seletores = [];        // radiogroups já entregues, para não ficarem mentindo
  var seqSeletor = 0;

  function folhaTema() {
    if (d.getElementById('b4s-tema-css')) return;
    var s = d.createElement('style');
    s.id = 'b4s-tema-css';
    s.textContent = CSS_TEMA;
    (d.head || d.documentElement).appendChild(s);
  }

  function sincronizarSeletores() {
    for (var i = 0; i < seletores.length; i++) {
      var r = seletores[i].querySelectorAll('input[type=radio]');
      for (var j = 0; j < r.length; j++) r[j].checked = (r[j].value === temaAtual);
    }
  }

  function aplicarTema(id) {
    temaAtual = temaValido(id);
    if (TEMA_LIGADO) {
      folhaTema();
      /* `areia` também marca o atributo, mesmo sem bloco de CSS: serve para o
         seletor e para o devtools dizerem em qual pele a pessoa está. Como não
         existe regra `html[data-tema=areia]`, marcar não muda um pixel. */
      d.documentElement.setAttribute('data-tema', temaAtual);
    }
    sincronizarSeletores();
    return temaAtual;
  }

  /* ── A APLICAÇÃO, SÍNCRONA, AQUI ─────────────────────────────────────────
     Não dentro do `montar()`. Ver a alínea (b) lá em cima: é isto que garante
     que a tela não pisca no tema errado a cada navegação. Numa página do
     cliente, `TEMA_LIGADO` é falso e nada acontece com o <html>. */
  aplicarTema(temaGravado());

  /** Radiogroup de verdade, pronto para inserir. Devolve o <fieldset>.
   *
   *  ESCOLHA: <fieldset> com <input type=radio> nativo, e não uma lista com
   *  `role="radiogroup"` + `aria-checked` na mão. Os dois passam num checklist;
   *  o nativo passa no uso. Ele já traz navegação por seta dentro do grupo,
   *  tabindex móvel (o grupo inteiro é UMA parada de Tab), estado lido pelo
   *  leitor de tela e o nome do grupo pelo <legend> — tudo isso escrito à mão
   *  dá umas quarenta linhas de teclado que ninguém revisa depois.
   *
   *  Cada instância ganha um `name` próprio: dois seletores na mesma página (um
   *  no modal, um na tela) formariam um grupo só e a seta pularia de um para o
   *  outro. */
  function seletorTema() {
    estilo();                       // a folha do seletor mora na CSS do shell
    var fs = d.createElement('fieldset');
    fs.className = 'b4s-temas';
    var nome = 'b4s-tema-' + (++seqSeletor);

    var lg = d.createElement('legend');
    lg.textContent = 'Aparência do painel';
    fs.appendChild(lg);

    TEMAS.forEach(function (t) {
      var lb = d.createElement('label');
      lb.className = 'b4s-tema-op';

      var inp = d.createElement('input');
      inp.type = 'radio';
      inp.name = nome;
      inp.value = t.id;
      if (t.id === temaAtual) inp.checked = true;
      /* `change`, não `click`: com radio nativo a seta do teclado move a
         seleção sem clique nenhum, e só `change` dispara nos dois casos. */
      inp.addEventListener('change', function () {
        if (inp.checked) API.tema(t.id);
      });

      var txt = d.createElement('span');
      txt.className = 'b4s-tema-txt';
      var rot = d.createElement('span');
      rot.className = 'b4s-tema-rot';
      rot.textContent = t.rot;
      var dica = d.createElement('span');
      dica.className = 'b4s-tema-dica';
      dica.textContent = t.dica;
      txt.appendChild(rot);
      txt.appendChild(dica);

      lb.appendChild(inp);
      lb.appendChild(txt);
      fs.appendChild(lb);
    });

    seletores.push(fs);
    return fs;
  }

  var IC = {
    home:'<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>',
    guias:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="m8.5 15 2 2 4-4"/>',
    fiscal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
    livro:'<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2Z"/><path d="M8 7h7M8 11h7"/>',
    pessoal:'<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M16 4.2c1.7.4 3 2 3 3.8s-1.3 3.4-3 3.8M23 20c0-2.8-2.3-5.1-5.4-5.8"/>',
    escudo:'<path d="M12 2 3 7v6c0 5 4 8.5 9 9 5-.5 9-4 9-9V7l-9-5Z"/><path d="m9 12 2 2 4-4"/>',
    doc:'<path d="M6 2h7l5 5v15H6Z"/><path d="M13 2v5h5"/><path d="M9 13h6M9 17h4"/>',
    chat:'<path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z"/>',
    grafico:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };
  function svg(n){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
         + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n]||'') + '</svg>';
  }

  var CSS = [
    ':root{--b4s-larg:' + LARGURA + 'px}',

    /* O recuo do corpo só existe acima do encaixe. Abaixo disso a barra sai do fluxo
       e vira gaveta — é o que devolve a largura da janela para as media queries. */
    '@media(min-width:' + ENCAIXE + 'px){body.b4s{padding-left:var(--b4s-larg)}}',

    '.b4s-side{position:fixed;left:0;top:0;bottom:0;width:var(--b4s-larg);z-index:940;',
    'background:var(--brand-dark,#073034);color:#fff;display:flex;flex-direction:column;',
    'font-family:var(--sans,"Montserrat",system-ui,sans-serif);',
    'transition:transform .22s ease}',
    '.b4s-logo{height:56px;display:flex;align-items:center;gap:9px;padding:0 16px;flex-shrink:0;',
    'border-bottom:1px solid rgba(255,255,255,.10);font-weight:800;font-size:17px;',
    'letter-spacing:-.02em;color:#fff;text-decoration:none}',
    '.b4s-logo .y{color:var(--brand-euc,#3FA680)}',
    '.b4s-ctx{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.10);flex-shrink:0}',
    '.b4s-ctx .rot{font-size:11px;text-transform:uppercase;letter-spacing:.06em;',
    'color:rgba(255,255,255,.45);font-weight:700}',
    '.b4s-ctx .nome{font-size:13px;font-weight:600;margin-top:3px;line-height:1.35;',
    'overflow-wrap:anywhere}',
    '.b4s-ctx .sub{font-size:12px;color:rgba(255,255,255,.5);margin-top:2px}',
    '.b4s-nav{flex:1;overflow-y:auto;padding:8px 0;-webkit-overflow-scrolling:touch}',
    '.b4s-sec{font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;',
    'color:rgba(255,255,255,.38);padding:16px 16px 6px}',
    '.b4s-i{display:flex;align-items:center;gap:11px;padding:10px 16px;font-size:13px;',
    'font-weight:500;color:rgba(255,255,255,.78);text-decoration:none;',
    'border-left:3px solid transparent;transition:background .15s,color .15s}',
    '.b4s-i:hover{background:rgba(255,255,255,.06);color:#fff}',
    '.b4s-i.on{background:rgba(63,166,128,.16);color:#fff;font-weight:600;',
    'border-left-color:var(--brand-euc,#3FA680)}',
    '.b4s-i svg{width:17px;height:17px;flex-shrink:0;opacity:.9}',
    '.b4s-pe{padding:14px 16px;border-top:1px solid rgba(255,255,255,.10);flex-shrink:0}',
    '.b4s-wa{display:flex;align-items:center;justify-content:center;gap:8px;',
    'background:rgba(255,255,255,.10);border-radius:6px;padding:10px;font-size:13px;',
    'font-weight:600;color:#fff;text-decoration:none}',
    '.b4s-wa:hover{background:rgba(255,255,255,.16)}',

    /* Gaveta: fora da tela por padrão, entra com a classe. O véu cobre o conteúdo e
       fecha ao toque — sem ele, tocar "atrás" da gaveta clicaria na tabela. */
    '@media(max-width:' + (ENCAIXE - 1) + 'px){',
    /* `visibility:hidden` além do deslocamento: só empurrar para fora da tela deixa os
       dez links do menu na ordem de foco. Quem navega por teclado ou leitor de tela
       percorria um menu invisível e inalcançável antes de chegar ao conteúdo. */
    '.b4s-side{transform:translateX(-100%);visibility:hidden;box-shadow:0 0 40px rgba(0,0,0,.35)}',
    '.b4s-side.aberta{transform:none;visibility:visible}',
    '.b4s-veu{position:fixed;inset:0;z-index:939;background:rgba(7,48,52,.45);',
    'opacity:0;pointer-events:none;transition:opacity .22s ease}',
    '.b4s-veu.on{opacity:1;pointer-events:auto}}',
    '@media(min-width:' + ENCAIXE + 'px){.b4s-veu{display:none}.b4s-menu{display:none!important}}',

    /* O botão da gaveta entra na barra que a página já tem, para não somar altura —
       altura nova quebraria os calc(100vh - 190px) das grades. */
    /* 28px de desenho, 44px de alvo de toque pelo ::after. Os dois números têm motivo:
       a `.barra` da equipe tem 52px porque o filho mais alto tem 28px, e um botão de
       34px a empurraria para 58px — quebrando o `.topo{top:52px}` que duas páginas
       escreveram à mão e comendo 6px do `calc(100vh - 190px)` das grades. Já o alvo de
       44px é o mínimo para o dedo, e ele cresce para fora sem ocupar espaço. */
    '.b4s-menu{position:relative;display:inline-flex;align-items:center;',
    'justify-content:center;width:28px;height:28px;border:0;border-radius:6px;',
    'background:rgba(255,255,255,.12);color:#fff;cursor:pointer;flex-shrink:0;margin-right:2px}',
    '.b4s-menu::after{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;',
    'transform:translate(-50%,-50%)}',
    '.b4s-menu:hover{background:rgba(255,255,255,.2)}',
    '.b4s-menu svg{width:18px;height:18px}',

    /* O menu vive em 940 para cobrir o conteúdo. Modal de página que nasceu antes dele
       usa 80 ou 90 e passaria POR BAIXO: o véu escurece o meio da tela, mas a faixa da
       esquerda continua sendo o menu — clicável. Quem estava preenchendo o cadastro de
       um contato clicava sem querer em outra área e perdia o formulário. */
    'body.b4s .modal{z-index:960}',

    /* Some o que o menu lateral passou a dizer. Esconder, nunca remover: o script das
       páginas escreve href nesses elementos e quebraria se eles sumissem do DOM.
       O alvo é a classe `b4u-nav`, que marca exatamente os atalhos que a barra
       montava (o "Início" e os até dois links de área do `.slice(0,2)`). Não dá para
       mirar em `.b4u-btn.ghost`: essa combinação também veste botões legítimos que
       continuam na barra. E `#b4u-area` NÃO entra aqui — apesar do nome, é o seletor
       de área de dentro do modal de chamado, não um atalho de navegação. */
    'body.b4s .b4u-bar .b4u-logo,body.b4s .b4u-bar .b4u-nav,',
    'body.b4s .barra .logo,body.b4s .barra .volta,body.b4s .topo .logo{display:none!important}',

    /* Quem empurrava o WhatsApp para a direita era o `margin-right:auto` do logo.
       Escondido o logo, o botão escorregava para a esquerda e ficava colado no botão
       da gaveta. O empurrão passa a ser dele mesmo. */
    'body.b4s .b4u-bar .b4u-btn.wa{margin-left:auto}',

    /* ── A empresa aberta, no lugar do "Início" ──────────────────────────────
       O item dizia "Início" e levava para a home. Ele continua fazendo isso,
       mas passa a dizer QUAL empresa está aberta — que é a informação que
       faltava para quem tem mais de uma e nunca sabia em qual estava.
       A seta é um segundo alvo, à direita, e só nasce quando há para onde ir.
       Duas coisas na mesma linha porque são a mesma coisa: a empresa. */
    '.b4s-emp-row{display:flex;align-items:stretch}',
    '.b4s-emp-row .b4s-i{flex:1;min-width:0}',
    '.b4s-emp-row .b4s-i span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    /* 44px de alvo para o dedo — a seta é pequena de desenho e grande de toque. */
    '.b4s-troca{flex:none;width:44px;border:0;background:none;cursor:pointer;',
    'color:rgba(255,255,255,.78);display:flex;align-items:center;justify-content:center}',
    '.b4s-troca:hover{background:rgba(255,255,255,.06);color:#fff}',
    '.b4s-troca svg{width:15px;height:15px;transition:transform .15s}',
    '.b4s-troca[aria-expanded="true"] svg{transform:rotate(180deg)}',
    /* A lista abre EMPURRANDO o menu para baixo, não flutuando por cima: a barra
       já é estreita, e um balão sobreposto taparia justamente os itens de área. */
    '.b4s-lista{list-style:none;margin:0;padding:2px 0 6px;background:rgba(0,0,0,.22)}',
    '.b4s-lista button{display:block;width:100%;text-align:left;border:0;background:none;',
    'cursor:pointer;font:inherit;font-size:12.5px;line-height:1.35;color:rgba(255,255,255,.8);',
    'padding:9px 16px 9px 44px;overflow-wrap:anywhere}',
    '.b4s-lista button:hover{background:rgba(255,255,255,.08);color:#fff}',
    '.b4s-lista button[aria-current="true"]{color:#fff;font-weight:700}',
    '.b4s-lista .marca{color:var(--brand-euc,#3FA680);font-weight:700;font-size:11px}',
    /* O recado de "essa empresa não tem essa área" sobrevive à troca de página
       (sessionStorage) e aparece uma vez só, aqui em cima, onde a pessoa está
       olhando depois de trocar. Âmbar: não é erro, é explicação. */
    '.b4s-aviso{margin:10px 16px 0;padding:8px 10px;border-radius:6px;font-size:12px;',
    'line-height:1.4;background:rgba(232,137,46,.18);color:#F7DFC4}',

    '@media print{body.b4s{padding-left:0}.b4s-side,.b4s-veu,.b4s-menu{display:none!important}}',
    '@media(prefers-reduced-motion:reduce){.b4s-side,.b4s-veu{transition:none}}',

    /* ── Seletor de tema ────────────────────────────────────────────────────
       Desenhado com os PRÓPRIOS tokens, e isso é de propósito: trocar a pele
       repinta o seletor junto, então a escolha é uma amostra do resultado em
       vez de uma promessa. Cada `var()` vem com fallback porque este controle
       pode acabar num modal de página que não recebeu o bloco canônico. */
    '.b4s-temas{border:1px solid var(--line,#E4D9C9);border-radius:var(--radius,6px);',
    'background:var(--surface,#fff);padding:6px 12px 10px;margin:0;',
    'font-family:var(--sans,"Montserrat",system-ui,sans-serif)}',
    '.b4s-temas legend{padding:0 6px;font-size:var(--fs-1,11px);font-weight:800;',
    'text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#6E6256)}',
    /* Rótulo inteiro é alvo de clique: o alvo do dedo é a linha, não a bolinha. */
    '.b4s-tema-op{display:flex;align-items:flex-start;gap:10px;padding:8px 6px;',
    'border-radius:var(--radius-sm,4px);cursor:pointer;color:var(--ink,#113D39)}',
    '.b4s-tema-op:hover{background:var(--surface-warm,#FBF6EF)}',
    '.b4s-tema-op input{margin:2px 0 0;flex-shrink:0;',
    'accent-color:var(--brand-teal,#0F8C85)}',
    /* Foco visível de verdade: o grupo é uma parada de Tab só, e sem isto quem
       navega por teclado não sabe onde está dentro dele. */
    '.b4s-tema-op input:focus-visible{outline:2px solid var(--brand-teal,#0F8C85);',
    'outline-offset:2px}',
    '.b4s-tema-rot{display:block;font-size:var(--fs-3,13px);font-weight:700;line-height:1.3}',
    '.b4s-tema-dica{display:block;font-size:var(--fs-2,12px);line-height:1.35;',
    'margin-top:1px;color:var(--muted,#6E6256)}',
    /* O escolhido também muda de COR, não só de bolinha: bolinha marcada é
       pequena, e num radiogroup de quatro linhas o olho procura a linha, não o
       ponto. Irmão adjacente em vez de `:has()` — mesmo efeito, sem depender de
       um seletor que é novo demais para o parque de aparelhos da equipe. */
    '.b4s-tema-op input:checked+.b4s-tema-txt .b4s-tema-rot{color:var(--brand-teal-txt,#0C756F)}'
  ].join('');

  var side = null, veu = null, aberta = false;

  /* ═══════════════ TROCAR DE EMPRESA ═══════════════
   * Um contato pode estar em mais de um cadastro (mesmo e-mail, empresas
   * diferentes). Até aqui isso só era tratado no login por e-mail: o index
   * mostrava uma tela de escolha e, escolhida a empresa, não havia mais volta —
   * quem entrou por link salvo ou por aparelho confiável nunca via a escolha, e
   * ninguém tinha como trocar sem sair e entrar de novo.
   *
   * A LISTA NÃO FICA GUARDADA NO APARELHO. O `hash` de cada empresa é a senha
   * dela; gravar a lista no localStorage seria deixar a senha de todas as
   * empresas da pessoa num aparelho que pode ser compartilhado — e o painel faz
   * questão de limpar `b4u_pl_`/`b4u_disp_` justamente para o próximo não
   * herdar nada. Então a lista é pedida a cada carregamento e vive só em
   * memória, o tempo desta página.
   *
   * SE A ROTA NÃO EXISTIR (backend antigo), nada acontece: a linha continua
   * mostrando o nome da empresa aberta, sem seta — que é o comportamento certo
   * para quem tem uma empresa só. Ver _PATCH-BACKEND-EMPRESAS.md. */

  var MENU_ITENS = null;      // itens do perfil em uso, para achar a área da página atual

  /** #ID-SENHAEMPRESA-SENHACONTATO -> {id, codigo}. Mesma leitura que as páginas fazem. */
  function acessoAtual() {
    var h = String(location.hash || '').replace('#', '').trim();
    var m = h.match(/^(\d+)-(.+)$/);
    if (m) return { id: m[1], codigo: m[2] };
    var so = h.match(/^(\d+)$/);
    return { id: so ? so[1] : '', codigo: '' };
  }

  /** A página atual ("fiscal"), sem diretório, sem query e SEM .html.
   *
   *  O painel passou a se ligar por endereço limpo (/fiscal em vez de
   *  /fiscal.html), mas o .html continua valendo: o GitHub Pages serve as duas
   *  formas, e link antigo salvo no favorito ou mandado por e-mail tem de
   *  continuar abrindo. Por isso quem normaliza é aqui, num lugar só — o resto
   *  do menu compara com os nomes de MENU_ITENS, que agora não têm extensão.
   *  Sem este corte, quem entra por /fiscal.html cai num nome que não casa com
   *  item nenhum: o menu não acende a página em que a pessoa está, e trocar de
   *  empresa a joga para o Início em vez de manter a tela. */
  function paginaAtual() {
    var p = String(location.pathname || '').split('/').pop();
    return p.replace(/\.html?$/i, '') || 'index';
  }

  /** Qual área do menu esta página é? null = página sem área (o Início). */
  function areaDaPagina(pag) {
    for (var i = 0; MENU_ITENS && i < MENU_ITENS.length; i++) {
      if (MENU_ITENS[i].pag === pag) return MENU_ITENS[i].area || null;
    }
    return null;
  }

  /* JSONP curto e próprio: o shell não pode depender do jsonp de nenhuma página,
     porque roda em nove delas e cada uma tem o seu. Falhou, sumiu — quem chamou
     recebe null e a barra segue sem seta. */
  function pedirJSONP(url, pronto) {
    var cb = 'b4s_cb_' + Math.random().toString(36).slice(2);
    var s = d.createElement('script');
    var t = setTimeout(function () { limpa(); pronto(null); }, 20000);
    function limpa() { clearTimeout(t); try { delete w[cb]; } catch (e) { w[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
    w[cb] = function (dados) { limpa(); pronto(dados); };
    s.onerror = function () { limpa(); pronto(null); };
    s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cb;
    (d.body || d.documentElement).appendChild(s);
  }

  /* Quantas empresas esta pessoa tem — só o NÚMERO, por aba (sessionStorage).
     Não é credencial, e poupa a chamada em todas as páginas seguintes de quem
     tem uma empresa só, que é a maioria. Os hashes continuam sem ser gravados.
     A chave leva o ID: trocou de empresa, trocou a contagem. */
  function nEmpresasCache(id, valor) {
    var k = 'b4s_nemp_' + id;
    try {
      if (valor == null) { var v = sessionStorage.getItem(k); return v ? +v : null; }
      sessionStorage.setItem(k, String(valor));
    } catch (e) {}
    return null;
  }

  function buscarEmpresas(pronto) {
    var api = (typeof w.B4U_API === 'string' && w.B4U_API) ? w.B4U_API : '';
    var ac = acessoAtual();
    if (!api || !ac.id || !ac.codigo) { pronto(null); return; }
    if (nEmpresasCache(ac.id) === 1) { pronto(null); return; }   // já sabemos: é uma só
    pedirJSONP(api + '?tipo=minhas_empresas&id=' + encodeURIComponent(ac.id) +
                     '&codigo=' + encodeURIComponent(ac.codigo),
      function (dados) {
        /* Rota inexistente (backend antigo) ou falha de rede: `null`, e a barra
           fica como sempre foi. Não guardamos contagem nesse caso — senão um
           tropeço de rede esconderia a seta pelo resto da sessão. */
        if (!dados || dados.erro || !dados.empresas) { pronto(null); return; }
        nEmpresasCache(ac.id, dados.empresas.length);
        pronto(dados.empresas.length < 2 ? null : dados.empresas);
      });
  }

  /** Leva para a MESMA página da outra empresa. Sem a área lá, leva ao Início
   *  dela — e diz por quê, senão a pessoa acha que o clique deu errado. */
  function trocarPara(emp) {
    var pag = paginaAtual();
    var area = areaDaPagina(pag);
    /* `areas` null = o servidor não conseguiu dizer. Nesse caso não adivinhamos:
       vai para o Início, que toda empresa tem. */
    var temArea = !area || (emp.areas && emp.areas[area]);
    var alvo = temArea ? pag : 'index';
    if (!temArea) {
      try {
        sessionStorage.setItem('b4s_aviso', 'A empresa ' + emp.nome + ' não tem essa área. Abri o início dela.');
      } catch (e) {}
    }
    if (alvo === pag) { location.hash = emp.hash; location.reload(); }
    else { location.href = alvo + '#' + emp.hash; }
  }

  function avisoPendente() {
    try {
      var m = sessionStorage.getItem('b4s_aviso');
      if (m) sessionStorage.removeItem('b4s_aviso');
      return m || '';
    } catch (e) { return ''; }
  }

  function estilo() {
    if (d.getElementById('b4s-css')) return;
    var s = d.createElement('style');
    s.id = 'b4s-css';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }

  /* Com a gaveta aberta, o dedo não pode arrastar o que está atrás dela.
     Não é preciosismo: as oito páginas do cliente têm puxar-para-atualizar, contido
     só por `window.scrollY <= 0` — e a gaveta abre justamente com a página no topo.
     Sem isto, abrir o menu e arrastar para baixo recarrega a tela e fecha o menu
     sozinho, que é a cara de um bug. Prender aqui, no módulo, resolve para as oito
     de uma vez, em vez de emendar a guarda de cada uma. */
  function segurarToque(e) {
    if (!aberta) return;
    if (side && e.target && side.contains(e.target)) return;   // rolar o menu, sim
    if (e.cancelable) e.preventDefault();
  }

  function abrir(v) {
    aberta = !!v;
    if (side) side.classList.toggle('aberta', aberta);
    if (veu) veu.classList.toggle('on', aberta);
    var b = d.querySelector('.b4s-menu');
    if (b) b.setAttribute('aria-expanded', aberta ? 'true' : 'false');
    if (aberta) d.addEventListener('touchmove', segurarToque, { passive: false, capture: true });
    else d.removeEventListener('touchmove', segurarToque, { passive: false, capture: true });
  }

  /* O botão da gaveta vai para dentro da barra que a página já tem. Se não houver
     barra nenhuma, ele vira flutuante — nunca fica sem jeito de abrir o menu. */
  function botao() {
    var b = d.createElement('button');
    b.type = 'button';
    b.className = 'b4s-menu';
    b.setAttribute('aria-label', 'Abrir o menu');
    b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
                + 'stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    b.addEventListener('click', function () { abrir(!aberta); });

    var alvo = d.querySelector('.b4u-bar') || d.querySelector('.barra') || d.querySelector('.topo');
    if (alvo) alvo.insertBefore(b, alvo.firstChild);
    else {
      b.style.cssText = 'position:fixed;left:10px;top:10px;z-index:941';
      (d.body || d.documentElement).appendChild(b);
    }
  }

  var API = {
    LARGURA: LARGURA,
    ENCAIXE: ENCAIXE,
    MENU: MENU,

    /**
     * op.perfil    'cliente' | 'equipe'
     * op.ativo     id do item em destaque (ver MENU)
     * op.contexto  { rot, nome, sub } — quem está do outro lado da tela
     * op.link      função (pagina) -> href, para a página decidir como propaga
     *              id/codigo/chave. Sem ela, o link é a própria página.
     * op.wa        href do WhatsApp; sem ele o rodapé do menu não aparece
     * op.disp      { fiscal:true, ... } áreas que o cliente tem; item sem área
     *              contratada não entra no menu. Sem `disp`, entram todos.
     */
    montar: function (op) {
      op = op || {};
      if (side) return API;
      estilo();

      var perfil = op.perfil === 'equipe' ? 'equipe' : 'cliente';
      var itens = MENU[perfil] || [];
      MENU_ITENS = itens;                 // trocarPara() descobre por aqui qual área é a página atual
      var link = typeof op.link === 'function' ? op.link : function (p) { return p; };
      var ctx = op.contexto || {};
      var disp = op.disp || null;

      side = d.createElement('aside');
      side.className = 'b4s-side';
      side.setAttribute('aria-label', 'Menu principal');

      /* GUIA NOVA PARA TUDO, inclusive o menu.
         É a convenção da casa ("link clicado não tira o colaborador de onde ele
         estava") e o dono mandou valer sem exceção — antes o menu era forçado a
         target="_self" pelas páginas, para não acumular guias, e essa exceção
         caiu. Marcamos aqui, no próprio HTML do menu, e não com um `<base>`: o
         shell também roda em páginas que não têm `<base target="_blank">`, e o
         menu tem de abrir em guia nova nas duas. O rel="noopener" vem junto
         porque toda guia nova precisa dele.
         As únicas exceções continuam fora daqui, escritas à mão em cada página:
         o logo do topo (#logo-home) e o "← Painel" (#volta), que são o gesto de
         VOLTAR e trocam a guia atual. */
      var ALVO = ' target="_blank" rel="noopener"';

      var html = '<a class="b4s-logo"' + ALVO + ' href="' + link(itens[1] ? itens[1].pag : 'index') + '">'
               + '<span>back</span><span class="y">4you</span></a>';

      if (ctx.nome) {
        html += '<div class="b4s-ctx">'
             + (ctx.rot ? '<div class="rot">' + ctx.rot + '</div>' : '')
             + '<div class="nome">' + ctx.nome + '</div>'
             + (ctx.sub ? '<div class="sub">' + ctx.sub + '</div>' : '')
             + '</div>';
      }

      html += '<nav class="b4s-nav">';
      var pendente = null;                       // seção só entra se tiver item embaixo
      itens.forEach(function (it) {
        if (it.sec) { pendente = it.sec; return; }
        /* Área não contratada não vira item: o cliente que não tem Departamento
           Pessoal clicaria e cairia numa tela de "sem acesso" que ele não pediu.
           Sem registro nenhum (primeira visita num aparelho novo, ou logo depois de
           "sair deste aparelho"), o certo é NÃO oferecer área alguma — é o que a barra
           antiga fazia. Tratar a ausência como "mostra tudo" abriria justamente a
           Agenda de pagamentos, que está segurada no servidor: a pessoa clicaria e
           bateria numa tela de bloqueio que ela não pediu. Início e Meus chamados não
           têm `area` e continuam sempre à mão. */
        if (it.area && !(disp && disp[it.area])) return;
        if (pendente) { html += '<div class="b4s-sec">' + pendente + '</div>'; pendente = null; }

        /* O "Início" do cliente diz o nome da empresa aberta. Ele continua sendo
           o link para a home — só passa a responder também "em qual empresa eu
           estou?", que é a pergunta de quem tem mais de uma. A seta ao lado nasce
           depois, se e quando a lista chegar com outra empresa para abrir.
           Sem o nome (payload ainda não chegou), continua escrito "Início": um
           item de menu em branco seria pior que o rótulo genérico. */
        if (perfil === 'cliente' && it.id === 'home') {
          var rotEmp = (op.empresa && op.empresa.nome) || ctx.nome || it.rot;
          html += '<div class="b4s-emp-row">'
               +  '<a class="b4s-i' + (it.id === op.ativo ? ' on' : '') + '"' + ALVO + ' href="'
               +  link(it.pag) + '"' + (it.id === op.ativo ? ' aria-current="page"' : '')
               +  ' title="Início de ' + rotEmp + '">'
               +  svg(it.ic) + '<span>' + rotEmp + '</span></a>'
               +  '</div>';
          return;
        }

        html += '<a class="b4s-i' + (it.id === op.ativo ? ' on' : '') + '"' + ALVO + ' href="'
             + link(it.pag) + '"' + (it.id === op.ativo ? ' aria-current="page"' : '') + '>'
             + svg(it.ic) + '<span>' + it.rot + '</span></a>';
      });
      html += '</nav>';

      if (op.wa) {
        html += '<div class="b4s-pe"><a class="b4s-wa" href="' + op.wa + '" target="_blank" '
             + 'rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">'
             + '<path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6'
             + '-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3'
             + '.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.1.1.3 0 .5l-.3.5-.4.4'
             + 'c-.1.1-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.6 1 1.9 1.2.3.1.5.1.6-.1.2-.2.7-.8.9-1 .2-.3'
             + '.4-.2.6-.1.2.1 1.5.7 1.7.9.3.1.4.2.5.3.1.2.1.7-.1 1.3Z"/></svg>'
             + 'Falar com a gente</a></div>';
      }

      side.innerHTML = html;
      (d.body || d.documentElement).appendChild(side);

      veu = d.createElement('div');
      veu.className = 'b4s-veu';
      veu.addEventListener('click', function () { abrir(false); });
      d.body.appendChild(veu);

      d.body.classList.add('b4s');
      botao();

      /* Sobrou recado da troca anterior ("essa empresa não tem essa área")?
         Ele aparece uma vez, no alto, e some — a pessoa acabou de chegar aqui
         sem ter pedido, e merece saber por quê. */
      var recado = avisoPendente();
      if (recado) {
        var av = d.createElement('div');
        av.className = 'b4s-aviso';
        av.setAttribute('role', 'status');
        av.textContent = recado;
        var nav0 = side.querySelector('.b4s-nav');
        if (nav0) side.insertBefore(av, nav0);
      }

      /* A seta de trocar de empresa nasce DEPOIS, e só se houver outra empresa.
         Desenhar a barra não pode esperar por uma chamada de rede: quem tem uma
         empresa só (a maioria) não paga nada por isso, e quem tem duas vê a seta
         aparecer um instante depois, sem a tela ter piscado. */
      if (perfil === 'cliente') {
        var linha = side.querySelector('.b4s-emp-row');
        if (linha) buscarEmpresas(function (lista) {
          if (!lista || !side || !linha.parentNode) return;
          var atual = acessoAtual().id;

          var bt = d.createElement('button');
          bt.type = 'button';
          bt.className = 'b4s-troca';
          bt.setAttribute('aria-expanded', 'false');
          bt.setAttribute('aria-label', 'Trocar de empresa');
          bt.title = 'Trocar de empresa';
          bt.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
                       + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                       + '<path d="m6 9 6 6 6-6"/></svg>';
          linha.appendChild(bt);

          var ul = d.createElement('ul');
          ul.className = 'b4s-lista';
          ul.hidden = true;
          lista.forEach(function (emp) {
            var li = d.createElement('li');
            var b = d.createElement('button');
            b.type = 'button';
            b.textContent = emp.nome;
            if (String(emp.id) === String(atual)) {
              b.setAttribute('aria-current', 'true');
              var mc = d.createElement('span');
              mc.className = 'marca';
              mc.textContent = ' · atual';
              b.appendChild(mc);
            }
            /* Clicar na empresa que já está aberta não recarrega nada à toa:
               só fecha a lista. O gesto de ir para o início dela é o próprio
               nome, à esquerda, que continua sendo um link. */
            b.addEventListener('click', function () {
              if (String(emp.id) === String(atual)) { mostrar(false); return; }
              trocarPara(emp);
            });
            li.appendChild(b);
            ul.appendChild(li);
          });
          linha.parentNode.insertBefore(ul, linha.nextSibling);

          function mostrar(v) {
            ul.hidden = !v;
            bt.setAttribute('aria-expanded', v ? 'true' : 'false');
          }
          bt.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            mostrar(ul.hidden);
          });
          /* Esc fecha a lista antes de a gaveta se fechar: quem abriu a lista
             sem querer não perde o menu inteiro por causa disso. */
          d.addEventListener('keydown', function (e) {
            if ((e.key === 'Escape' || e.keyCode === 27) && !ul.hidden) {
              e.stopPropagation(); mostrar(false); bt.focus();
            }
          }, true);
        });
      }

      /* Esc fecha a gaveta — quem abriu sem querer no celular não fica preso. */
      d.addEventListener('keydown', function (e) {
        if ((e.key === 'Escape' || e.keyCode === 27) && aberta) abrir(false);
      });
      /* Clicar num item fecha a gaveta. Isso deixou de ser detalhe: como o menu
         abre em guia nova, a página de baixo NÃO navega, e sem este fechamento a
         gaveta ficaria aberta por cima da tela em que a pessoa continua. */
      side.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a')) abrir(false);
      });

      return API;
    },

    abrir: function () { abrir(true); return API; },
    fechar: function () { abrir(false); return API; },
    montado: function () { return !!side; },

    /* ── Temas ──────────────────────────────────────────────────────────────
       TEMAS         [{id,rot,dica}, ...] na ordem em que devem ser oferecidos
       tema()        -> id do tema atual ('areia' quando nada foi escolhido)
       tema('papel') aplica no <html>, grava, devolve o novo id
       seletorTema() -> HTMLElement pronto para inserir, já ligado

       A pele já foi aplicada lá em cima, no topo do arquivo, antes da primeira
       pintura. O que está aqui é só a porta para quem quiser TROCAR. */
    TEMAS: TEMAS,

    /** Sem argumento, lê. Com argumento, aplica e grava.
     *
     *  Numa página do CLIENTE isto grava a preferência mas NÃO toca no <html>:
     *  o `aplicarTema()` só mexe no atributo quando a página é do colaborador.
     *  Assim nem uma chamada de propósito faz o tema vazar para a tela de quem
     *  não escolheu nada. Id desconhecido cai no padrão — e é o padrão que fica
     *  gravado, para o lixo não voltar no próximo carregamento. */
    tema: function (id) {
      if (id === undefined) return temaAtual;
      var novo = aplicarTema(id);
      try { w.localStorage.setItem(TEMA_CHAVE, novo); } catch (e) {}
      return novo;
    },

    seletorTema: seletorTema
  };

  w.B4UShell = API;
})(window, document);
