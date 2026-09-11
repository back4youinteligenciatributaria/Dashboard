/**
 * b4u-campo.js — o desenho de um VALOR conforme o TIPO da variável.
 *
 * POR QUE ESTE ARQUIVO EXISTE (11/09/2026)
 * O recorte do Registro e a ficha do cliente desenhavam o mesmo dado de dois
 * jeitos, e os dois deixavam digitar qualquer coisa em qualquer coluna: texto
 * livre numa lista (e a lista virava "Protocolado", "PROTOCOLADO" e
 * "protocolado"), letra num campo de valor, e um clique numa coluna calculada
 * que parecia editável e não gravava. O pedido do dono foi:
 *
 *   1. coluna com opções só oferece AS OPÇÕES — ou "+ Adicionar opção", que
 *      registra a opção nova (com cor) para todo mundo;
 *   2. cada opção é uma CAIXINHA COLORIDA com o texto em negrito, e a cor é
 *      pela posição, a mesma sequência para todas as variáveis (1ª amarela,
 *      2ª azul…), com o texto branco ou preto conforme o contraste;
 *   3. fórmula não se clica, número só aceita número, texto longo quebra linha.
 *
 * Um arquivo só, porque as duas telas precisam responder à MESMA pergunta com
 * a MESMA cara — duas cópias divergiriam na primeira cor nova.
 *
 * O servidor manda, por coluna: tipo, opções e as cores GRAVADAS (aba
 * Variáveis, coluna "Cores"). Opção sem cor gravada leva a cor da sua posição.
 * Valor que está na célula e não está na lista aparece com borda tracejada:
 * é dado real, não pode sumir da tela — mas também não é uma opção.
 *
 *   <script src="b4u-campo.js" charset="utf-8"></script>
 *
 *   B4UCampo.chip('Aprovado', '#F5C518')              -> html da caixinha
 *   B4UCampo.cor(opcoes, cores, valor)                -> '#hex' | ''
 *   B4UCampo.abrir(botao, { valor, opcoes, cores, multi, podeAdicionar,
 *                           titulo, aoEscolher(v), aoAdicionar(op, hex) })
 *   B4UCampo.abrirTexto(botao, { titulo, valor, editavel, aoSalvar(v) })
 *   B4UCampo.num.mostrar(v, 'dinheiro') · .paraPlanilha(txt) · .limpar(txt)
 */
(function () {
  'use strict';

  /* A paleta. A MESMA do servidor (VAR_CORES, 4_Telas.gs) — ela vem no payload
     e substitui esta; a cópia daqui só existe para a tela não ficar sem cor se
     o servidor for de antes de 11/09/2026. */
  var PALETA = [
    ['amarelo','#F5C518'],['azul','#2F6FDE'],['verde','#2E9E5B'],['vermelho','#D64545'],
    ['roxo','#8354D0'],['laranja','#F08A24'],['turquesa','#17A2B8'],['rosa','#E0569B'],
    ['marrom','#8B5E3C'],['cinza','#7A869A'],['lima','#9BCB3C'],['azul-marinho','#1F3A93'],
    ['vinho','#8E2446'],['dourado','#C9A227'],['menta','#5ED3B0'],['salmão','#F4907A'],
    ['lavanda','#B39DDB'],['petróleo','#0E6E73'],['oliva','#7D8B2E'],['grafite','#3D4451']
  ].map(function (x) { return { nome: x[0], hex: x[1] }; });

  var SEP = ' · ';
  var SEP_RE = /\s*[·;\n]\s*/;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function chave(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function setPaleta(p) {
    if (Array.isArray(p) && p.length && p[0] && p[0].hex) PALETA = p.slice();
  }
  function daPosicao(i) { return PALETA[((i % PALETA.length) + PALETA.length) % PALETA.length].hex; }

  /* Texto branco ou preto: o que tiver MAIS contraste com o fundo (WCAG).
     Não é gosto: amarelo com texto branco não se lê, azul-marinho com preto
     também não. */
  function lum(hex) {
    var m = String(hex || '').match(/^#?([0-9a-f]{6})$/i);
    if (!m) return 1;
    var n = parseInt(m[1], 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function texto(hex) {
    var L = lum(hex);
    return ((L + 0.05) / 0.05) >= (1.05 / (L + 0.05)) ? '#161616' : '#FFFFFF';
  }

  /** A cor de `valor` na lista: a gravada, ou a da posição. '' = fora da lista. */
  function cor(opcoes, cores, valor) {
    var v = String(valor == null ? '' : valor).trim();
    if (!v) return '';
    var ops = opcoes || [], cs = cores || {};
    if (cs[v]) return cs[v];
    var k = chave(v);
    for (var i = 0; i < ops.length; i++) {
      if (chave(ops[i]) === k) return cs[ops[i]] || daPosicao(i);
    }
    return '';
  }

  /** A caixinha. `hex` vazio = valor fora da lista (borda tracejada). */
  function chip(valor, hex, extra) {
    var v = String(valor == null ? '' : valor);
    if (!v) return '';
    if (!hex) return '<span class="b4c-chip b4c-fora' + (extra ? ' ' + extra : '') +
                     '" title="Fora da lista de opções">' + esc(v) + '</span>';
    return '<span class="b4c-chip' + (extra ? ' ' + extra : '') + '" style="--c:' + hex + ';--t:' + texto(hex) +
           '" title="' + esc(v) + '">' + esc(v) + '</span>';
  }
  function partes(v) {
    return String(v == null ? '' : v).split(SEP_RE).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  /** Um valor (ou vários, em lista múltipla) como caixinhas. */
  function chips(valor, opcoes, cores, multi) {
    var ps = multi ? partes(valor) : (String(valor == null ? '' : valor).trim() ? [String(valor).trim()] : []);
    return ps.map(function (p) { return chip(p, cor(opcoes, cores, p)); }).join('');
  }

  /* ──────────────────────────── NÚMEROS ────────────────────────────
     O que a pessoa digita é português ("1.234,56"). O que viaja para o
     servidor é o canônico SEM milhar e com vírgula ("1234,56") — o servidor
     (_numDoTexto_, 3_Motor) grava NÚMERO na célula. O que volta da planilha é
     o número do JavaScript ("1234.56"). As três formas são lidas pela mesma
     regra dos dois lados: com vírgula, o ponto é milhar; só pontos em grupos
     de três também são milhar; ponto sozinho é decimal. */
  function numLer(s) {
    var t = String(s == null ? '' : s).replace(/R\$|\s/g, '').trim();
    if (!t || !/^-?[\d.,]+$/.test(t)) return null;
    var n;
    if (/^-?\d+(,\d+)?$/.test(t) || /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t))
      n = Number(t.replace(/\./g, '').replace(',', '.'));
    else if (/^-?\d+\.\d+$/.test(t)) n = Number(t);
    else return null;
    return isFinite(n) ? n : null;
  }
  var num = {
    /* Enquanto digita: só algarismo, vírgula, ponto e o sinal na frente. */
    limpar: function (s) {
      var t = String(s == null ? '' : s).replace(/[^\d.,-]/g, '');
      return t.charAt(0) === '-' ? '-' + t.slice(1).replace(/-/g, '') : t.replace(/-/g, '');
    },
    /* Zero à esquerda é CÓDIGO (CNAE, CNES): passa como foi digitado. */
    ehCodigo: function (s) { return /^-?0\d/.test(String(s || '').trim()); },
    /** -> { ok, v } ; v é o que vai para a planilha. Vazio é válido (apagar). */
    paraPlanilha: function (s) {
      var t = String(s == null ? '' : s).trim();
      if (!t) return { ok: true, v: '' };
      if (num.ehCodigo(t) && /^\d+$/.test(t)) return { ok: true, v: t };
      var n = numLer(t);
      if (n === null) return { ok: false, v: t };
      return { ok: true, v: String(n).replace('.', ',') };
    },
    /** Para LER: 1.234,56 · R$ 1.234,56. O que não for número sai como veio. */
    mostrar: function (v, tipo) {
      var t = String(v == null ? '' : v).trim();
      if (!t || num.ehCodigo(t)) return t;
      var n = numLer(t);
      if (n === null) return t;
      if (tipo === 'dinheiro') {
        return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return n.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
    },
    ler: numLer
  };

  /* ──────────────────────────── CSS ──────────────────────────── */
  var CSS = [
    '.b4c-chip{display:inline-block;max-width:100%;box-sizing:border-box;padding:2px 9px;border-radius:6px;',
    ' background:var(--c,#7A869A);color:var(--t,#fff);font-weight:800;font-size:12px;line-height:18px;',
    ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;letter-spacing:.01em}',
    '.b4c-chip.b4c-fora{background:transparent;color:var(--ink,#113D39);border:1px dashed #9AA0A6;font-weight:700;padding:1px 8px}',
    '.b4c-chips{display:flex;flex-wrap:wrap;gap:4px;align-items:center;min-width:0}',
    /* A célula-botão: parece valor, não formulário. O ▾ só aparece no hover. */
    '.b4c-cel{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;min-width:0;min-height:26px;',
    ' padding:2px 4px;border:1px solid transparent;border-radius:var(--radius-sm,6px);cursor:pointer;font:inherit}',
    '.b4c-cel:hover{border-color:var(--line,#E4D9C9);background:var(--surface,#fff)}',
    '.b4c-cel:focus-visible{outline:none;border-color:var(--brand-teal,#0F8C85);box-shadow:0 0 0 2px rgba(15,140,133,.18)}',
    '.b4c-cel .b4c-seta{margin-left:auto;flex:none;color:var(--muted,#6E6256);opacity:0;font-size:11px}',
    '.b4c-cel:hover .b4c-seta,.b4c-cel:focus-visible .b4c-seta{opacity:1}',
    '.b4c-cel .b4c-nada{color:var(--muted,#6E6256);opacity:.7}',
    '.b4c-cel .b4c-chips{flex:1;overflow:hidden}',
    '.b4c-cel.b4c-ro{cursor:default}.b4c-cel.b4c-ro:hover{border-color:transparent;background:none}',
    /* Fórmula: não é campo, é resultado. Sem borda, sem cursor de texto. */
    '.b4c-fx{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:100%;color:var(--ink,#113D39);cursor:default;user-select:text}',
    '.b4c-fx i{flex:none;font-style:italic;font-weight:800;font-size:10px;color:var(--muted,#6E6256);',
    ' border:1px solid var(--line,#E4D9C9);border-radius:4px;padding:0 4px;line-height:15px;font-family:Georgia,serif}',
    '.b4c-fx span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    /* Número: alinhado à direita, como se lê coluna de valor. */
    'input.b4c-num{text-align:right;font-variant-numeric:tabular-nums}',
    '.b4c-numro{display:block;text-align:right;font-variant-numeric:tabular-nums}',
    'input.b4c-num.b4c-ruim{border-color:#D64545!important;background:#FFF4F4!important}',
    '.b4c-numbox{position:relative;display:block;width:100%}',
    '.b4c-numbox .b4c-rs{position:absolute;left:7px;top:50%;transform:translateY(-50%);color:var(--muted,#6E6256);font-size:11px;font-weight:700;pointer-events:none}',
    '.b4c-numbox input.b4c-num{padding-left:26px}',
    /* Texto longo: quebra até 3 linhas; clicando abre inteiro. */
    '.b4c-longo{all:unset;box-sizing:border-box;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;',
    ' overflow:hidden;white-space:pre-wrap;word-break:break-word;line-height:1.35;width:100%;min-height:20px;',
    ' padding:3px 6px;border:1px solid transparent;border-radius:var(--radius-sm,6px);cursor:pointer;font:inherit;color:var(--ink,#113D39)}',
    '.b4c-longo:hover{border-color:var(--line,#E4D9C9);background:var(--surface,#fff)}',
    '.b4c-longo:focus-visible{outline:none;border-color:var(--brand-teal,#0F8C85)}',
    '.b4c-longo.b4c-nada{color:var(--muted,#6E6256)}',
    /* O menu flutuante. */
    '.b4c-pop{position:fixed;z-index:9999;min-width:220px;max-width:min(360px,calc(100vw - 16px));background:#fff;',
    ' border:1px solid var(--line,#E4D9C9);border-radius:10px;box-shadow:0 12px 32px rgba(17,61,57,.18);',
    ' font-family:var(--sans,system-ui,sans-serif);font-size:13px;color:var(--ink,#113D39);display:flex;flex-direction:column;overflow:hidden}',
    '.b4c-pop .b4c-tit{padding:8px 12px 4px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#6E6256)}',
    '.b4c-pop .b4c-busca{margin:4px 10px 6px;padding:6px 8px;border:1px solid var(--line,#E4D9C9);border-radius:6px;font:inherit}',
    '.b4c-pop .b4c-lista{overflow:auto;max-height:260px;padding:2px 6px 6px}',
    '.b4c-op{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;padding:5px 6px;border-radius:6px;cursor:pointer}',
    '.b4c-op:hover,.b4c-op:focus-visible{background:var(--surface-warm,#F6F1EA);outline:none}',
    '.b4c-op .b4c-ok{flex:none;width:16px;text-align:center;font-weight:900;color:var(--brand-teal,#0F8C85)}',
    '.b4c-op .b4c-chip{white-space:normal}',
    '.b4c-op.b4c-limpa{color:var(--muted,#6E6256);font-style:italic}',
    '.b4c-pe{border-top:1px solid var(--line,#E4D9C9);padding:6px;display:flex;flex-direction:column;gap:6px}',
    '.b4c-pe .b4c-add{all:unset;cursor:pointer;padding:6px 8px;border-radius:6px;font-weight:800;color:var(--brand-teal,#0F8C85)}',
    '.b4c-pe .b4c-add:hover{background:var(--surface-warm,#F6F1EA)}',
    '.b4c-form{display:flex;flex-direction:column;gap:8px;padding:4px 6px}',
    '.b4c-form input[type=text]{padding:6px 8px;border:1px solid var(--line,#E4D9C9);border-radius:6px;font:inherit}',
    '.b4c-sw{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}',
    '.b4c-sw button{all:unset;cursor:pointer;aspect-ratio:1;border-radius:5px;background:var(--c);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}',
    '.b4c-sw button[aria-pressed=true]{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ink,#113D39)}',
    '.b4c-form .b4c-prev{display:flex;align-items:center;gap:8px;color:var(--muted,#6E6256);font-size:12px;min-height:22px}',
    '.b4c-form .b4c-bts{display:flex;gap:6px;justify-content:flex-end}',
    '.b4c-form .b4c-bts button,.b4c-pe .b4c-pronto,.b4c-txt .b4c-bts button{font:inherit;font-weight:800;padding:6px 12px;border-radius:6px;cursor:pointer;border:1px solid var(--line,#E4D9C9);background:#fff;color:var(--ink,#113D39)}',
    '.b4c-form .b4c-bts .b4c-pri,.b4c-pe .b4c-pronto,.b4c-txt .b4c-bts .b4c-pri{background:var(--brand-teal,#0F8C85);border-color:var(--brand-teal,#0F8C85);color:#fff}',
    '.b4c-form .b4c-erro{color:#B42318;font-size:12px}',
    '.b4c-pop.b4c-txt{width:min(560px,calc(100vw - 16px));max-width:none}',
    '.b4c-txt textarea{margin:4px 10px;min-height:160px;max-height:60vh;padding:8px;border:1px solid var(--line,#E4D9C9);border-radius:6px;font:inherit;line-height:1.45;resize:vertical}',
    '.b4c-txt .b4c-ler{margin:4px 12px 8px;max-height:60vh;overflow:auto;white-space:pre-wrap;word-break:break-word;line-height:1.45}',
    '.b4c-txt .b4c-bts{display:flex;gap:6px;justify-content:flex-end;padding:6px 10px 10px}'
  ].join('\n');
  function css() {
    if (document.getElementById('b4c-css')) return;
    var st = document.createElement('style'); st.id = 'b4c-css'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', css); else css();

  /* ──────────────────────────── O MENU FLUTUANTE ──────────────────────────── */
  var POP = null;
  function fechar(aplicar) {
    if (!POP) return;
    var p = POP; POP = null;
    document.removeEventListener('pointerdown', foraClique, true);
    document.removeEventListener('keydown', teclas, true);
    window.removeEventListener('resize', fecharJa, true);
    if (p.no.parentNode) p.no.parentNode.removeChild(p.no);
    if (aplicar && p._aoFechar) p._aoFechar();
    if (p.ancora && p.ancora.focus && document.contains(p.ancora)) { try { p.ancora.focus({ preventScroll: true }); } catch (e) {} }
  }
  function fecharJa() { fechar(true); }
  function foraClique(e) {
    if (!POP) return;
    if (POP.no.contains(e.target) || (POP.ancora && POP.ancora.contains(e.target))) return;
    fechar(true);
  }
  function teclas(e) {
    if (!POP) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var ops = Array.prototype.slice.call(POP.no.querySelectorAll('.b4c-op'));
      if (!ops.length) return;
      var i = ops.indexOf(document.activeElement);
      i = e.key === 'ArrowDown' ? Math.min(ops.length - 1, i + 1) : Math.max(0, i - 1);
      ops[i].focus(); e.preventDefault();
    }
  }
  function posicionar(no, ancora) {
    var r = ancora.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    no.style.visibility = 'hidden'; no.style.left = '0px'; no.style.top = '0px';
    var w = no.offsetWidth, h = no.offsetHeight;
    var left = Math.min(Math.max(8, r.left), vw - w - 8);
    var top = r.bottom + 4;
    if (top + h > vh - 8 && r.top - h - 4 > 8) top = r.top - h - 4;
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    no.style.left = left + 'px'; no.style.top = top + 'px'; no.style.visibility = '';
  }
  function montar(ancora, cls) {
    fechar(true);
    css();
    var no = document.createElement('div');
    no.className = 'b4c-pop' + (cls ? ' ' + cls : '');
    no.setAttribute('role', 'dialog');
    document.body.appendChild(no);
    POP = { no: no, ancora: ancora };
    setTimeout(function () {
      document.addEventListener('pointerdown', foraClique, true);
      document.addEventListener('keydown', teclas, true);
      window.addEventListener('resize', fecharJa, true);
    }, 0);
    return POP;
  }
  function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); }

  /**
   * O seletor de opções. cfg:
   *   valor, opcoes[], cores{}, multi, titulo, podeAdicionar,
   *   aoEscolher(novoValor)            — o valor final (multi: unido por " · ")
   *   aoAdicionar(opcao, hex) -> Promise<{opcoes, cores, opcao}>   (grava no servidor)
   */
  function abrir(ancora, cfg) {
    var P = montar(ancora);
    var no = P.no;
    var opcoes = (cfg.opcoes || []).slice(), cores = Object.assign({}, cfg.cores || {});
    var multi = !!cfg.multi;
    var marcados = multi ? partes(cfg.valor) : [];
    var atual = multi ? '' : String(cfg.valor == null ? '' : cfg.valor).trim();
    var busca = '', adicionando = false, corNova = '', erro = '', gravando = false;
    var original = multi ? marcados.join(SEP) : atual;

    /* Em lista múltipla a escolha vale ao FECHAR (clique fora, "Pronto"): uma
       gravação por caixa marcada seria barulho. Esc desiste. */
    if (multi) P._aoFechar = function () {
      var v = marcados.join(SEP);
      if (v !== original && cfg.aoEscolher) cfg.aoEscolher(v);
    };

    function fora(v) { return v && !opcoes.some(function (o) { return chave(o) === chave(v); }); }

    function pintar() {
      var t = chave(busca);
      var lista = opcoes.slice();
      /* O valor que está na célula e não está na lista continua aparecendo
         (marcado), senão ele sumiria da escolha sem ninguém ter escolhido. */
      if (!multi && fora(atual)) lista.unshift(atual);
      if (multi) marcados.forEach(function (m) { if (fora(m) && lista.indexOf(m) < 0) lista.unshift(m); });
      var vis = adicionando ? lista : lista.filter(function (o) { return !t || chave(o).indexOf(t) > -1; });
      var h = '';
      if (cfg.titulo) h += '<div class="b4c-tit">' + esc(cfg.titulo) + '</div>';
      if (lista.length > 7 && !adicionando) h += '<input class="b4c-busca" type="search" placeholder="Buscar opção…" value="' + esc(busca) + '">';
      h += '<div class="b4c-lista" role="listbox"' + (multi ? ' aria-multiselectable="true"' : '') + '>';
      if (!multi && atual) h += '<button type="button" class="b4c-op b4c-limpa" data-limpa="1"><span class="b4c-ok"></span>— deixar em branco</button>';
      vis.forEach(function (o) {
        var sel = multi ? marcados.some(function (m) { return chave(m) === chave(o); }) : chave(o) === chave(atual);
        h += '<button type="button" class="b4c-op" role="option" aria-selected="' + sel + '" data-op="' + esc(o) + '">' +
             '<span class="b4c-ok">' + (sel ? '✓' : '') + '</span>' + chip(o, cor(opcoes, cores, o)) + '</button>';
      });
      if (!vis.length) h += '<div style="padding:8px;color:var(--muted,#6E6256)">' +
        (lista.length ? 'Nenhuma opção com esse texto.' : 'Esta coluna ainda não tem opções.') + '</div>';
      h += '</div>';
      var pe = '';
      if (cfg.podeAdicionar) {
        if (!adicionando) {
          pe += '<button type="button" class="b4c-add" data-add="1">＋ Adicionar opção</button>';
        } else {
          if (!corNova) corNova = daPosicao(opcoes.length);
          pe += '<div class="b4c-form">' +
            '<input type="text" maxlength="80" class="b4c-novo" placeholder="Nome da opção nova" value="' + esc(busca) + '">' +
            '<div class="b4c-sw">' + PALETA.map(function (c) {
              return '<button type="button" data-cor="' + c.hex + '" style="--c:' + c.hex + '" title="' + esc(c.nome) +
                     '" aria-label="' + esc(c.nome) + '" aria-pressed="' + (c.hex === corNova) + '"></button>';
            }).join('') + '</div>' +
            '<div class="b4c-prev">Vai ficar assim: <span class="b4c-prevchip">' + chip(busca || 'Opção nova', corNova) + '</span></div>' +
            (erro ? '<div class="b4c-erro">' + esc(erro) + '</div>' : '') +
            '<div class="b4c-bts"><button type="button" data-cancela="1">Cancelar</button>' +
            '<button type="button" class="b4c-pri" data-grava="1"' + (gravando ? ' disabled' : '') + '>' +
            (gravando ? 'Gravando…' : 'Adicionar') + '</button></div></div>';
        }
      }
      if (multi && !adicionando) pe += '<button type="button" class="b4c-pronto" data-pronto="1">Pronto</button>';
      if (pe) h += '<div class="b4c-pe">' + pe + '</div>';
      var rol = no.querySelector('.b4c-lista'); var y = rol ? rol.scrollTop : 0;
      no.innerHTML = h;
      var rol2 = no.querySelector('.b4c-lista'); if (rol2) rol2.scrollTop = y;
      posicionar(no, ancora);
    }

    no.addEventListener('input', function (e) {
      if (e.target.classList.contains('b4c-busca')) {
        busca = e.target.value; var pos = e.target.selectionStart; pintar();
        var b = no.querySelector('.b4c-busca'); if (b) { b.focus(); try { b.setSelectionRange(pos, pos); } catch (x) {} }
      } else if (e.target.classList.contains('b4c-novo')) {
        busca = e.target.value;
        var pv = no.querySelector('.b4c-prevchip'); if (pv) pv.innerHTML = chip(busca || 'Opção nova', corNova);
      }
    });
    no.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.classList.contains('b4c-novo')) { e.preventDefault(); gravar(); }
    });
    no.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !no.contains(b)) return;
      if (b.hasAttribute('data-op')) {
        var o = b.getAttribute('data-op');
        if (multi) {
          var i = -1;
          marcados.forEach(function (m, j) { if (chave(m) === chave(o)) i = j; });
          if (i > -1) marcados.splice(i, 1); else marcados.push(o);
          pintar();
          var bb = no.querySelector('[data-op="' + cssEsc(o) + '"]'); if (bb) bb.focus();
        } else {
          fechar(false);
          if (o !== atual && cfg.aoEscolher) cfg.aoEscolher(o);
        }
      } else if (b.hasAttribute('data-limpa')) {
        fechar(false); if (cfg.aoEscolher) cfg.aoEscolher('');
      } else if (b.hasAttribute('data-add')) {
        adicionando = true; erro = ''; pintar();
        var n = no.querySelector('.b4c-novo'); if (n) n.focus();
      } else if (b.hasAttribute('data-cor')) {
        corNova = b.getAttribute('data-cor');
        no.querySelectorAll('[data-cor]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var pv = no.querySelector('.b4c-prevchip'); if (pv) pv.innerHTML = chip(busca || 'Opção nova', corNova);
      } else if (b.hasAttribute('data-cancela')) {
        adicionando = false; erro = ''; busca = ''; pintar();
      } else if (b.hasAttribute('data-grava')) {
        gravar();
      } else if (b.hasAttribute('data-pronto')) {
        fechar(true);
      }
    });

    function gravar() {
      if (gravando) return;
      var op = String(busca || '').replace(/\s+/g, ' ').trim();
      if (!op) { erro = 'Escreva o nome da opção.'; return pintar(); }
      if (/[·;\n]/.test(op)) { erro = 'A opção não pode ter "·" nem ";" — são os separadores da lista.'; return pintar(); }
      gravando = true; erro = ''; pintar();
      Promise.resolve(cfg.aoAdicionar ? cfg.aoAdicionar(op, corNova) : { opcoes: opcoes.concat(op), cores: cores, opcao: op })
        .then(function (r) {
          gravando = false;
          if (!POP || POP.no !== no) return;
          if (r && r.opcoes) opcoes = r.opcoes.slice();
          if (r && r.cores) cores = Object.assign({}, r.cores);
          escolherNova((r && r.opcao) || op);
        })
        .catch(function (e) {
          gravando = false;
          if (!POP || POP.no !== no) return;
          erro = String((e && e.message) || e || 'Não consegui gravar a opção.'); pintar();
        });
    }
    function escolherNova(op) {
      adicionando = false; busca = ''; corNova = '';
      if (multi) { if (!marcados.some(function (m) { return chave(m) === chave(op); })) marcados.push(op); pintar(); }
      else { fechar(false); if (cfg.aoEscolher) cfg.aoEscolher(op); }
    }

    pintar();
    var foco = no.querySelector('.b4c-busca') || no.querySelector('.b4c-op[aria-selected="true"]') || no.querySelector('.b4c-op');
    if (foco) try { foco.focus({ preventScroll: true }); } catch (e) {}
    return P;
  }

  /** Texto longo, inteiro: para ler, ou para editar (Salvar / Cancelar). */
  function abrirTexto(ancora, cfg) {
    var P = montar(ancora, 'b4c-txt');
    var no = P.no;
    var v = String(cfg.valor == null ? '' : cfg.valor);
    no.innerHTML = (cfg.titulo ? '<div class="b4c-tit">' + esc(cfg.titulo) + '</div>' : '') +
      (cfg.editavel
        ? '<textarea class="b4c-area">' + esc(v) + '</textarea>' +
          '<div class="b4c-bts"><button type="button" data-cancela="1">Cancelar</button>' +
          '<button type="button" class="b4c-pri" data-grava="1">Salvar</button></div>'
        : '<div class="b4c-ler">' + (v ? esc(v) : '<i style="color:var(--muted,#6E6256)">em branco</i>') + '</div>' +
          '<div class="b4c-bts"><button type="button" data-cancela="1">Fechar</button></div>');
    posicionar(no, ancora);
    var ta = no.querySelector('textarea');
    /* Clicar fora SALVA (o que se digitou não se perde por um clique errado);
       Esc e Cancelar desistem. */
    if (ta) P._aoFechar = function () { var n = ta.value; if (n !== v && cfg.aoSalvar) cfg.aoSalvar(n); };
    no.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-grava')) fechar(true);
      else if (b.hasAttribute('data-cancela')) fechar(false);
    });
    no.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); fechar(true); }
    });
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    return P;
  }

  window.B4UCampo = {
    get PALETA() { return PALETA; },
    setPaleta: setPaleta, daPosicao: daPosicao, texto: texto, cor: cor,
    chip: chip, chips: chips, partes: partes, esc: esc, chave: chave,
    abrir: abrir, abrirTexto: abrirTexto, fechar: fechar, num: num, SEP: SEP
  };
})();
