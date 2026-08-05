/**
 * b4u-espera.js — a tela de espera do painel, num lugar só.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * A primeira abertura do dia leva de 15 a 45 segundos, e o que a pessoa via era
 * uma frase parada que trocava de texto de vez em quando — inclusive frases que
 * diziam "está demorando mais que o normal" e "ainda estou buscando". Ler isso
 * durante a espera não acalma: assusta, e faz recarregar a página justamente
 * quando a resposta já estava a caminho.
 *
 * Agora existe uma coisa só se mexendo na tela, com progresso visível. O número
 * nunca trava e nunca mente: ele sobe rápido no começo e vai desacelerando,
 * chegando perto de 90% por volta dos 30s sem NUNCA bater 100% sozinho. Os 100%
 * só acontecem quando o dado realmente chegou — e aí a barra acelera até o fim,
 * que é o momento que dá a sensação de "acabou".
 *
 * COMO USAR
 *   <script src="b4u-espera.js"></script>            (depois do config.js)
 *   <body data-b4u-espera="cliente">                  (ou "equipe")
 *
 *   Com o atributo no <body>, a espera começa sozinha ao abrir a página.
 *   Quando o conteúdo estiver pintado:   B4UEspera.concluir();
 *   Se der erro:                         B4UEspera.telaErro(document.getElementById('app'));
 *
 * É UM OVERLAY, DE PROPÓSITO
 * Fica por cima de tudo em position:fixed. Assim a página pinta o conteúdo real
 * por baixo enquanto a barra corre até 100%, e o overlay some revelando a tela
 * pronta — sem somar um milissegundo de espera de verdade.
 *
 * SE ESTE ARQUIVO NÃO CARREGAR
 * Nada quebra: todas as chamadas nas páginas são protegidas por `window.B4UEspera &&`.
 * A página volta a se comportar como antes, sem a tela de espera.
 */
(function (w, d) {
  'use strict';
  if (w.B4UEspera) return;

  /* ------------------------------------------------------------------ *
   * Texto
   * ------------------------------------------------------------------ */

  /* A ÚNICA mensagem de erro do painel. Nada de código, nome de arquivo, nome de
     aba, status HTTP ou texto de exceção: isso é vocabulário nosso, não do cliente,
     e na tela dele só gera medo e ligação para o atendimento. */
  var ERRO_TITULO = 'Não conseguimos carregar as informações';
  var ERRO_TEXTO  = 'Houve um erro ao recuperar as informações. Tente novamente em '
                  + 'alguns minutos. Se o problema continuar, entre em contato com '
                  + 'o atendimento.';

  /* Frases que passam a sensação de trabalho acontecendo. Nenhuma delas fala em
     lentidão, em tentar de novo ou em problema — quem lê "está demorando" entende
     "vai dar errado" e recarrega. */
  var FRASES = {
    cliente: [
      'Abrindo as suas planilhas…',
      'Conferindo o que fechou no mês…',
      'Somando as notas com calma…',
      'Separando tudo por área…',
      'Arrumando a mesa antes de te mostrar…',
      'Dando o último pente-fino…'
    ],
    equipe: [
      'Puxando as planilhas…',
      'Cruzando as competências…',
      'Conferindo as pendências…',
      'Somando o que ainda falta…',
      'Organizando a lista…',
      'Dando o último pente-fino…'
    ]
  };

  /* ------------------------------------------------------------------ *
   * Ajustes
   * ------------------------------------------------------------------ */
  var CFG = {
    estimativa: 30000,   // quanto costuma levar; molda a curva, não é prazo
    teto:       0.965,   // sozinha a barra nunca passa daqui
    troca:      3400,    // de quanto em quanto tempo a frase muda
    rush:       420,     // corrida final até 100% quando o dado chega
    saida:      340,     // desaparecimento do overlay
    semRush:    25000,   // acima disso, some na hora: já esperou demais
    seguranca:  120000   // trava de segurança — nunca deixar alguém preso atrás do overlay
  };

  var CSS = [
    '.b4e-ov{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;',
    'justify-content:center;background:var(--canvas,#F1E7DC);',
    'font-family:var(--sans,"Montserrat",system-ui,-apple-system,sans-serif);',
    'opacity:1;transition:opacity .34s ease,transform .34s ease}',
    '.b4e-ov.b4e-saindo{opacity:0;transform:scale(1.015);pointer-events:none}',
    '.b4e-cx{width:min(340px,86vw);text-align:center;padding:0 12px}',
    '.b4e-marca{font-weight:800;font-size:22px;letter-spacing:-.02em;margin-bottom:26px}',
    '.b4e-marca .b{color:var(--brand-dark,#073034)}.b4e-marca .y{color:var(--brand-teal,#0F8C85)}',
    '.b4e-pista{position:relative;height:9px;border-radius:999px;',
    'background:rgba(17,61,57,.10);overflow:visible;margin:34px 0 0}',
    '.b4e-trilho{position:absolute;inset:0;border-radius:999px;overflow:hidden}',
    '.b4e-fill{height:100%;width:0;border-radius:999px;',
    'background:linear-gradient(90deg,var(--brand-dark,#073034),var(--brand-teal,#0F8C85) 62%,var(--brand-euc,#3FA680));',
    'transition:width .28s cubic-bezier(.33,1,.68,1);position:relative}',
    '.b4e-fill::after{content:"";position:absolute;inset:0;border-radius:999px;',
    'background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);',
    'transform:translateX(-100%);animation:b4e-brilho 1.7s ease-in-out infinite}',
    '@keyframes b4e-brilho{0%{transform:translateX(-100%)}60%,100%{transform:translateX(220%)}}',
    '.b4e-marco{position:absolute;top:50%;width:7px;height:7px;border-radius:50%;',
    'background:rgba(17,61,57,.18);transform:translate(-50%,-50%);transition:all .3s ease}',
    '.b4e-marco.on{width:11px;height:11px;background:var(--brand-teal,#0F8C85);',
    'box-shadow:0 0 0 3px var(--canvas,#F1E7DC);animation:b4e-pop .42s ease}',
    '@keyframes b4e-pop{0%{transform:translate(-50%,-50%) scale(.4)}',
    '55%{transform:translate(-50%,-50%) scale(1.45)}100%{transform:translate(-50%,-50%) scale(1)}}',
    '.b4e-doc{position:absolute;top:-19px;left:0;width:22px;margin-left:-11px;',
    'transition:left .28s cubic-bezier(.33,1,.68,1);animation:b4e-pula 1s ease-in-out infinite}',
    '@keyframes b4e-pula{0%,100%{transform:translateY(0) rotate(-4deg)}',
    '50%{transform:translateY(-6px) rotate(5deg)}}',
    '.b4e-doc svg{display:block;width:22px;height:26px;filter:drop-shadow(0 3px 5px rgba(17,61,57,.22))}',
    '.b4e-pct{margin-top:20px;font-size:26px;font-weight:800;letter-spacing:-.02em;',
    'color:var(--brand-dark,#073034);font-variant-numeric:tabular-nums}',
    '.b4e-msg{margin-top:8px;font-size:13px;line-height:1.5;color:var(--muted,#6E6256);',
    'min-height:38px;transition:opacity .3s ease}',
    '.b4e-msg.b4e-troca{opacity:0}',
    '.b4e-ov.b4e-fim .b4e-doc{animation:b4e-festa .5s ease}',
    '@keyframes b4e-festa{0%{transform:translateY(0) scale(1)}',
    '40%{transform:translateY(-16px) scale(1.2) rotate(10deg)}100%{transform:translateY(0) scale(1)}}',
    '.b4e-ov.b4e-fim .b4e-fill::after{display:none}',
    '@media(prefers-reduced-motion:reduce){',
    '.b4e-doc,.b4e-fill::after,.b4e-ov.b4e-fim .b4e-doc{animation:none!important}',
    '.b4e-ov{transition:opacity .2s linear}}',
    /* Tela de erro — mesma silhueta em todas as páginas, do cliente e da equipe. */
    '.b4e-erro{max-width:420px;margin:56px auto;padding:34px 26px;text-align:center;',
    'background:var(--surface,#fff);border:1px solid var(--line,#E4D9C9);',
    'border-radius:var(--radius-lg,16px);',
    'font-family:var(--sans,"Montserrat",system-ui,-apple-system,sans-serif)}',
    '.b4e-erro-ic{width:46px;height:46px;margin:0 auto 16px;border-radius:50%;',
    'display:flex;align-items:center;justify-content:center;background:rgba(232,137,46,.14);color:#8A5A10}',
    '.b4e-erro h1{font-size:18px;font-weight:800;color:var(--ink,#113D39);',
    'letter-spacing:-.01em;margin:0 0 10px}',
    '.b4e-erro p{font-size:13px;line-height:1.65;color:var(--ink-2,#3F5854);margin:0}',
    '.b4e-erro button{margin-top:20px;padding:11px 22px;border:0;cursor:pointer;',
    'border-radius:999px;font:inherit;font-size:13px;font-weight:700;color:#fff;',
    'background:var(--brand-teal,#0F8C85)}',
    '.b4e-erro button:hover{background:var(--brand-dark,#073034)}'
  ].join('');

  var DOC_SVG = '<svg viewBox="0 0 22 26" fill="none" aria-hidden="true">'
    + '<path d="M2 3.2A2.2 2.2 0 0 1 4.2 1h9.3L20 7.4v15.4a2.2 2.2 0 0 1-2.2 2.2H4.2A2.2 2.2 0 0 1 2 22.8V3.2Z" fill="#fff" stroke="var(--brand-dark,#073034)" stroke-width="1.6"/>'
    + '<path d="M13.4 1v6.4H20" stroke="var(--brand-dark,#073034)" stroke-width="1.6" stroke-linejoin="round"/>'
    + '<path d="M6 13h10M6 17h7" stroke="var(--brand-teal,#0F8C85)" stroke-width="1.7" stroke-linecap="round"/>'
    + '</svg>';

  var MARCOS = [22, 48, 72, 92];

  /* ------------------------------------------------------------------ *
   * Estado
   * ------------------------------------------------------------------ */
  var ov = null, fill = null, doc = null, pct = null, msg = null, marcos = [];
  var t0 = 0, raf = 0, tFrase = 0, tSeg = 0, iFrase = 0, frases = [], p = 0;
  var encerrando = false;

  function estilo() {
    if (d.getElementById('b4e-css')) return;
    var s = d.createElement('style');
    s.id = 'b4e-css';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }

  /* Sobe rápido e vai freando: 1 - e^(-t/τ). Aos 30s está em ~88%, aos 60s em ~96%,
     e nunca alcança o teto. Barra que chega a 100% e fica parada lá é pior que barra
     nenhuma — ela promete um fim que não veio. */
  function curva(ms) {
    var tau = Math.max(4000, CFG.estimativa * 0.42);
    return CFG.teto * (1 - Math.exp(-ms / tau));
  }

  function pintar(v) {
    p = v;
    var q = Math.round(v * 100);
    if (fill) fill.style.width = q + '%';
    if (doc) doc.style.left = q + '%';
    if (pct) pct.textContent = q + '%';
    for (var i = 0; i < marcos.length; i++) {
      if (q >= MARCOS[i]) marcos[i].classList.add('on');
      else marcos[i].classList.remove('on');
    }
  }

  function passo() {
    if (encerrando) return;
    pintar(curva(Date.now() - t0));
    raf = w.requestAnimationFrame ? w.requestAnimationFrame(passo) : setTimeout(passo, 60);
  }

  function trocarFrase() {
    if (!msg || encerrando) return;
    msg.classList.add('b4e-troca');
    setTimeout(function () {
      if (!msg || encerrando) return;
      iFrase = (iFrase + 1) % frases.length;
      msg.textContent = frases[iFrase];
      msg.classList.remove('b4e-troca');
    }, 300);
  }

  function limparTimers() {
    if (raf) { if (w.cancelAnimationFrame) w.cancelAnimationFrame(raf); clearTimeout(raf); raf = 0; }
    clearInterval(tFrase); tFrase = 0;
    clearTimeout(tSeg); tSeg = 0;
  }

  function remover() {
    limparTimers();
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    ov = fill = doc = pct = msg = null;
    marcos = [];
    encerrando = false;
  }

  /* ------------------------------------------------------------------ *
   * API
   * ------------------------------------------------------------------ */
  var API = {
    ERRO_TITULO: ERRO_TITULO,
    ERRO_TEXTO: ERRO_TEXTO,

    ativo: function () { return !!ov; },

    iniciar: function (op) {
      op = op || {};
      if (ov) return API;
      estilo();
      var perfil = op.perfil === 'equipe' ? 'equipe' : 'cliente';
      frases = (op.frases && op.frases.length) ? op.frases : FRASES[perfil];
      iFrase = 0;
      if (op.estimativa) CFG.estimativa = op.estimativa;

      ov = d.createElement('div');
      ov.className = 'b4e-ov';
      ov.setAttribute('role', 'status');
      ov.setAttribute('aria-live', 'polite');
      ov.innerHTML =
        '<div class="b4e-cx">'
        + '<div class="b4e-marca"><span class="b">back</span><span class="y">4you</span></div>'
        + '<div class="b4e-pista">'
        + '<div class="b4e-trilho"><div class="b4e-fill"></div></div>'
        + MARCOS.map(function (x) { return '<span class="b4e-marco" style="left:' + x + '%"></span>'; }).join('')
        + '<div class="b4e-doc">' + DOC_SVG + '</div>'
        + '</div>'
        + '<div class="b4e-pct">0%</div>'
        + '<div class="b4e-msg"></div>'
        + '</div>';
      (d.body || d.documentElement).appendChild(ov);

      fill = ov.querySelector('.b4e-fill');
      doc = ov.querySelector('.b4e-doc');
      pct = ov.querySelector('.b4e-pct');
      msg = ov.querySelector('.b4e-msg');
      marcos = [].slice.call(ov.querySelectorAll('.b4e-marco'));
      msg.textContent = frases[0];

      t0 = Date.now();
      p = 0;
      encerrando = false;
      pintar(0);
      passo();
      tFrase = setInterval(trocarFrase, CFG.troca);
      /* Ninguém pode ficar preso atrás de um overlay por causa de um caminho de
         código que esqueceu de chamar concluir(). Passou do teto, ele sai. */
      tSeg = setTimeout(function () { API.concluir(); }, CFG.seguranca);
      return API;
    },

    /* O dado chegou: corre até 100% e sai. O `cb` roda depois da corrida — mas
       quem já esperou muito não ganha mais nenhuma espera decorativa. */
    concluir: function (cb) {
      if (!ov) { if (typeof cb === 'function') cb(); return API; }
      if (encerrando) { if (typeof cb === 'function') cb(); return API; }
      encerrando = true;
      limparTimers();

      var esperou = Date.now() - t0;
      var rush = esperou > CFG.semRush ? 0 : CFG.rush;
      var de = p, ini = Date.now();

      function anda() {
        var k = rush ? Math.min(1, (Date.now() - ini) / rush) : 1;
        var e = 1 - Math.pow(1 - k, 3);                 // desacelera no fim
        var v = de + (1 - de) * e;
        var q = Math.round(v * 100);
        if (fill) fill.style.width = q + '%';
        if (doc) doc.style.left = q + '%';
        if (pct) pct.textContent = q + '%';
        for (var i = 0; i < marcos.length; i++) if (q >= MARCOS[i]) marcos[i].classList.add('on');
        if (k < 1) { (w.requestAnimationFrame || setTimeout)(anda, 16); return; }
        if (ov) {
          ov.classList.add('b4e-fim');
          if (msg) msg.textContent = 'Pronto!';
        }
        setTimeout(function () {
          if (ov) ov.classList.add('b4e-saindo');
          setTimeout(function () { remover(); if (typeof cb === 'function') cb(); }, CFG.saida);
        }, rush ? 200 : 0);
      }
      anda();
      return API;
    },

    /* Some sem corrida nem festa — para quando o caminho é de erro e a próxima
       coisa na tela é a mensagem de problema. */
    cancelar: function () {
      if (!ov) return API;
      encerrando = true;
      limparTimers();
      ov.classList.add('b4e-saindo');
      var velho = ov;
      setTimeout(function () {
        if (velho && velho.parentNode) velho.parentNode.removeChild(velho);
      }, CFG.saida);
      ov = fill = doc = pct = msg = null; marcos = []; encerrando = false;
      return API;
    },

    /* Compatibilidade com o nome antigo usado nas páginas. */
    parar: function () { return API.concluir(); },

    /* O HTML da mensagem padrão de erro. Sem parâmetro de detalhe, de propósito:
       não existe caminho para um texto técnico chegar aqui. */
    erroHTML: function (op) {
      op = op || {};
      estilo();
      var botao = op.semBotao ? ''
        : '<button type="button" onclick="location.reload()">Tentar de novo</button>';
      return '<div class="b4e-erro">'
        + '<div class="b4e-erro-ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" '
        + 'stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5"/>'
        + '<path d="M12 16.5h.01"/><circle cx="12" cy="12" r="9"/></svg></div>'
        + '<h1>' + (op.titulo || ERRO_TITULO) + '</h1>'
        + '<p>' + (op.texto || ERRO_TEXTO) + '</p>'
        + botao + '</div>';
    },

    /* Tira a espera da frente e escreve a mensagem padrão no elemento indicado. */
    telaErro: function (alvo, op) {
      API.cancelar();
      var el = typeof alvo === 'string' ? d.getElementById(alvo) : alvo;
      if (!el) el = d.getElementById('app') || d.getElementById('miolo') || d.body;
      if (el) el.innerHTML = API.erroHTML(op);
      return API;
    }
  };

  w.B4UEspera = API;

  /* Começa sozinha quando o <body> pede. Assim a página não precisa de nenhuma
     linha de JS para ter a tela de espera — só do atributo. */
  function auto() {
    var perfil = d.body && d.body.getAttribute('data-b4u-espera');
    if (perfil) API.iniciar({ perfil: perfil });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', auto);
  else auto();

})(window, document);
