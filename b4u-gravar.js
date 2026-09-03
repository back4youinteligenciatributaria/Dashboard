/* ══════════════════════════════════════════════════════════════════════════════
   B4U-GRAVAR — a ficha fecha na hora; a gravação viaja sozinha
   ------------------------------------------------------------------------------
   COMO USAR

     <script src="b4u-gravar.js" charset="utf-8"></script>   (junto do b4u-modal.js)

     B4UGravar.enviar({
       chave:  'daily:12',                      // uma gravação por chave, ver regra 5
       titulo: 'Tarefa #12 — Revisar apuração', // o que o recado nomeia
       itens:  ['Situação → Feito',             // O QUE não gravou, campo a campo
                'Concluído em → 13/08/2026'],
       envio:  function(){ return postAcao({...}); },   // devolve promessa
       aoOk:   function(d){ ... },              // servidor confirmou
       aoDesfazer: function(){ ... }            // devolve a tela ao que era
     });

   ------------------------------------------------------------------------------
   POR QUE ESTE ARQUIVO EXISTE

   A ficha da Daily segurava o modal até o servidor responder. Numa rota de Apps
   Script isso são alguns segundos por tarefa, e a daily tem dezenas — o dono
   descreveu como "atrapalhando e demorando", e estava certo: a espera não
   comprava nada. Quem preenche já sabe o que escreveu; quem precisa saber é
   quem FALHOU, e falha é rara.

   As outras seis telas da equipe já gravavam assim (fila em segundo plano, selo
   de falha na linha). Este arquivo é esse mesmo raciocínio, extraído — porque
   agora ele precisa existir em dois lugares, e a segunda cópia é onde as duas
   começam a divergir.

   ------------------------------------------------------------------------------
   AS REGRAS

   1. O RECADO SÓ APARECE QUANDO DÁ ERRADO.
      Sucesso não interrompe ninguém: a tela já mostra o resultado, e um "salvo ✓"
      que pisca a cada gravação vira ruído que se aprende a ignorar — e no dia em
      que ele disser outra coisa, ninguém lê. Silêncio é a confirmação.

   2. DOIS DESFECHOS, DUAS OFERTAS — e a diferença é sobre o que dá para AFIRMAR.
      O `postAcao` das páginas marca a exceção com `doServidor` ou `incerto`:

        doServidor  o servidor leu, decidiu e RECUSOU. Não gravou. Repetir é
                    seguro, e o recado traz "Tentar de novo".

        incerto     a resposta se perdeu (prazo estourou, 302 falhou, aba
                    suspensa). O servidor GRAVA e só depois responde — então a
                    gravação PODE ter entrado. O recado NÃO oferece repetir:
                    oferece RECARREGAR. Mandar de novo às cegas cria a tarefa
                    duas vezes, ou a nota em dobro no histórico.

      Esta distinção é o motivo de este arquivo não ser dez linhas. Ela já foi
      aprendida caro no painel de Licenças; está aqui para não ser reaprendida.

   3. O RECADO NÃO SOME SOZINHO.
      Não é um "toast" de três segundos. Falha que desaparece enquanto a pessoa
      olha para outro lugar é falha que ninguém viu — e o dado ficou por gravar.
      Sai com o X, com o Esc, ou quando a ação dele resolve o assunto.

   4. QUEM DESFAZ A TELA É A PÁGINA, NÃO ESTE ARQUIVO.
      Ele chama `aoDesfazer()` e não sabe o que isso significa. Saber seria saber
      o que é "tarefa", "linha" ou "situação" — e no dia em que souber, virou o
      catálogo de exceções que o b4u-modal.js recusa ser pelo mesmo motivo.

   5. UMA GRAVAÇÃO POR CHAVE, E A ÚLTIMA MANDA.
      Duas gravações da mesma tarefa em voo ao mesmo tempo terminam fora de
      ordem com facilidade. Quando uma chave repete, a resposta da anterior é
      DESCARTADA em silêncio: ela falaria de um estado que já não está na tela.
      (É o `CONF_SEQ` das telas de fichas, com outro nome.)

   6. FECHAR A ABA COM GRAVAÇÃO EM VOO PEDE CONFIRMAÇÃO.
      É o único momento em que fechar rápido custa dado. O `beforeunload` só
      entra quando há algo pendente de verdade.

   7. UMA GRAVAÇÃO POR VEZ — as outras esperam numa FILA.
      A regra 5 cuida da MESMA tarefa. Esta cuida de tarefas DIFERENTES, e nasceu
      de um defeito relatado em 13/08/2026: reabrir uma tarefa e mexer noutra
      antes de a primeira responder fazia as DUAS voltarem com "a resposta do
      servidor não chegou" — motivo `Failed to fetch` — embora as duas tivessem
      gravado. O dado entrava na planilha e a tela dizia que não sabia; a pessoa
      recarregava, conferia, e aprendia a desconfiar do painel.

      A causa é do outro lado. O backend é um Web App do Apps Script, que
      SERIALIZA as execuções de um mesmo usuário e responde por redirecionamento
      (302 do /exec para o googleusercontent). Com duas chamadas ao mesmo tempo,
      a segunda espera a primeira terminar e o redirecionamento dela volta sem os
      cabeçalhos que o navegador exige — e o `fetch` rejeita com "Failed to
      fetch", que é o erro mais vazio que existe: a requisição não chegou a ter
      resposta. Daqui é indistinguível de "a internet caiu no meio", e por isso o
      recado é o de DÚVIDA (regra 2), o mais assustador dos dois.

      Isso não se conserta do lado do servidor sem trocar de plataforma. Mas dá
      para não CRIAR a situação: se só uma gravação viaja por vez, não existem
      duas execuções concorrentes para o Apps Script serializar.

      O preço é a segunda sair alguns segundos depois — e ele é invisível, porque
      a tela nunca esperou resposta para mostrar o resultado (é o motivo de este
      arquivo existir). O preço de verdade aparece quando uma gravação trava até
      o prazo estourar: as da fila esperam junto. É barato perto de um recado de
      dúvida em cima de dado que gravou.
   ══════════════════════════════════════════════════════════════════════════════ */
(function (w, d) {
  'use strict';
  if (w.B4UGravar) return;

  var CSS = [
    /* 980: acima do modal (960 no b4u-modal.js). O recado nasce quase sempre com
       a ficha já fechada, mas quando a pessoa reabriu outra no meio do caminho
       ele não pode ficar por baixo — é o único elemento da tela com uma notícia
       que ninguém pediu. */
    '#b4g-pilha{position:fixed;right:14px;bottom:14px;z-index:980;',
    'display:flex;flex-direction:column;gap:9px;align-items:flex-end;',
    'max-width:min(400px,calc(100vw - 28px));pointer-events:none}',

    '.b4g-cx{pointer-events:auto;width:100%;background:var(--surface,#fff);',
    'border:1px solid var(--line-2,#D6C3AC);border-left:4px solid var(--vermelho,#C0392B);',
    'border-radius:var(--radius,6px);box-shadow:0 8px 26px rgba(7,48,52,.22);',
    'padding:11px 13px;font-family:var(--sans,Montserrat,system-ui,sans-serif);',
    'font-size:var(--fs-3,13px);color:var(--ink,#113D39);line-height:1.45}',
    /* Dúvida não é recusa, e a cor diz isso antes da palavra: âmbar é "confira",
       vermelho é "não entrou". A tela inteira já usa esse par. */
    '.b4g-cx.duvida{border-left-color:var(--amber,#E8892E)}',

    '.b4g-top{display:flex;align-items:flex-start;gap:8px}',
    '.b4g-tit{flex:1;min-width:0;font-weight:800;font-size:var(--fs-3,13px);overflow-wrap:anywhere}',
    '.b4g-x{flex:none;border:0;background:none;cursor:pointer;font:inherit;font-size:15px;',
    'line-height:1;color:var(--muted,#6E6256);padding:0 2px}',
    '.b4g-x:hover{color:var(--ink,#113D39)}',

    '.b4g-txt{margin-top:4px;font-size:var(--fs-2,12px);color:var(--ink-2,#3F5854)}',
    /* O QUE não gravou, item a item. É a diferença entre "não salvou" e um recado
       em que dá para confiar: quem lê precisa saber o que perdeu para decidir se
       redigita ou se recarrega. */
    '.b4g-itens{margin:7px 0 0;padding:0;list-style:none;font-size:var(--fs-2,12px);',
    'border-top:1px solid var(--line,#E4D9C9);padding-top:6px}',
    '.b4g-itens li{padding:2px 0 2px 12px;position:relative;overflow-wrap:anywhere}',
    '.b4g-itens li::before{content:"·";position:absolute;left:3px;font-weight:800;',
    'color:var(--muted,#6E6256)}',
    '.b4g-mot{margin-top:6px;font-size:var(--fs-1,11px);color:var(--muted,#6E6256);',
    'overflow-wrap:anywhere}',

    '.b4g-acoes{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}',
    '.b4g-bt{font-family:inherit;font-size:var(--fs-2,12px);font-weight:700;cursor:pointer;',
    'border:1px solid var(--line-2,#D6C3AC);background:var(--surface,#fff);',
    'color:var(--ink,#113D39);border-radius:var(--radius-sm,4px);padding:6px 11px}',
    '.b4g-bt:hover{border-color:var(--brand-teal,#0F8C85)}',
    '.b4g-bt.primario{background:var(--brand-teal,#0F8C85);border-color:var(--brand-teal,#0F8C85);color:#fff}',
    '.b4g-bt.primario:hover{background:var(--brand-teal-txt,#0C756F)}',
    '.b4g-bt[disabled]{opacity:.55;cursor:default}',

    '@media(max-width:520px){#b4g-pilha{left:14px;right:14px;max-width:none}}',
    '@media(prefers-reduced-motion:no-preference){',
    '.b4g-cx{animation:b4g-entra .16s ease-out}',
    '@keyframes b4g-entra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}}'
  ].join('');

  function estilo() {
    if (d.getElementById('b4g-css')) return;
    var s = d.createElement('style');
    s.id = 'b4g-css';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }
  function pilha() {
    var p = d.getElementById('b4g-pilha');
    if (!p) {
      estilo();
      p = d.createElement('div');
      p.id = 'b4g-pilha';
      /* `polite` e não `assertive`: o leitor de tela termina a frase que está
         dizendo antes de anunciar. Falha de gravação é urgente para os olhos,
         não a ponto de cortar a fala no meio. */
      p.setAttribute('aria-live', 'polite');
      d.body.appendChild(p);
    }
    return p;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var EM_VOO = {};      // chave -> número de sequência da gravação que vale
  var SEQ = 0;
  var ABERTOS = [];     // recados na tela, para o Esc fechar o de cima
  var POR_CHAVE = {};   // chave -> recado na tela, para não empilhar o mesmo duas vezes

  function pendentes() {
    return Object.keys(EM_VOO).length;
  }

  /* Só entra quando há algo em voo, e sai quando não há mais. Registrado uma vez
     e decidindo na hora: um ouvinte que se registra e se remove esquece de se
     remover no dia em que uma exceção passar no meio. */
  w.addEventListener('beforeunload', function (e) {
    if (!pendentes()) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !ABERTOS.length) return;
    /* Não corta a propagação: o Esc daqui fecha o recado de cima, e se houver um
       modal aberto atrás dele quem manda continua sendo o b4u-modal.js na
       rodada seguinte. Recado é notícia, não camada. */
    ABERTOS[ABERTOS.length - 1].fechar();
  });

  function recado(op) {
    var cx = d.createElement('div');
    cx.className = 'b4g-cx' + (op.duvida ? ' duvida' : '');
    var itens = (op.itens || []).filter(Boolean);
    cx.innerHTML =
      '<div class="b4g-top">' +
        '<div class="b4g-tit">' + esc(op.titulo || 'Não consegui gravar') + '</div>' +
        '<button type="button" class="b4g-x" aria-label="Fechar aviso">✕</button>' +
      '</div>' +
      '<div class="b4g-txt">' + esc(op.texto || '') + '</div>' +
      (itens.length
        ? '<ul class="b4g-itens">' + itens.map(function (i) {
            return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'
        : '') +
      (op.motivo ? '<div class="b4g-mot">' + esc(op.motivo) + '</div>' : '') +
      '<div class="b4g-acoes"></div>';

    var acoes = cx.querySelector('.b4g-acoes');
    var api = {
      chave: op.chave || null,
      fechar: function () {
        var i = ABERTOS.indexOf(api);
        if (i >= 0) ABERTOS.splice(i, 1);
        if (api.chave && POR_CHAVE[api.chave] === api) delete POR_CHAVE[api.chave];
        cx.remove();
      }
    };
    /* UM RECADO POR CHAVE. As telas de fichas chamam `marcarFalha()` a cada
       redesenho, não só na hora da falha — sem isto, a mesma linha que não gravou
       empilharia um recado por tentativa até cobrir a tela. O novo SUBSTITUI o
       antigo em vez de somar: é a mesma notícia, atualizada. */
    if (api.chave && POR_CHAVE[api.chave]) POR_CHAVE[api.chave].fechar();
    if (api.chave) POR_CHAVE[api.chave] = api;
    (op.botoes || []).forEach(function (b) {
      var bt = d.createElement('button');
      bt.type = 'button';
      bt.className = 'b4g-bt' + (b.primario ? ' primario' : '');
      bt.textContent = b.rot;
      bt.addEventListener('click', function () {
        /* Trava o recado inteiro: dois cliques no "tentar de novo" são duas
           gravações, que é exatamente o que este arquivo existe para evitar. */
        [].slice.call(acoes.querySelectorAll('.b4g-bt')).forEach(function (o) { o.disabled = true; });
        try { b.aoClicar(api); } catch (e) { api.fechar(); }
      });
      acoes.appendChild(bt);
    });
    cx.querySelector('.b4g-x').addEventListener('click', api.fechar);
    pilha().appendChild(cx);
    ABERTOS.push(api);
    return api;
  }

  /* ---------- a fila da regra 7 ----------
     Uma corrente de promessas: cada gravação se pendura no fim e só sai quando a
     anterior terminar, tenha ela dado certo ou errado. `FILA` é sempre uma
     promessa que RESOLVE (o `catch` no fim da corrente) — uma rejeição guardada
     aqui travaria todas as próximas, que é o oposto do que esta fila existe para
     fazer: falha de uma gravação é assunto dela e do recado dela. */
  var FILA = Promise.resolve();
  /* Sentinela de "nem cheguei a sair da fila". Um objeto, e não `null` ou
     `false`: assim ele nunca se confunde com uma resposta legítima do servidor. */
  var SUPERADA = {};

  function naFila(fn) {
    var meu = FILA.then(fn);
    FILA = meu.then(function () {}, function () {});
    return meu;
  }

  function enviar(op) {
    op = op || {};
    var chave = String(op.chave || ('anon:' + (++SEQ)));
    var seq = ++SEQ;
    EM_VOO[chave] = seq;

    function atual() { return EM_VOO[chave] === seq; }
    function baixar() { if (atual()) delete EM_VOO[chave]; }

    naFila(function () {
        /* Superada ENQUANTO esperava a vez: não chega a sair para o servidor.
           Mandar a versão velha para receber a nova por cima é gravar duas vezes
           para chegar no mesmo lugar — e a primeira das duas ainda pode ser a
           que falha, com recado e tudo. A regra 5 já descartava a RESPOSTA da
           antiga; com a fila dá para descartar a VIAGEM. */
        if (!atual()) return SUPERADA;
        return op.envio();
      })
      .then(function (dados) {
        if (dados === SUPERADA) return;
        if (!atual()) return;            // regra 5: gravação mais nova assumiu
        baixar();
        if (op.aoOk) op.aoOk(dados);
      })
      .catch(function (e) {
        if (!atual()) return;
        baixar();
        /* A tela volta ao que era ANTES do recado aparecer. Ler "não gravou" com
           a mudança ainda pintada na lista é receber duas informações que se
           contradizem — e a que fica é a que se vê. */
        if (op.aoDesfazer) { try { op.aoDesfazer(); } catch (e2) {} }

        var incerto = !!(e && e.incerto) || !(e && e.doServidor);
        var msg = String((e && e.message) || e || '').trim();

        if (!incerto) {
          recado({
            titulo: op.titulo,
            texto: 'O servidor recusou. Nada foi gravado — o que está abaixo continua como estava.',
            itens: op.itens,
            motivo: msg ? 'Motivo: ' + msg : '',
            botoes: [
              { rot: 'Tentar de novo', primario: true, aoClicar: function (r) {
                  r.fechar();
                  enviar(op);              // mesma gravação, do começo
                } },
              { rot: 'Deixar assim', aoClicar: function (r) { r.fechar(); } }
            ]
          });
          return;
        }
        recado({
          duvida: true,
          titulo: op.titulo,
          /* Nem "salvou" nem "não salvou": as duas seriam afirmação, e não há
             como fazê-la daqui. O recado descreve o que se sabe e manda conferir
             onde a resposta existe. */
          texto: 'A resposta do servidor não chegou, então não dá para dizer se gravou. ' +
                 'Recarregue e confira antes de mandar de novo — repetir pode gravar duas vezes.',
          itens: op.itens,
          motivo: msg ? 'Motivo: ' + msg : '',
          botoes: [
            { rot: 'Recarregar e conferir', primario: true, aoClicar: function () { w.location.reload(); } },
            { rot: 'Fechar', aoClicar: function (r) { r.fechar(); } }
          ]
        });
      });
  }

  /* ---------- para as telas que JÁ gravam em segundo plano ----------
     As seis telas de fichas (Licenças, Registro, Certificados, Contatos,
     Restituição, Societário) não precisam da fila: elas já têm a delas, com
     debounce, sequência e marcação na linha. O que faltava nelas era só o
     RECADO — a falha ficava num selo dentro da ficha, e a ficha estava fechada.

     `falhou()` dá esse recado com a mesma cara e as mesmas duas ofertas do
     `enviar()`, sem tomar conta da gravação. `resolvida()` o retira quando
     aquela linha finalmente entrou. As duas trabalham por CHAVE, que é o
     identificador que a página já usa (id da licença, linha da planilha). */
  function falhou(op) {
    op = op || {};
    var msg = String(op.motivo || '').trim();
    if (op.duvida) {
      return recado({
        chave: op.chave, duvida: true, titulo: op.titulo,
        texto: 'A resposta do servidor não chegou, então não dá para dizer se gravou. ' +
               'Recarregue e confira antes de mandar de novo — repetir pode gravar duas vezes.',
        itens: op.itens,
        motivo: msg ? 'Motivo: ' + msg : '',
        botoes: [
          { rot: 'Recarregar e conferir', primario: true, aoClicar: function () { w.location.reload(); } },
          { rot: 'Fechar', aoClicar: function (r) { r.fechar(); } }
        ]
      });
    }
    var botoes = [];
    /* O botão só existe se a página souber repetir. Oferecer "tentar de novo"
       sem ter o que chamar seria um botão que não faz nada — pior do que não
       ter botão, porque quem clica acha que resolveu. */
    if (op.aoRepetir) botoes.push({ rot: 'Tentar de novo', primario: true, aoClicar: function (r) {
      r.fechar(); op.aoRepetir();
    } });
    botoes.push({ rot: botoes.length ? 'Deixar assim' : 'Fechar', aoClicar: function (r) { r.fechar(); } });
    return recado({
      chave: op.chave, titulo: op.titulo,
      texto: 'O servidor recusou. Não gravou — o que está abaixo continua como estava.',
      itens: op.itens,
      motivo: msg ? 'Motivo: ' + msg : '',
      botoes: botoes
    });
  }
  function resolvida(chave) {
    var r = POR_CHAVE[String(chave)];
    if (r) r.fechar();
  }

  w.B4UGravar = {
    enviar: enviar,
    pendentes: pendentes,
    falhou: falhou,
    resolvida: resolvida,
    /* Para quem quiser dar o próprio recado com a mesma cara (a página não
       precisa saber montar caixa nenhuma). */
    recado: recado
  };
})(window, document);
