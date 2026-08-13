/**
 * b4u-delights.js — a comemoração de terminar uma tarefa.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * Concluir uma tarefa é a única coisa que a pessoa faz nesta ferramenta o dia
 * inteiro por vontade própria, e até agora o painel respondia a isso do mesmo
 * jeito que responde a "troquei a área": a linha muda de cor e some da lista. O
 * gesto que fecha um trabalho merecia uma resposta que se veja — não porque a
 * tela precise, mas porque quem fecha precisa.
 *
 * O QUE ELE FAZ
 * Um estouro no ponto exato onde a pessoa clicou, que vira confete caindo por
 * ~1,8 segundo. Acabou, some sozinho, não deixa nada na tela.
 *
 * O QUE ELE NÃO FAZ, E É DE PROPÓSITO
 * Não grava, não lê dado nenhum, não toca em nenhum id da página, não recebe
 * clique e não tem estado que sobreviva à animação. Ele é ENFEITE, e a fronteira
 * é essa: no dia em que este arquivo souber o que é uma tarefa, ele já virou
 * outra coisa e vai começar a quebrar gravação.
 *
 * COMO USAR
 *   <script src="b4u-delights.js" charset="utf-8"></script>
 *
 *   if (window.B4UDelights) B4UDelights.comemorar({ em: botao });
 *   // ou, sem elemento:     B4UDelights.comemorar({ x: 300, y: 400 });
 *
 * SE ESTE ARQUIVO NÃO CARREGAR
 * Nada acontece — e nada mais muda. As chamadas ficam atrás de
 * `window.B4UDelights &&`, e a tarefa conclui exatamente como concluía antes,
 * só sem festa. É a razão de ele ser um arquivo separado e não trinta linhas
 * dentro da daily: um enfeite não pode ser capaz de derrubar uma gravação.
 *
 * ---------------------------------------------------------------------------------
 * QUATRO DECISÕES, E O MOTIVO DE CADA UMA
 *
 * 1. `prefers-reduced-motion` DESLIGA A FESTA INTEIRA, E É CONSULTADO A CADA CLIQUE.
 *    Quem pediu menos movimento pediu por um motivo — enxaqueca, vertigem, TDAH —
 *    e um confete que atravessa a tela é exatamente o que essa pessoa desligou. A
 *    consulta é na hora do clique, e não uma vez no carregamento, porque a opção
 *    muda no sistema com a página aberta. A daily já respeita a mesma preferência
 *    na folha dela; aqui é a mesma regra, só que o CSS não alcança <canvas>.
 *
 * 2. `pointer-events:none` E `aria-hidden` NO CANVAS.
 *    Ele cobre a tela inteira por quase dois segundos, e por dois segundos
 *    NENHUM clique pode morrer nele: quem concluiu uma tarefa costuma já estar
 *    indo clicar na próxima. E para quem usa leitor de tela o confete não existe
 *    — a confirmação de que gravou é o "salvo ✓" de sempre, que é texto.
 *
 * 3. UM CANVAS SÓ, REAPROVEITADO, COM TETO DE PARTÍCULAS.
 *    Dez cliques seguidos não criam dez canvas empilhados: as partículas entram
 *    no que já está rodando, e o teto (`TETO`) descarta as mais velhas em vez de
 *    deixar a máquina engasgar. O canvas nasce no primeiro clique e morre quando
 *    a última partícula some — página que nunca conclui tarefa nunca ganha um nó
 *    a mais no DOM.
 *
 * 4. FÍSICA POR TEMPO, NÃO POR QUADRO.
 *    As velocidades são por SEGUNDO e o passo é o tempo real entre quadros. Em
 *    120Hz um confete calculado por quadro cairia com o dobro da pressa, e a
 *    mesma festa duraria metade numa máquina e o dobro na outra. O passo é
 *    limitado a 50ms para que voltar de uma aba esquecida não teleporte tudo
 *    para fora da tela num quadro só.
 * ---------------------------------------------------------------------------------
 */
(function (w, d) {
  'use strict';
  if (w.B4UDelights) return;

  /* Teto de partículas vivas ao mesmo tempo. 420 é ~4 comemorações empilhadas;
     acima disso o ganho visual é zero (o olho não separa) e o custo é real em
     máquina fraca, que é a que a equipe usa. */
  var TETO = 420;
  var PASSO_MAX = 0.05;          /* segundos: o maior salto de tempo aceito por quadro */
  var DPR_MAX = 2;               /* telas 3x custam 2,25x mais pixel sem diferença visível aqui */

  var canvas = null, ctx = null, raf = 0, ultimo = 0;
  var vivas = [];
  var largura = 0, altura = 0, dpr = 1;

  /* ─────────────────────────────────────────────────────────────────────────
   * As cores
   * Vêm dos tokens da folha (`b4u-design.css`), lidos do :root na primeira vez.
   * Escrever os hex aqui dentro faria o confete continuar teal no dia em que a
   * marca deixasse de ser teal — e ninguém procuraria a cor perdida num arquivo
   * chamado "delights". O fallback existe porque este arquivo tem de funcionar
   * mesmo numa página que carregou sem a folha.
   * ───────────────────────────────────────────────────────────────────────── */
  var CORES = null;
  function cor(nome, reserva) {
    try {
      var v = getComputedStyle(d.documentElement).getPropertyValue(nome);
      v = (v || '').trim();
      return v || reserva;
    } catch (e) { return reserva; }
  }
  function cores() {
    if (!CORES) {
      CORES = [
        cor('--verde', '#2E9D5F'),
        cor('--brand-euc', '#3FA680'),
        cor('--brand-teal', '#0F8C85'),
        cor('--amber', '#E8892E'),
        /* Estes dois NÃO são tokens, e é de propósito: um amarelo de festa e um
           verde-água claro que a paleta não tem. Confete só com as cores de
           trabalho fica com cara de gráfico caindo. O `--brand-dark` chegou a
           entrar aqui e foi tirado depois de olhar a imagem: quase preto no meio
           do confete lê como sujeira na tela, não como papel picado. */
        '#F6C453',
        '#A8DCC9'
      ];
    }
    return CORES;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Quando NÃO comemorar
   * Os três casos têm a mesma cara para quem está olhando (nada acontece) e
   * motivos bem diferentes. Ficam juntos numa função só para que a resposta seja
   * a mesma em todo lugar que perguntar.
   * ───────────────────────────────────────────────────────────────────────── */
  function ligado() {
    /* Pediu menos movimento. Decisão 1 lá em cima. */
    try {
      if (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* navegador sem matchMedia: segue */ }
    /* Aba escondida: a festa aconteceria para ninguém, e o rAF nem roda — as
       partículas ficariam paradas esperando a volta e estourariam na cara de
       quem voltasse à aba dez minutos depois. */
    if (d.hidden) return false;
    /* Sem canvas não há o que desenhar (e não há por que tentar). */
    if (!d.createElement('canvas').getContext) return false;
    return true;
  }

  function medir() {
    dpr = Math.min(w.devicePixelRatio || 1, DPR_MAX);
    largura = w.innerWidth; altura = w.innerHeight;
    canvas.width = Math.floor(largura * dpr);
    canvas.height = Math.floor(altura * dpr);
    canvas.style.width = largura + 'px';
    canvas.style.height = altura + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function nascerCanvas() {
    if (canvas) return;
    canvas = d.createElement('canvas');
    canvas.id = 'b4u-delights';
    canvas.setAttribute('aria-hidden', 'true');
    /* z-index acima do modal (960, no b4u-modal.js): a comemoração sai de dentro
       de uma ficha aberta e tem de aparecer POR CIMA dela — inclusive nos dois
       ou três décimos em que a ficha ainda está fechando. */
    canvas.style.cssText = 'position:fixed;inset:0;z-index:9990;pointer-events:none;' +
      'background:transparent;border:0;margin:0;padding:0';
    ctx = canvas.getContext('2d');
    d.body.appendChild(canvas);
    medir();
    w.addEventListener('resize', medir);
  }

  function morrerCanvas() {
    if (!canvas) return;
    w.removeEventListener('resize', medir);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null; vivas = [];
  }

  function entre(a, b) { return a + Math.random() * (b - a); }

  /* ─────────────────────────────────────────────────────────────────────────
   * As duas partículas
   *
   * FAÍSCA — o estouro. Sai em todas as direções do ponto do clique, vive meio
   * segundo e apaga. É ela que diz "aqui, foi você que fez isso": o confete
   * sozinho, caindo do topo, comemora um acontecimento anônimo.
   *
   * CONFETE — o resto. Nasce um pouco depois (`atraso`), sobe, vira e cai. É o
   * que dura, e é por isso que ele é retângulo girando e não bolinha: bolinha
   * caindo é chuva, papel girando é festa.
   * ───────────────────────────────────────────────────────────────────────── */
  function faisca(x, y, forca) {
    var a = entre(0, Math.PI * 2), v = entre(160, 560) * forca;
    return {
      tipo: 'f', x: x, y: y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      g: 620, arrasto: 1.9,
      r: entre(1.6, 3.2),
      cor: cores()[(Math.random() * cores().length) | 0],
      atraso: 0, idade: 0, vida: entre(0.42, 0.8)
    };
  }
  function confete(x, y, forca) {
    /* O cone é para CIMA (-140° a -40°): papel que nasce indo para baixo parece
       coisa caindo do teto, não coisa comemorando. */
    var a = entre(-Math.PI * 0.78, -Math.PI * 0.22), v = entre(260, 620) * forca;
    return {
      tipo: 'c', x: x, y: y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      g: 780, arrasto: 0.9,
      larg: entre(5, 9), alt: entre(7, 12),
      giro: entre(0, Math.PI * 2), vgiro: entre(-9, 9),
      /* O balanço lateral. Sem ele o papel cai em linha reta e parece pedra. */
      fase: entre(0, Math.PI * 2), balanco: entre(18, 52),
      cor: cores()[(Math.random() * cores().length) | 0],
      atraso: entre(0, 0.22), idade: 0, vida: entre(1.3, 1.9)
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * comemorar({ em, x, y, forca })
   *   em    — elemento de onde a festa sai (o centro dele vira o ponto)
   *   x, y  — ponto na tela, se não houver elemento
   *   forca — 1 é o normal; 0,7 discreto; 1,3 exagerado
   * Devolve true se comemorou, false se não era hora (ver `ligado()`).
   *
   * IMPORTANTE PARA QUEM CHAMA: chame ANTES de fechar o modal onde o botão mora.
   * O ponto é medido AGORA; um elemento já removido da tela mede 0×0 e a festa
   * sairia do canto superior esquerdo.
   * ───────────────────────────────────────────────────────────────────────── */
  function comemorar(op) {
    op = op || {};
    if (!ligado()) return false;

    var x = op.x, y = op.y;
    if (op.em && op.em.getBoundingClientRect) {
      var r = op.em.getBoundingClientRect();
      /* Nó escondido ou já fora da tela: cai no centro em vez de estourar no
         canto, que pareceria defeito. */
      if (r.width || r.height) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
    }
    if (typeof x !== 'number') x = w.innerWidth / 2;
    if (typeof y !== 'number') y = w.innerHeight * 0.55;

    var forca = typeof op.forca === 'number' ? op.forca : 1;
    nascerCanvas();

    var i;
    for (i = 0; i < 34; i++) vivas.push(faisca(x, y, forca));
    for (i = 0; i < 58; i++) vivas.push(confete(x, y, forca));
    /* Teto: as mais velhas saem primeiro — são as que já estão sumindo, e
       ninguém sente falta delas. */
    if (vivas.length > TETO) vivas.splice(0, vivas.length - TETO);

    if (!raf) { ultimo = 0; raf = w.requestAnimationFrame(quadro); }
    return true;
  }

  function quadro(t) {
    raf = 0;
    if (!ctx) return;
    if (!ultimo) ultimo = t;
    var dt = Math.min((t - ultimo) / 1000, PASSO_MAX);
    ultimo = t;

    ctx.clearRect(0, 0, largura, altura);

    var restantes = [];
    for (var i = 0; i < vivas.length; i++) {
      var p = vivas[i];
      p.idade += dt;
      if (p.idade < p.atraso) { restantes.push(p); continue; }
      var vida = p.idade - p.atraso;
      if (vida > p.vida) continue;                        /* acabou: não volta para a lista */

      /* Arrasto proporcional ao passo — `pow` e não uma subtração, senão o
         freio depende da taxa de quadros, que é justamente o que a decisão 4
         evita. */
      var freio = Math.pow(1 / (1 + p.arrasto), dt);
      p.vx *= freio; p.vy *= freio;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      /* Passou do rodapé com folga: sumiu de vez, não adianta continuar
         calculando um papel que ninguém vai ver voltar. */
      if (p.y > altura + 60) continue;

      var f = vida / p.vida;
      /* Só o último terço apaga. Apagar desde o começo faz a festa parecer
         fraca no instante em que ela precisa ser vista. */
      ctx.globalAlpha = f < 0.66 ? 1 : Math.max(0, 1 - (f - 0.66) / 0.34);
      ctx.fillStyle = p.cor;

      if (p.tipo === 'f') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        p.giro += p.vgiro * dt;
        p.fase += dt * 3.4;
        var bx = p.x + Math.sin(p.fase) * p.balanco * dt * 8;
        p.x = bx;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        /* O papel visto de lado: a largura encolhe conforme ele gira. É o que
           dá a impressão de folha e não de tijolo. */
        ctx.fillRect(-p.larg / 2, -p.alt / 2, p.larg * Math.abs(Math.cos(p.giro * 1.7)) + 1, p.alt);
        ctx.restore();
      }
      restantes.push(p);
    }
    ctx.globalAlpha = 1;
    vivas = restantes;

    if (vivas.length) raf = w.requestAnimationFrame(quadro);
    else morrerCanvas();
  }

  /* Trocar de aba no meio da festa: as partículas param no tempo (o rAF não roda
     escondido) e voltariam todas de uma vez. Melhor encerrar — o que estava
     sendo comemorado já passou. */
  d.addEventListener('visibilitychange', function () {
    if (d.hidden && canvas) { if (raf) w.cancelAnimationFrame(raf); raf = 0; morrerCanvas(); }
  });

  w.B4UDelights = {
    comemorar: comemorar,
    /* Para quem quiser decidir outra coisa quando não vai ter festa (um recado
       de texto, por exemplo) em vez de descobrir pelo `false`. */
    ligado: ligado,
    /* Corta tudo na hora. Existe para o caso de a página precisar limpar a tela
       (impressão, troca de rota) — não é usado no caminho normal. */
    parar: function () { if (raf) w.cancelAnimationFrame(raf); raf = 0; morrerCanvas(); }
  };
})(window, document);
