/**
 * b4u-filtro.js — a caixa de seleção múltipla da régua de filtros.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * A régua do Daily filtrava por TEXTO: uma caixa onde se digitava "Gian; Kariane",
 * outra onde se digitava um pedaço do nome do cliente. Funcionava para quem já
 * sabia o que queria escrever — e só para esse. Quem abria a tela pela primeira vez
 * não tinha como descobrir que o ponto e vírgula existia, e cada letra digitada
 * passava por um resolvedor que podia responder "3 pessoas casam com isso".
 *
 * O pedido foi direto: caixa de seleção. Um botão que diz o que está filtrado, e um
 * painel com um checkbox por opção. Sem sintaxe para decorar, sem resolvedor para
 * errar, e a lista inteira à vista — que é o que faz a pessoa DESCOBRIR que dá para
 * ver duas áreas ao mesmo tempo.
 *
 * COMO USAR
 *   <script src="b4u-filtro.js" charset="utf-8"></script>   (junto do b4u-shell.js)
 *
 *   var f = B4UFiltro.criar({
 *     id:'f-quem', rot:'De quem',
 *     itens:[{v:'Gian', r:'Gian (você)', c:'Gian'}],
 *     marcados:['Gian'],
 *     vazio:'nada', rotTodos:'Todo o time', rotNada:'Ninguém', rotTodas:'Todos',
 *     todosVerde:true,
 *     aoMudar:function(m){ F_QUEM=m; desenharLista(); }
 *   });
 *   algumLugar.appendChild(f.no);
 *
 * O item é `{v, r, c}`: `v` é o VALOR (o que volta no aoMudar), `r` é o rótulo da
 * linha do painel, `c` é o rótulo CURTO do botão fechado (cai em `r` se não vier).
 * Existe porque "Gian Carlo Paradisi (você)" é a coisa certa dentro do painel e a
 * coisa errada dentro de um botão de 240px que ainda precisa caber o "+2".
 *
 * NÃO existe opção de busca: o campo aparece sozinho quando a lista passa de
 * LIMIAR_BUSCA itens. Ver a regra 3.
 *
 * ---------------------------------------------------------------------------------
 * CINCO REGRAS QUE ESTE ARQUIVO SEGUE, E O MOTIVO DE CADA UMA
 *
 * 1. `vazio` É OPÇÃO EXPLÍCITA, PORQUE OS DOIS SIGNIFICADOS SÃO LEGÍTIMOS.
 *    Zero marcado quer dizer coisas opostas conforme o filtro, e isso NÃO é
 *    acidente de implementação — é o desenho pedido:
 *
 *      vazio:'nada'   Área e De quem. A caixa NASCE com tudo marcado, então
 *                     desmarcar é um gesto deliberado: a pessoa tirou o último
 *                     item da lista e o que ela pediu foi "não me mostre nada".
 *                     A tela obedece e AVISA — quem chama trata a lista vazia
 *                     como filtro que não deixa passar ninguém. Cair em "todas"
 *                     calado seria desfazer o que a pessoa acabou de fazer; e
 *                     travar o último checkbox seria não deixar ela fazer.
 *
 *      vazio:'todos'  Cliente. A caixa NASCE vazia, porque são centenas de
 *                     clientes e marcar todos, um a um, para dizer "não quero
 *                     filtrar" é absurdo. Aqui vazio é o estado de repouso, o
 *                     mesmo com que a tela abriu — ninguém CHEGA nele desmarcando
 *                     o último de trezentos, então a regra de cima não se aplica
 *                     e não haveria o que avisar.
 *
 *    A diferença é de SIGNIFICADO, não de tamanho da lista. Por isso ela é um
 *    parâmetro escrito na chamada, e não uma heurística do tipo "mais de 50 itens
 *    então vazio é todos" — heurística acerta hoje e erra no dia em que a equipe
 *    tiver 60 colaboradores.
 *
 * 2. O CHECKBOX É NATIVO.
 *    `<input type="checkbox">` de verdade, nunca `role="checkbox"` numa div. O
 *    nativo já vem com estado lido pelo leitor de tela, marcação por barra de
 *    espaço, `indeterminate` (que é como se diz "seleção parcial" sem inventar
 *    vocabulário) e o clique na linha inteira quando ele mora dentro de um
 *    `<label>`. Reimplementar isso à mão dá trabalho para chegar pior.
 *
 * 3. A BUSCA APARECE SOZINHA, E NÃO ENCOSTA NA SELEÇÃO.
 *    Quem decide se há campo de busca é o TAMANHO DA LISTA, não quem chama: acima
 *    de LIMIAR_BUSCA itens ele entra. A regra escrita à mão em cada chamada
 *    (`busca:true` no filtro de clientes) envelhecia no primeiro dia em que a
 *    equipe crescesse — o filtro de pessoas continuaria sem busca com quarenta
 *    nomes porque, no dia em que alguém escreveu a chamada, eram cinco. Assim
 *    Áreas nunca ganha o campo, Clientes sempre ganha, e Pessoas ganha no dia em
 *    que precisar, sem ninguém lembrar de voltar aqui.
 *
 *    Digitar no campo só ESCONDE linhas. Item marcado que não casa com a busca
 *    continua marcado, continua contando no rótulo e continua filtrando. O erro
 *    clássico deste controle é o contrário — a busca "limpar" o que estava
 *    escolhido —, e ele é traiçoeiro porque acontece longe dos olhos.
 *    Pelo mesmo motivo a linha "Todas / Nenhuma" SOME enquanto há busca escrita:
 *    ela age sobre a lista inteira, e deixá-la ao lado de uma lista filtrada é
 *    convidar a desmarcar trezentos clientes que não estão na tela.
 *
 * 4. APLICA NO CLIQUE, SEM BOTÃO "APLICAR".
 *    Cada clique chama `aoMudar` na hora. Um botão de aplicar existiria para
 *    poupar recálculo — e aqui o recálculo é filtrar um vetor que já está na
 *    memória. Ele só custaria um passo a mais e a dúvida de "já valeu?".
 *
 * 5. O PAINEL NÃO PODE ESTOURAR A TELA.
 *    Ele é `position:absolute` e um absoluto que passa da borda direita gera
 *    rolagem lateral na PÁGINA inteira — numa régua de filtros que já é apertada
 *    a 390px, isso é o padrão e não a exceção. Então o CSS limita
 *    (`max-width:min(320px, 100vw - 24px)`) e, ao abrir, o `posicionar()` mede de
 *    verdade e puxa o painel para a esquerda quando falta espaço. A altura segue a
 *    mesma lógica: o que couber abaixo do botão, com rolagem por dentro.
 * ---------------------------------------------------------------------------------
 *
 * O PREFIXO É `b4f-`
 * `.chip`, `.fld`, `.in`, `.sec`, `.x` e `.ct-*` já estão tomados nas páginas, com
 * valores diferentes em cada uma; `.filtro` está tomado no Daily e é qualificado por
 * elemento (`select.filtro`, `input.filtro`), então um `<button class="filtro">` não
 * herdaria nada e ainda confundiria quem lesse. Tudo aqui nasce em `b4f-`, e a folha
 * entra uma vez só, num `<style id="b4f-css">`.
 *
 * SE ESTE ARQUIVO NÃO CARREGAR
 * Nada acontece: `w.B4UFiltro` não existe, as chamadas estão atrás de
 * `window.B4UFiltro &&` e a página cai nos controles nativos que ela já tinha. A
 * régua continua utilizável — com uma escolha por vez em vez de várias.
 */
(function (w, d) {
  'use strict';
  if (w.B4UFiltro) return;

  /* ─────────────────────────────────────────────────────────────────────────
   * A folha
   * Todo valor vem de token do design com fallback escrito ao lado: este arquivo
   * pode ser carregado por uma página que ainda não tenha o bloco B4U-DESIGN, e
   * um filtro sem borda no meio da régua pareceria defeito.
   * ───────────────────────────────────────────────────────────────────────── */
  var CSS = [
    '.b4f{position:relative;display:inline-flex;min-width:0;max-width:100%;vertical-align:top}',

    /* O botão fechado fala a MESMA língua visual do `select.filtro` que continua na
       régua (Situação): borda teal, letra teal escura, 700. Filtro no padrão também
       é filtro — deixá-lo cinza faria parecer que a lista é tudo o que existe. */
    /* `min(240px,100%)`, e não um dos dois: o teto de 240px impede que uma razão
       social inteira ("AJUB - CIRURGIA DE CABEÇA E PESCOÇO E OTORRINOLARINGOLOGIA
       SOCIEDADE SIMPLES") estique o botão para 548px; o `100%` impede que ele
       passe da largura que sobrou na régua quando ela é a de um celular. Só o
       teto fixo já deixava o botão maior que a tela em 320px; só o 100% não
       segurava nada, porque o pai é dimensionado pelo conteúdo. */
    '.b4f-bt{font-family:inherit;font-size:var(--fs-3,13px);font-weight:700;cursor:pointer;',
    'display:inline-flex;align-items:center;gap:7px;min-width:0;max-width:min(240px,100%);',
    'border:1px solid var(--brand-teal,#0F8C85);color:var(--brand-teal-txt,#0C756F);',
    'background:var(--surface,#fff);border-radius:var(--radius-pill,6px);padding:9px 11px 9px 13px;',
    'text-align:left;line-height:1.25}',
    '.b4f-bt:hover{border-color:var(--brand-teal-txt,#0C756F)}',
    '.b4f-bt:focus-visible{outline:2px solid var(--brand-teal,#0F8C85);outline-offset:1px}',
    '.b4f-rot{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.b4f-seta{flex:none;font-size:9px;opacity:.75}',
    '.b4f-bt[aria-expanded="true"] .b4f-seta{opacity:1}',

    /* Verde cheio = "isto mostra tudo o que existe". É o mesmo sinal do
       `select.filtro.time` de hoje, e por isso ele é OPCIONAL (`todosVerde`): só o
       filtro de pessoas muda o significado da tela ao abrir para o time inteiro.
       "Todas as áreas" e "todos os clientes" são o repouso, não um anúncio. */
    '.b4f-bt.b4f-tudo{background:var(--verde-2,#25804C);border-color:var(--verde-2,#25804C);color:#fff}',
    '.b4f-bt.b4f-tudo:hover{border-color:#fff}',

    /* Âmbar = "isto não deixa passar nada". O estado tem de se anunciar: uma lista
       vazia com um filtro de aparência normal parece tela quebrada. */
    '.b4f-bt.b4f-nada{background:var(--amber-soft,#FCEFE0);border-color:var(--amber,#E8892E);',
    'color:var(--amber-txt,#8A5A10)}',

    '.b4f-p{position:absolute;top:calc(100% + 5px);left:0;z-index:40;',
    'background:var(--surface,#fff);border:1px solid var(--line-2,#D6C3AC);',
    'border-radius:var(--radius,6px);box-shadow:0 6px 22px rgba(7,48,52,.18);',
    'padding:6px;width:max-content;min-width:190px;',
    'max-width:min(320px,calc(100vw - 24px));max-height:min(58vh,340px);',
    'overflow:auto;overscroll-behavior:contain}',
    '.b4f-p[hidden]{display:none}',

    '.b4f-li{display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:var(--radius-sm,4px);',
    'cursor:pointer;font-size:var(--fs-3,13px);color:var(--ink,#113D39);font-weight:600}',
    '.b4f-li[hidden]{display:none}',
    '.b4f-li:hover{background:var(--surface-warm,#FBF6EF)}',
    '.b4f-li input{flex:none;margin:0;width:15px;height:15px;cursor:pointer;',
    'accent-color:var(--brand-teal,#0F8C85)}',
    '.b4f-li input:focus-visible{outline:2px solid var(--brand-teal,#0F8C85);outline-offset:1px}',
    '.b4f-tx{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

    '.b4f-todas{font-weight:800;border-bottom:1px solid var(--line,#E4D9C9);',
    'border-radius:0;margin-bottom:4px;padding-bottom:8px}',
    '.b4f-dica{flex:none;font-size:var(--fs-1,11px);font-weight:600;color:var(--muted,#6E6256)}',

    '.b4f-in{width:100%;font-family:inherit;font-size:var(--fs-3,13px);color:var(--ink,#113D39);',
    'background:var(--surface,#fff);border:1px solid var(--line-2,#D6C3AC);',
    'border-radius:var(--radius-sm,4px);padding:7px 9px;margin-bottom:5px}',
    '.b4f-in:focus{outline:2px solid var(--brand-teal,#0F8C85);outline-offset:-1px}',
    '.b4f-vazio{padding:9px 8px;font-size:var(--fs-2,12px);color:var(--muted,#6E6256)}',

    /* No celular a régua inteira tem a largura da tela; o painel acompanha o que
       sobra e o resto vira rolagem por dentro dele, nunca da página. */
    '@media(max-width:520px){.b4f-p{max-width:calc(100vw - 20px)}}'
  ].join('');

  function estilo() {
    if (d.getElementById('b4f-css')) return;
    var s = d.createElement('style');
    s.id = 'b4f-css';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }

  /* Acima disto a lista ganha campo de busca. Oito é o ponto em que o painel deixa
     de caber inteiro no olho: até aí a pessoa acha o item lendo, e um campo a mais
     seria um passo a mais para escolher entre cinco nomes. Medido nas três listas
     reais do Daily — áreas (8 com o "sem área") não ganham, clientes (centenas)
     ganham, e a equipe ganha quando passar de sete pessoas. */
  var LIMIAR_BUSCA = 8;

  var SEQ = 0;
  /* Quem está aberto agora. O clique fora e o redimensionamento respondem a todos
     de uma vez — três filtros na mesma régua, e abrir o segundo tem de fechar o
     primeiro sem que cada um precise conhecer os outros. */
  var ABERTOS = [];

  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  }

  function fecharTodos(excecao) {
    for (var i = ABERTOS.length - 1; i >= 0; i--) {
      if (ABERTOS[i] !== excecao) ABERTOS[i]._fechar(false);
    }
  }

  /* Clique em qualquer lugar que não seja o próprio filtro fecha o painel. Na
     BORBULHA e não na captura: na captura este ouvinte rodaria antes do clique
     chegar ao checkbox, e em navegador nenhum isso é problema — mas a página
     hospedeira também escuta clique no document, e ficar antes dela sem precisar é
     assumir uma responsabilidade que não é deste arquivo. */
  d.addEventListener('click', function (e) {
    if (!ABERTOS.length) return;
    for (var i = ABERTOS.length - 1; i >= 0; i--) {
      var f = ABERTOS[i];
      if (!f.no.contains(e.target)) f._fechar(false);
    }
  });

  /* Redimensionar (girar o celular, abrir o teclado virtual) muda tudo o que o
     `posicionar()` mediu. Reposicionar no meio do gesto pisca; fechar é honesto e
     custa um toque. */
  w.addEventListener('resize', function () { fecharTodos(null); });

  function criar(op) {
    op = op || {};
    estilo();

    var id      = op.id || ('b4f-' + (++SEQ));
    var rot     = op.rot || 'Filtro';
    var vazio   = op.vazio === 'todos' ? 'todos' : 'nada';   // ver regra 1 no topo
    var rotTodos = op.rotTodos || 'Todos';
    var rotNada  = op.rotNada || 'Nada marcado';
    var rotTodas = op.rotTodas || 'Todas';
    var itens   = [];
    var marc    = [];            // valores marcados, como strings
    var aberto  = false;
    var busca   = '';

    var no = d.createElement('div');
    no.className = 'b4f';
    var pid = id + '-p';

    var bt = d.createElement('button');
    bt.type = 'button';
    bt.id = id;
    bt.className = 'b4f-bt';
    bt.setAttribute('aria-haspopup', 'true');
    bt.setAttribute('aria-expanded', 'false');
    bt.setAttribute('aria-controls', pid);
    bt.innerHTML = '<span class="b4f-rot"></span><span class="b4f-seta" aria-hidden="true">▼</span>';

    var p = d.createElement('div');
    p.className = 'b4f-p';
    p.id = pid;
    p.hidden = true;
    p.setAttribute('role', 'group');
    p.setAttribute('aria-label', rot);

    no.appendChild(bt);
    no.appendChild(p);

    var elRot = bt.querySelector('.b4f-rot');
    var elBusca = null, elTodas = null, elLista = null, elVazio = null;

    /* ── seleção ──────────────────────────────────────────────────────────── */
    function temMarc(v) { return marc.indexOf(String(v)) >= 0; }
    /* Os marcados NA ORDEM DOS ITENS. É o que faz o "Gian +2" ser sempre o mesmo
       "Gian" — pela ordem de clique, o rótulo mudaria de nome sozinho quando a
       pessoa desmarcasse e remarcasse alguém. Valor que não tem item (veio de um
       link, ou o item sumiu num recarregamento) NÃO é descartado: ele continua
       filtrando, e sumir com ele calado deixaria um filtro ativo e invisível. */
    function marcadosOrdenados() {
      var out = [], vistos = {};
      itens.forEach(function (i) {
        if (temMarc(i.v)) { out.push(String(i.v)); vistos[String(i.v)] = 1; }
      });
      marc.forEach(function (v) { if (!vistos[v]) out.push(v); });
      return out;
    }
    function todosMarcados() {
      return itens.length > 0 && itens.every(function (i) { return temMarc(i.v); });
    }
    function curto(v) {
      for (var i = 0; i < itens.length; i++) {
        if (String(itens[i].v) === String(v)) return itens[i].c || itens[i].r || String(v);
      }
      return String(v);
    }
    function longo(v) {
      for (var i = 0; i < itens.length; i++) {
        if (String(itens[i].v) === String(v)) return itens[i].r || String(v);
      }
      return String(v);
    }

    /* ── rótulo do botão fechado ──────────────────────────────────────────────
       Um marcado: o nome. Dois ou mais: `Gian +2`. Tudo (ou, no modo 'todos', o
       vazio que quer dizer tudo): o rótulo de todos. A lista por extenso vai no
       `title`, que é onde cabe sem esticar a régua. */
    function textoRotulo() {
      var m = marcadosOrdenados();
      if (todosMarcados()) return rotTodos;
      if (!m.length) return vazio === 'todos' ? rotTodos : rotNada;
      if (m.length === 1) return curto(m[0]);
      return curto(m[0]) + ' +' + (m.length - 1);
    }
    function textoTitle() {
      var m = marcadosOrdenados();
      if (todosMarcados()) return rot + ': ' + rotTodos;
      if (!m.length) {
        return vazio === 'todos'
          ? rot + ': ' + rotTodos
          : rot + ': ' + rotNada + ' — com nada marcado a lista fica vazia.';
      }
      /* Teto de 25 nomes: com "Todas" numa carteira de trezentos clientes, o
         `title` nativo viraria uma parede de texto que ninguém lê. */
      var nomes = m.slice(0, 25).map(longo);
      if (m.length > 25) nomes.push('… e mais ' + (m.length - 25));
      return rot + ' (' + m.length + '): ' + nomes.join(', ');
    }

    function pintarBotao() {
      var txt = textoRotulo();
      elRot.textContent = txt;
      bt.title = textoTitle();
      /* O nome acessível repete o texto visível e ainda diz DE QUAL filtro se
         trata — sem o prefixo, o leitor de tela anunciaria só "Gian +2, botão". */
      bt.setAttribute('aria-label', rot + ': ' + txt);
      var nada = (vazio === 'nada' && !marcadosOrdenados().length);
      var tudo = todosMarcados() || (vazio === 'todos' && !marcadosOrdenados().length);
      bt.classList.toggle('b4f-nada', nada);
      bt.classList.toggle('b4f-tudo', !!op.todosVerde && tudo && !nada);
    }

    /* ── painel ───────────────────────────────────────────────────────────── */
    function montarPainel() {
      /* Recalculado a cada remontagem: uma lista que cresceu no recarregamento
         ganha o campo sem que ninguém precise recriar o filtro. E se ela encolheu,
         o texto da busca vai embora junto com o campo — senão sobraria um filtro
         invisível escondendo linhas sem jeito de limpar. */
      var temBusca = itens.length > LIMIAR_BUSCA;
      if (!temBusca) busca = '';
      p.innerHTML =
        (temBusca ? '<input type="search" class="b4f-in" autocomplete="off" ' +
                    'placeholder="Buscar…" aria-label="Buscar em ' + esc(rot) + '">' : '') +
        '<label class="b4f-li b4f-todas"><input type="checkbox" class="b4f-all">' +
          '<span class="b4f-tx">' + esc(vazio === 'todos' ? rotTodos : rotTodas) + '</span>' +
          (vazio === 'todos' ? '' : '<span class="b4f-dica">/ Nenhuma</span>') +
        '</label>' +
        '<div class="b4f-lista">' +
          itens.map(function (i) {
            return '<label class="b4f-li" data-v="' + esc(i.v) + '">' +
                   '<input type="checkbox" value="' + esc(i.v) + '">' +
                   '<span class="b4f-tx">' + esc(i.r || i.v) + '</span></label>';
          }).join('') +
        '</div>' +
        '<div class="b4f-vazio" hidden>Nada casa com essa busca.</div>';

      elBusca = p.querySelector('.b4f-in');
      elTodas = p.querySelector('.b4f-all');
      elLista = p.querySelector('.b4f-lista');
      elVazio = p.querySelector('.b4f-vazio');
      if (elBusca) elBusca.value = busca;
      sincronizar();
      aplicarBusca();
    }

    function caixas() {
      return elLista ? [].slice.call(elLista.querySelectorAll('input[type=checkbox]')) : [];
    }
    function sincronizar() {
      caixas().forEach(function (cx) { cx.checked = temMarc(cx.value); });
      if (elTodas) {
        if (vazio === 'todos') {
          /* Aqui a linha de cima quer dizer "sem filtro" — e sem filtro é
             exatamente a seleção vazia. Marcada = nada escolhido = todos. */
          elTodas.indeterminate = false;
          elTodas.checked = !marcadosOrdenados().length;
        } else {
          var n = marcadosOrdenados().length, tot = itens.length;
          elTodas.checked = tot > 0 && n === tot;
          /* `indeterminate` é a propriedade que existe para dizer "parte". Ela não
             tem atributo em HTML e só se acerta por JS — é o motivo de esta linha
             existir em vez de uma terceira classe de CSS inventada. */
          elTodas.indeterminate = n > 0 && n < tot;
        }
      }
    }

    /* A busca só ESCONDE. Ver a regra 3 no topo. */
    function aplicarBusca() {
      if (!elLista) return;
      var q = norm(busca), n = 0;
      [].slice.call(elLista.children).forEach(function (li) {
        var cx = li.querySelector('input');
        var casa = !q || norm((cx ? cx.value : '') + ' ' + li.textContent).indexOf(q) >= 0;
        li.hidden = !casa;
        if (casa) n++;
      });
      if (elVazio) elVazio.hidden = n > 0;
      /* Com busca escrita, a linha "Todas / Nenhuma" sai de cena: ela age sobre a
         lista inteira e estaria ao lado de uma lista filtrada. */
      var linhaTodas = elTodas && elTodas.closest('.b4f-li');
      if (linhaTodas) linhaTodas.hidden = !!q;
    }

    function avisar() {
      if (typeof op.aoMudar === 'function') op.aoMudar(marcadosOrdenados());
    }

    /* ── abrir / fechar ───────────────────────────────────────────────────── */
    function posicionar() {
      /* Medir de verdade, com o painel já visível: `getBoundingClientRect` de nó
         escondido devolve zeros e a conta sairia sempre "cabe". */
      p.style.left = '0px';
      p.style.right = 'auto';
      p.style.maxHeight = '';
      var marg = 10;
      var r = p.getBoundingClientRect();
      var larg = w.innerWidth || d.documentElement.clientWidth || 0;
      if (larg) {
        var passou = r.right - (larg - marg);
        if (passou > 0) {
          var novo = -passou;
          /* Puxar para a esquerda não pode empurrar para fora do outro lado: numa
             tela de 390px o painel é quase a largura toda, e um filtro que fica no
             fim da régua sairia pela borda esquerda. */
          if (r.left - passou < marg) novo += (marg - (r.left - passou));
          p.style.left = Math.round(novo) + 'px';
        }
      }
      var alt = w.innerHeight || d.documentElement.clientHeight || 0;
      if (alt) {
        var rb = bt.getBoundingClientRect();
        var espaco = alt - rb.bottom - 16;
        p.style.maxHeight = Math.max(150, Math.min(340, espaco)) + 'px';
      }
    }

    function abrir() {
      if (aberto) return;
      fecharTodos(inst);                 // um painel de cada vez na régua
      aberto = true;
      p.hidden = false;
      bt.setAttribute('aria-expanded', 'true');
      ABERTOS.push(inst);
      posicionar();
    }
    function fechar(devolveFoco) {
      if (!aberto) return;
      aberto = false;
      p.hidden = true;
      bt.setAttribute('aria-expanded', 'false');
      var i = ABERTOS.indexOf(inst);
      if (i >= 0) ABERTOS.splice(i, 1);
      if (devolveFoco) bt.focus();
    }

    /* ── eventos ──────────────────────────────────────────────────────────── */
    bt.addEventListener('click', function () { if (aberto) fechar(false); else abrir(); });

    p.addEventListener('change', function (e) {
      var cx = e.target;
      if (!cx || cx.type !== 'checkbox') return;
      if (cx === elTodas) {
        if (vazio === 'todos') {
          /* "Todos os clientes" é a seleção VAZIA. Marcar limpa. Desmarcar não tem
             para onde ir — não existe estado entre "todos" e "todos" —, então a
             marca volta e nada muda: quem quer estreitar marca um cliente da lista
             abaixo. É o preço de vazio querer dizer todos, e é preço pequeno perto
             de pedir para marcar trezentos clientes. */
          var tinha = marc.length > 0;
          elTodas.checked = true;
          if (!tinha) return;
          marc = [];
        } else {
          marc = cx.checked ? itens.map(function (i) { return String(i.v); }) : [];
        }
      } else {
        var v = String(cx.value);
        if (cx.checked) { if (marc.indexOf(v) < 0) marc.push(v); }
        else marc = marc.filter(function (x) { return x !== v; });
      }
      sincronizar();
      pintarBotao();
      avisar();                          // aplica na hora — ver regra 4 no topo
    });

    /* Sempre ligado: o campo pode nascer numa remontagem futura, e um ouvinte que
       só existisse quando ele existe teria de ser religado junto. */
    p.addEventListener('input', function (e) {
      if (!elBusca || e.target !== elBusca) return;
      busca = elBusca.value;
      aplicarBusca();
    });

    no.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (!aberto) return;
        e.preventDefault();
        e.stopPropagation();            // Esc aqui não é o Esc da página
        fechar(true);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!aberto) {
          if (e.key === 'ArrowDown' && e.target === bt) { e.preventDefault(); abrir(); focar(0); }
          return;
        }
        /* Fora da lista (no botão ou no campo de busca) a seta entra por uma das
           pontas: para baixo, o primeiro; para cima, o último. */
        var lista = focaveis();
        var i = lista.indexOf(d.activeElement);
        e.preventDefault();
        if (e.key === 'ArrowDown') focarNo(lista, i + 1);
        else focarNo(lista, i < 0 ? lista.length - 1 : i - 1);
      }
    });

    /* Tab para fora fecha. O `setTimeout` existe porque no `focusout` o foco ainda
       não chegou ao próximo elemento em todos os navegadores — perguntar antes da
       hora fecharia o painel ao andar de um checkbox para o outro. */
    no.addEventListener('focusout', function () {
      w.setTimeout(function () {
        if (aberto && !no.contains(d.activeElement)) fechar(false);
      }, 0);
    });

    function focaveis() {
      var out = [];
      [].slice.call(p.querySelectorAll('input[type=checkbox]')).forEach(function (cx) {
        var li = cx.parentNode;
        if (li && li.hidden) return;
        out.push(cx);
      });
      return out;
    }
    function focarNo(lista, i) {
      if (!lista.length) return;
      if (i < 0) i = lista.length - 1;
      if (i >= lista.length) i = 0;
      lista[i].focus();
    }
    function focar(i) { focarNo(focaveis(), i); }

    /* ── a instância ──────────────────────────────────────────────────────── */
    var inst = {
      no: no,
      bt: bt,
      painel: p,
      /** Sem argumento lê; com um vetor, escreve. Escrever NÃO chama `aoMudar`:
       *  quem escreveu já sabe o que escreveu, e avisar de volta faria o laço
       *  "estado muda -> avisa -> estado muda". */
      marcados: function (arr) {
        if (arr === undefined) return marcadosOrdenados();
        marc = (arr || []).map(String);
        sincronizar();
        pintarBotao();
        return inst;
      },
      /** Troca a lista. Marcado que não existe mais continua guardado (ver
       *  `marcadosOrdenados`) — recarregar a tela não pode apagar filtro. */
      itens: function (arr) {
        if (arr === undefined) return itens.slice();
        itens = (arr || []).map(function (i) {
          return (i && typeof i === 'object') ? i : { v: i, r: String(i) };
        });
        montarPainel();
        pintarBotao();
        return inst;
      },
      abrir: function () { abrir(); return inst; },
      fechar: function () { fechar(false); return inst; },
      aberto: function () { return aberto; },
      repintar: function () { sincronizar(); pintarBotao(); return inst; },
      destruir: function () {
        fechar(false);
        if (no.parentNode) no.parentNode.removeChild(no);
        return inst;
      }
    };
    inst._fechar = fechar;

    inst.itens(op.itens || []);
    inst.marcados(op.marcados || []);
    return inst;
  }

  w.B4UFiltro = {
    criar: criar,
    fecharTodos: function () { fecharTodos(null); }
  };
})(window, document);
