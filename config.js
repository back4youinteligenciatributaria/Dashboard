/**
 * config.js — o endereço da API, num lugar só.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * A URL do Web App do Apps Script estava escrita à mão em 16 HTMLs. Ela muda
 * mais do que parece: toda vez que alguém clica em "Nova implantação" em vez de
 * "Nova versão", e toda vez que o projeto muda de conta Google. Em 03/08/2026
 * isso derrubou o painel inteiro por uma manhã — e consertar significava editar
 * dezesseis arquivos no susto, com pressa, um a um.
 *
 * Agora é aqui. Trocou a implantação? Troca esta linha e sobe este arquivo.
 *
 * COMO PEGAR A URL CERTA
 *   Editor do Apps Script > Implantar > Gerenciar implantações > URL do app da Web.
 *   Termina em /exec — nunca /dev (o /dev só funciona para quem é dono do script).
 *
 * E PREFIRA "NOVA VERSÃO" A "NOVA IMPLANTAÇÃO"
 *   Gerenciar implantações > ícone de lápis > Versão: Nova > Implantar.
 *   Assim a URL NÃO muda e você não precisa mexer aqui.
 *
 * Se este arquivo não carregar, cada página cai numa cópia de reserva da URL que
 * ela guarda internamente — o painel não morre por causa de um 404 aqui.
 */
window.B4U_API = 'https://script.google.com/macros/s/AKfycbzQOB0KNgwM4A5ea4lsRQ4MFAyKfnwh86eGre1RagBtLNqLouZp9-KTHK4A3FNpX5GS/exec';
