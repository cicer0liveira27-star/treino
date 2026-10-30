/* Musculinho conhece o app inteiro: telas, treinos, histórico, cargas, peso, check-ins e saúde,
   e monta ou altera treinos quando a pessoa pede. Tudo local, sem internet. */

const nrm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = v => String(v).replace('.', ',');

/* ---------- Mapa do app ---------- */
const TELAS = {
  hoje: { nome: 'Hoje', desc: 'fica o check-in do dia, a sua sequência (dias e semanas seguidos), a semana marcada e os seus treinos para começar.' },
  treinos: { nome: 'Treinos', desc: 'ficam os seus 5 treinos: toque em Editar para montar, segure e arraste para mudar a ordem, use ⧉ para copiar um dia para outro, e embaixo está a grade completa de exercícios com busca.' },
  musculinho: { nome: 'Musculinho', desc: 'sou eu! Aqui ficam a conversa e o seu plano de dieta, descanso e treinos, com PDF.' },
  evolucao: { nome: 'Evolução', desc: 'ficam o calendário de check-ins, a carga por exercício (peso de cada série e recordes), o peso corporal, o registro de saúde, os últimos treinos e as fotos.' },
  ajustes: { nome: 'Ajustes', desc: 'ficam o tema de cores, o seu perfil e a foto de perfil, as estatísticas de uso e o backup (baixar ou restaurar).' }
};
const ONDE = [
  [/check.?in|sequencia|dias seguidos|semanas seguidas/, 'hoje'],
  [/copiar (o |um )?(treino|dia)|duplicar|arrast|ordem dos treinos|editar (o |meu )?treino|montar (meu )?treino sozinho|grade de exercicio|buscar exercicio/, 'treinos'],
  [/tema|cor(es)? do app|all black|foto de perfil|perfil|backup|restaurar|estatistica|dados de uso/, 'ajustes'],
  [/calendario|grafico|historico|fotos? d(o|os) treino|galeria|peso corporal|registro de saude/, 'evolucao']
];
function irTela(v){ view = v; render(); scrollTo(0, 0); }

/* ---------- Leitura dos dados ---------- */
function acharExercicio(t){
  const lista = Exercicios.lista, alias = { supino: 'supino-reto', puxada: 'puxador-frente', pulley: 'puxador-frente', voador: 'peck-deck', leg: 'leg-press', terra: 'levantamento-terra', esteira: 'aerobico', 'hip thrust': 'hip-thrust', serrote: 'remada-unilateral', extensora: 'cadeira-extensora', flexora: 'mesa-flexora', abdutora: 'cadeira-abdutora', adutora: 'cadeira-adutora' };
  let melhor = null, nota = 0;
  for (const e of lista) {
    const ws = nrm(e.nome).replace(/\(.*?\)/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2);
    if (!ws.length) continue;
    const hit = ws.filter(w => t.includes(w)).length, sc = hit / ws.length + (e.id.startsWith('x-') ? 0 : .15) + (hit === ws.length ? .3 : 0);
    if (hit && sc > nota) { nota = sc; melhor = e; }
  }
  if (melhor && nota >= .75) return melhor;
  for (const [k, id] of Object.entries(alias)) if (t.includes(k)) return EX[id];
  return null;
}
function acharDia(t){
  let m = t.match(/\bdia\s*([1-9])\b/); if (m && S.planos[+m[1] - 1]) return +m[1] - 1;
  m = t.match(/\btreino\s+([a-e])\b/); if (m) return m[1].charCodeAt(0) - 97;
  const i = S.planos.findIndex(p => p.nome && nrm(p.nome).length > 3 && t.includes(nrm(p.nome))); if (i > -1) return i;
  if (/\bhoje\b|proximo treino|treino de hoje/.test(t)) { const p = proximoPlano(); return p ? S.planos.indexOf(p) : -1; }
  return -1;
}
const GRUPOS_TXT = [
  [/peito|peitoral/, ['peito']], [/costa|dorsal/, ['costas']], [/ombro|deltoide/, ['ombros']], [/\bbiceps/, ['biceps']], [/triceps/, ['triceps']],
  [/braco|bracos/, ['biceps', 'triceps']], [/posterior/, ['posterior']], [/gluteo|bumbum|bunda/, ['gluteos']], [/panturrilha/, ['panturrilha']],
  [/quadriceps|coxa/, ['quadriceps']], [/perna|inferior/, ['quadriceps', 'posterior', 'gluteos', 'panturrilha']], [/superior/, ['peito', 'costas', 'ombros', 'biceps', 'triceps']],
  [/abdom|barriga|\bcore\b/, ['abdomen']], [/lombar/, ['lombar']], [/cardio|aerobico|corrida/, ['cardio']],
  [/corpo (todo|inteiro)|full ?body|completo/, ['quadriceps', 'peito', 'costas', 'ombros', 'abdomen']]
];
function gruposDoTexto(t){ const out = []; GRUPOS_TXT.forEach(([re, gs]) => { if (re.test(t)) gs.forEach(g => { if (!out.includes(g)) out.push(g); }); }); return out; }
const resumoTreino = p => p.itens.length ? p.itens.map(it => `• ${EX[it.ex]?.nome || it.ex}: ${+it.series === 1 ? it.reps : it.series + ' × ' + it.reps}`).join('\n') : 'Ainda está vazio.';
function historicoDe(id){ return S.sessoes.map(s => ({ s, it: s.itens.find(i => i.ex === id) })).filter(o => o.it && (o.it.cargas?.some(c => c !== '') || (o.it.carga !== '' && o.it.carga != null))); }

/* ---------- Entender o jeito de falar ---------- */
// abreviações e gírias comuns no WhatsApp
const ABREV = [[/\bhj\b/g, 'hoje'], [/\bhje\b/g, 'hoje'], [/\bontm\b|\bonti\b/g, 'ontem'], [/\bantiontem\b|\bantes de ontem\b/g, 'anteontem'],
  [/\boq\b|\bo q\b/g, 'o que'], [/\bq\b/g, 'que'], [/\bvc\b/g, 'voce'], [/\bmsm\b/g, 'mesmo'], [/\btb\b|\btbm\b/g, 'tambem'], [/\bdps\b/g, 'depois'],
  [/\bsmn\b|\bsem\b(?= passada)/g, 'semana'], [/\bnessa semana\b|\bdessa semana\b|\bsemana atual\b|\besta semana\b/g, 'essa semana'],
  [/\bacad\b|\bacademi\b|\bakademia\b/g, 'academia'], [/\bcheck[ -]?in\b|\bchek[ -]?in\b|\bchecki?n\b/g, 'checkin'], [/\bmusculacao\b|\bmuscula\b/g, 'treino'],
  [/\b(costa|costas)\b/g, 'costas'], [/\bbicep\b/g, 'biceps'], [/\btricep\b/g, 'triceps'], [/\bpernas\b/g, 'perna'], [/\bgym\b/g, 'academia'], [/\btreinu\b/g, 'treino']];
// palavras-chave que valem corrigir quando digitadas errado (1 letra de diferença; 2 nas longas)
const CHAVES = ['treinei', 'treinou', 'treinamos', 'treinar', 'treinando', 'treinos', 'treino', 'malhei', 'malhou', 'malhar', 'academia', 'ontem', 'anteontem', 'hoje', 'semana', 'passada', 'passado',
  'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'checkin', 'ultimo', 'ultima', 'exercicio', 'exercicios', 'sequencia', 'evolucao', 'proximo', 'finalizei', 'completei', 'concluido'];
// palavras certas parecidas com as chaves, que não devem ser trocadas
const PROTEGE = new Set(['semanas', 'ultimos', 'ultimas', 'segundo', 'segundos', 'quanta', 'quanto', 'proxima', 'passadas', 'passados', 'treina', 'treine', 'treinador', 'quintal', 'sextas', 'tercas', 'quartas', 'quintas', 'sabados', 'domingos', 'segundas', 'contem', 'hojes', 'seguida', 'seguidas', 'seguido', 'seguidos', 'sequencias', 'passar', 'passei', 'malhado', 'treinado', 'quartos', 'quinto', 'sexto', 'domingueira']);
function dist(a, b){ if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[a.length][b.length]; }
function entender(q){
  let t = nrm(q).replace(/[?!.,;:]+/g, ' ').replace(/(.)\1{2,}/g, '$1').replace(/\s+/g, ' ').trim();
  ABREV.forEach(([re, v]) => { t = t.replace(re, v); });
  return t.split(' ').map(w => { if (w.length < 5 || CHAVES.includes(w) || PROTEGE.has(w) || /\d/.test(w)) return w;
    const perto = x => { let best = null, bd = 9; for (const c of CHAVES) { const k = dist(x, c); if (k < bd) { bd = k; best = c; } } return bd <= (x.length >= 9 ? 2 : 1) ? best : null; };
    const sem2 = w.replace(/(.)\1/g, '$1'); // "treneii", "hojee"
    return perto(w) || (sem2 !== w && (CHAVES.includes(sem2) ? sem2 : perto(sem2))) || w; }).join(' ');
}

/* ---------- Quando: hoje, ontem, semana, dia da semana, data ---------- */
const DIAS_SEM = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const MESES_N = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function somaDias(isoD, n){ const d = fromIso(isoD); d.setDate(d.getDate() + n); return iso(d); }
function periodoDe(t, h){
  const seg = somaDias(h, -((fromIso(h).getDay() + 6) % 7));
  if (/\banteontem\b/.test(t)) { const d = somaDias(h, -2); return { ini: d, fim: d, rot: 'anteontem', dia: true }; }
  if (/\bontem\b/.test(t)) { const d = somaDias(h, -1); return { ini: d, fim: d, rot: 'ontem', dia: true }; }
  if (/\bsemana passada\b|\bultima semana\b/.test(t)) return { ini: somaDias(seg, -7), fim: somaDias(seg, -1), rot: 'na semana passada' };
  if (/\bessa semana\b|\bda semana\b|\bna semana\b|\bsemana\b/.test(t)) return { ini: seg, fim: h, rot: 'nesta semana' };
  if (/\bmes passado\b/.test(t)) { const d = fromIso(h); const ini = iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), fim = iso(new Date(d.getFullYear(), d.getMonth(), 0)); return { ini, fim, rot: 'no mês passado' }; }
  if (/\b(esse|este|neste|nesse|do) mes\b/.test(t)) return { ini: h.slice(0, 8) + '01', fim: h, rot: 'neste mês' };
  let m = t.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/) || t.match(/\bdia (\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  if (m) { const mes = isNaN(m[2]) ? MESES_N.indexOf(m[2]) + 1 : +m[2], y = +h.slice(0, 4), d = `${mes > +h.slice(5, 7) ? y - 1 : y}-${pad(mes)}-${pad(+m[1])}`; return { ini: d, fim: d, rot: `em ${fmtData(d)}`, dia: true }; }
  m = t.match(/\bdia (\d{1,2})\b/); if (m && +m[1] > 5) { const d = h.slice(0, 8) + pad(+m[1]); const dd = d > h ? somaDias(iso(new Date(+h.slice(0, 4), +h.slice(5, 7) - 2, +m[1])), 0) : d; return { ini: dd, fim: dd, rot: `em ${fmtData(dd)}`, dia: true }; }
  const ws = DIAS_SEM.findIndex(w => new RegExp(`\\b${w}\\b`).test(t));
  if (ws > -1) { const back = (fromIso(h).getDay() - ws + 7) % 7 || (/\bpassad|\bultim/.test(t) ? 7 : 0); const d = somaDias(h, -back); return { ini: d, fim: d, rot: back ? `na ${DIAS_SEM[ws].replace('terca', 'terça').replace('sabado', 'sábado')}${ws === 0 || ws === 6 ? '' : '-feira'} (${fmtData(d)})` : 'hoje', dia: true }; }
  if (/\bhoje\b|\bmais cedo\b|\bagora pouco\b|\bagorinha\b|\bainda ha pouco\b/.test(t)) return { ini: h, fim: h, rot: 'hoje', dia: true };
  return null;
}

/* ---------- Perguntas sobre o que foi treinado ---------- */
const VERBO_FEITO = /\b(treinei|treinou|treinamos|malhei|malhou|fiz|fez|fizemos|feito|foi|foram|rolou|teve|tive|puxei|peguei|mandei|completei|conclui|concluido|finalizei|registrei|bati|exercitei|cumpri|fui|frequentei|marquei|treinado|malhado)\b/;
const ASSUNTO_TREINO = /trein|malh|academia|exercicio|checkin|serie|carga|fiz|fez|fui|puxei|peguei|mandei|perna|costas|peito|biceps|triceps|ombro|gluteo|quadriceps|posterior|panturrilha|abdom|cardio|aerobico|esteira/;
const FUTURO = /\b(vou|devo|tenho que|preciso|posso|quero|deveria|irei|treino amanha|amanha|proximo|proxima|o que (eu )?treino|qual treino (eu )?faco|qual (eu )?treino|que treino (eu )?faco|o que (eu )?faco hoje|que dia e hoje|pra hoje|para hoje)\b/;
function linhaSessao(s, det){
  const series = s.itens.reduce((a, i) => a + (+i.series || 0), 0);
  const cab = `${s.nome || 'Treino'}${s.minutos ? ` (${fmtMin(s.minutos)}, ${plural(series, 'série', 'séries')})` : ''}`;
  if (!det) return cab;
  const linhas = s.itens.filter(i => +i.series).map(i => `• ${EX[i.ex]?.nome || i.ex}: ${plural(+i.series, 'série', 'séries')}${i.cargas?.some(c => c !== '' && c != null) ? ' · ' + i.cargas.map(c => c === '' || c == null ? '–' : num(c)).join(' · ') + ' kg' : (i.carga !== '' && i.carga != null ? ' · ' + num(i.carga) + ' kg' : '')}`).join('\n');
  return cab + (linhas ? ':\n' + linhas : '');
}
const diaCurto = d => fromIso(d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + ' ' + fmtData(d);
function sessaoTemGrupo(s, gs){ const nome = nrm(s.nome); return s.itens.some(i => (EX[i.ex]?.alvo || []).slice(0, 2).some(g => gs.includes(g))) || gs.some(g => nome.includes(g.slice(0, 5))); }
function perguntaHistorico(t, h, fezHoje){
  if (/\b(comer|comi|como|comida|dieta|beber|bebi|tomar|tomei|proteina|whey|creatina|agua|alimenta\w*|refeic\w*|lanche|almoco|jantar|cafe|caloria\w*|antes do|depois do|pre treino|pos treino|dormir|dormi|sono)\b/.test(t)) return null;
  const per = periodoDe(t, h), feito = VERBO_FEITO.test(t) && ASSUNTO_TREINO.test(t), futuro = FUTURO.test(t) && !feito;
  const quando = /\bquando\b|\bultima vez\b|\bultimo dia\b|\bfaz quanto tempo\b|\bha quanto tempo\b|\bquantos dias faz\b/.test(t);
  const simNao = !/\b(o que|oque|qual|quais|quanto|quantos|quantas|como)\b/.test(t) && /^(eu )?(ja |hoje |ontem )?(treinei|malhei|fiz|fui|teve|tive|bati|marquei|rolou)\b/.test(t) || /\b(ja|sera que) (eu )?(treinei|malhei|fiz|fui|bati|marquei)\b/.test(t);
  const prox = proximoPlano(), dica = prox ? `\n\nO próximo da sequência é o treino ${letra(S.planos.indexOf(prox))}, ${prox.nome}.` : '';

  // "quando treinei costas pela última vez?", "última vez que fiz supino", "faz quanto tempo que não treino perna?"
  if (quando && (feito || /\btreino de\b|\btreinar\b|\bfazer\b|\bnao (treino|faco|malho)\b/.test(t))) {
    const gs = gruposDoTexto(t).filter(g => g !== 'cardio' || /cardio|aerobico|corrida|esteira/.test(t)), e = gs.length ? null : acharExercicio(t);
    const alvo = e ? s => s.itens.some(i => i.ex === e.id && +i.series) : gs.length ? s => sessaoTemGrupo(s, gs) : () => true;
    const s = [...S.sessoes].reverse().find(alvo), nomeAlvo = e ? e.nome : gs.length ? (t.match(/perna|costas|peito|biceps|triceps|ombro|gluteo|quadriceps|posterior|panturrilha|abdom\w*|cardio|braco/) || ['esse grupo'])[0] : 'treino';
    if (!s) { const ck = [...S.checkins].sort().pop(); return { t: e || gs.length ? `Não achei nenhum treino finalizado com ${nomeAlvo} no app.` : ck ? `Seu último check-in foi ${ck === h ? 'hoje' : 'em ' + fmtData(ck)}, mas sem treino finalizado registrado.` : 'Você ainda não registrou nenhum treino no app.', acao: 'ir:evolucao' }; }
    const dias = Math.round((fromIso(h) - fromIso(s.data)) / 864e5), rel = dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
    return { t: `A última vez ${e || gs.length ? `que você treinou ${nomeAlvo}` : 'que você treinou'} foi ${rel}, ${diaCurto(s.data)}: ${linhaSessao(s, !!e)}.`.replace(/:\.$/, '.'), acao: 'ir:evolucao' };
  }

  // período com pergunta no passado (ou presente, se já fez o check-in do dia)
  if (!per || futuro) return null;
  const hojeSo = per.dia && per.ini === h;
  if (!(feito || (hojeSo && fezHoje && /\btreino\b|\bacademia\b|\bcheckin\b/.test(t)) || (!hojeSo && /\btreino|\bacademia\b|\bcheckin\b/.test(t)))) return null;

  const sess = S.sessoes.filter(s => s.data >= per.ini && s.data <= per.fim);
  const cks = S.checkins.filter(d => d >= per.ini && d <= per.fim).sort();
  const sim = simNao ? 'Sim! ' : '', nao = simNao ? 'Não, n' : 'N';
  if (per.dia) {
    const hora = S.horas?.[per.ini], dHoje = per.ini === h;
    if (sess.length) return { t: `${sim}${per.rot[0].toUpperCase() + per.rot.slice(1)} você treinou ${sess.map(s => linhaSessao(s, true)).join('\n\n')}${hora ? `\n\nCheck-in feito às ${hora}. ✅` : ''}${dHoje ? dica : ''}`, acao: dHoje ? 'ir:hoje' : 'ir:evolucao' };
    if (cks.length) return { t: `${sim}Você fez check-in ${per.rot}${hora ? ` às ${hora}` : ''} ✅, mas não finalizou um treino pelo app, então não sei quais exercícios foram. Da próxima vez, inicie o treino em Hoje e toque em Finalizar que eu registro tudo.${dHoje ? dica : ''}`, acao: 'ir:hoje' };
    return { t: `${nao}ão tem treino nem check-in registrado ${per.rot}.${dHoje && prox ? ` O treino da vez é o ${letra(S.planos.indexOf(prox))}, ${prox.nome}:\n\n${resumoTreino(prox)}` : ''}`, acao: dHoje ? 'ir:hoje' : 'ir:evolucao' };
  }
  const dias = [...new Set([...cks, ...sess.map(s => s.data)])].sort();
  if (!dias.length) return { t: `${nao}ão tem treino registrado ${per.rot}.`, acao: 'ir:evolucao' };
  const lista = dias.map(d => { const ss = sess.filter(s => s.data === d); return `• ${diaCurto(d)}: ${ss.length ? ss.map(s => linhaSessao(s, false)).join(' + ') : 'check-in (treino não finalizado no app)'}`; }).join('\n');
  return { t: `${sim}${per.rot[0].toUpperCase() + per.rot.slice(1)} você treinou ${plural(dias.length, 'dia', 'dias')}:\n\n${lista}`, acao: 'ir:evolucao' };
}

/* ---------- Montar treino a pedido ---------- */
function montarPedido(grupos, t){
  const nivel = S.perfil?.nivel || 'iniciante', es = esquema(), casa = /casa|sem (equipamento|aparelho|academia)|peso do corpo/.test(t), curto = /rapido|curto|30 ?min|pouco tempo/.test(t);
  const ok = e => !casa || /Peso do corpo|Colchonete|Halter|Banco|Corda|caixa/.test(e.aparelho);
  const curados = Exercicios.lista.filter(e => !e.id.startsWith('x-') && ok(e)), usados = new Set(), itens = [];
  const nota = e => (e.tipo === 'C' ? 4 : 0) + (nivel === 'iniciante' && /Máquina|Polia|Peso do corpo|Smith/.test(e.aparelho) ? 2 : 0) + (nivel === 'avancado' && /Barra|Halter/.test(e.aparelho) ? 2 : 0) + Math.random() * .5;
  const musc = grupos.filter(g => g !== 'cardio');
  musc.forEach(g => {
    let n = curto ? 1 : GRANDES.includes(g) ? (musc.length > 3 ? 2 : 3) : 2; if (g === 'abdomen' || g === 'lombar') n = curto ? 1 : 2;
    curados.filter(e => e.alvo[0] === g && !usados.has(e.id)).sort((a, b) => nota(b) - nota(a)).slice(0, n)
      .forEach(e => { usados.add(e.id); itens.push({ ex: e.id, series: e.tempo ? 3 : es.series, reps: e.tempo ? '30 s' : es.reps, descanso: es.descanso }); });
  });
  if (grupos.includes('cardio') || querCardio()) itens.push({ ex: casa ? 'polichinelo' : 'aerobico', series: 1, reps: casa ? '3 × 1 min' : curto ? '10 min' : '20 a 30 min', descanso: 0 });
  const nome = musc.length ? cap(lista(musc.map(g => ALVO[g] || g))) : 'Aeróbico';
  return { nome: casa ? nome + ' (em casa)' : nome, itens };
}
function salvarProposta(i){
  const n = nutri(), pr = n.proposta; if (!pr) return;
  const dest = S.planos[i]; if (!dest) return;
  if (dest.itens.length && !confirm(`O dia ${i + 1} (${dest.nome}) já tem exercícios. Substituir pelo treino de ${pr.nome}?`)) return;
  dest.nome = pr.nome; dest.itens = pr.itens.map(x => ({ ...x })); n.proposta = null;
  falar(`Feito! Salvei o treino de ${pr.nome} no dia ${i + 1} (treino ${letra(i)}). Quer ver ou ajustar?`, { acao: `ir:treinos` }); save(); renderChat(true); toast(`Treino salvo no dia ${i + 1}`);
}

/* ---------- Intenções sobre o app ---------- */
function respostaApp(q){
  const t = entender(q), n = nutri(), h = hoje();
  const tem_ = (...ws) => ws.some(w => t.includes(w));

  // o que a pessoa treinou (hoje, ontem, na semana, num dia, por grupo ou exercício)
  const fezHoje = S.checkins.includes(h);
  const hist = perguntaHistorico(t, h, fezHoje); if (hist) return hist;

  // montar / criar treino
  if (/\b(mont|cri|gera|faz|faca|fazer|monta|sugere|sugira|prepara)\w*\b.*\btreino|treino de .* pra mim|quero (um )?treino/.test(t) && !/sozinho|como (eu )?monto|antes d|depois d|pre.?treino|pos.?treino|comer|dieta/.test(t)) {
    const grupos = gruposDoTexto(t), dia = acharDia(t);
    if (!grupos.length) return { t: 'Bora! Qual grupo muscular você quer treinar? Por exemplo: "monta um treino de peito e tríceps para o dia 4", "treino de pernas em casa" ou "treino rápido de costas".' };
    const pr = montarPedido(grupos, t); n.proposta = { ...pr, dia };
    return { t: `Montei um treino de ${pr.nome} para o seu objetivo (${esquema().series} séries de ${esquema().reps}):\n\n${pr.itens.map(it => `• ${EX[it.ex]?.nome}: ${+it.series === 1 ? it.reps : it.series + ' × ' + it.reps}`).join('\n')}\n\n${dia > -1 ? `Quer salvar no dia ${dia + 1}?` : 'Em qual dia você quer salvar?'}`, acao: 'proposta' };
  }
  // adicionar / tirar exercício de um treino
  if (/\b(adiciona|coloca|inclui|bota|poe)\w*\b/.test(t)) {
    const e = acharExercicio(t), dia = acharDia(t);
    if (e && dia > -1) { const p = S.planos[dia], es = esquema(); p.itens.push({ ex: e.id, series: e.tempo ? 3 : es.series, reps: e.tempo ? '30 s' : es.reps, descanso: es.descanso }); save(); return { t: `Pronto! Adicionei ${e.nome} no ${p.nome} (dia ${dia + 1}), como ${p.itens.length}º exercício.`, acao: 'ir:treinos' }; }
    if (e) return { t: `Em qual treino coloco ${e.nome}? Diga, por exemplo, "adiciona ${e.nome.toLowerCase()} no dia 2" ou "no treino B".` };
  }
  if (/\b(tira|remove|retira|exclui)\w*\b/.test(t) && !/conversa|chat|mensage/.test(t)) {
    const e = acharExercicio(t), dia = acharDia(t);
    if (e && dia > -1) { const p = S.planos[dia], k = p.itens.findIndex(x => x.ex === e.id); if (k > -1) { p.itens.splice(k, 1); save(); return { t: `Tirei ${e.nome} do ${p.nome} (dia ${dia + 1}).`, acao: 'ir:treinos' }; } return { t: `${e.nome} não está no ${p.nome}.` }; }
  }
  // onde fica / como faz
  if (tem_('onde', 'como faco', 'como eu', 'como mudo', 'como troco', 'como coloco', 'como vejo', 'cade', 'tem como', 'da pra')) {
    for (const [re, v] of ONDE) if (re.test(t)) return { t: `Na aba ${TELAS[v].nome} ${TELAS[v].desc}`, acao: 'ir:' + v };
  }
  if (tem_('abas', 'o que o app faz', 'como funciona o app', 'funcoes do app', 'me explica o app', 'organograma')) return { t: Object.values(TELAS).map(x => `• ${x.nome}: ${x.desc.replace(/^fica[m]? /, '').replace(/^sou eu! /, '')}`).join('\n') };

  // estatísticas
  if (tem_('quantos treinos', 'quantas vezes', 'quantos check', 'frequencia', 'sequencia', 'dias seguidos', 'semanas seguidas', 'recorde de dias', 'constancia')) {
    const mes = S.checkins.filter(d => d.startsWith(h.slice(0, 7))).length;
    return { t: `Você tem ${S.checkins.length} check-ins no total e ${S.sessoes.length} treinos concluídos. Este mês: ${mes}. Agora você está com ${plural(semanasSeguidas(), 'semana seguida', 'semanas seguidas')} e ${plural(streakDias(), 'dia seguido', 'dias seguidos')}; seu recorde é de ${plural(recordeDias(), 'dia', 'dias')}. ${semanasSeguidas() >= 4 ? 'Que constância! 🔥' : 'Bora manter! 💪'}`, acao: 'ir:evolucao' };
  }
  if (tem_('ultimo treino', 'treinei ontem', 'meu ultimo')) {
    const s = S.sessoes[S.sessoes.length - 1]; if (!s) return { t: 'Você ainda não finalizou nenhum treino no app.' };
    return { t: `Seu último treino foi ${s.nome}, em ${fmtData(s.data)}${s.minutos ? `, com ${fmtMin(s.minutos)}` : ''} e ${plural(s.itens.reduce((a, i) => a + i.series, 0), 'série', 'séries')}.${s.itens.some(i => i.carga !== '' && i.carga != null) ? '\n\n' + s.itens.filter(i => i.carga !== '' && i.carga != null).map(i => `• ${EX[i.ex]?.nome}: ${i.cargas?.length ? i.cargas.map(num).join(' · ') : num(i.carga)} kg`).join('\n') : ''}`, acao: 'ir:evolucao' };
  }
  if (tem_('meu peso', 'quanto peso', 'perdi peso', 'ganhei peso', 'emagreci', 'evolucao do peso')) {
    const ps = [...S.pesos].sort((a, b) => a.data.localeCompare(b.data)); if (!ps.length) return { t: 'Você ainda não registrou seu peso. Dá para registrar em Evolução › Peso corporal.', acao: 'ir:evolucao' };
    const d = Math.round((ps[ps.length - 1].kg - ps[0].kg) * 10) / 10;
    return { t: `Seu último peso registrado é ${num(ps[ps.length - 1].kg)} kg (${fmtData(ps[ps.length - 1].data)}). ${ps.length > 1 ? `Desde ${fmtData(ps[0].data)}, a diferença é de ${d > 0 ? '+' : ''}${num(d)} kg.` : ''}`, acao: 'ir:evolucao' };
  }
  if (tem_('carga', 'quanto peguei', 'quanto levantei', 'evolui', 'evolucao no', 'evolucao do', 'recorde no', 'recorde do', 'meu recorde')) {
    const e = acharExercicio(t);
    if (e) { const hs = historicoDe(e.id); if (!hs.length) return { t: `Ainda não tenho cargas registradas de ${e.nome}. Elas aparecem quando você anota o peso das séries no treino.` };
      const rec = Math.max(...hs.map(o => +o.it.carga || 0)), d = Math.round((hs[hs.length - 1].it.carga - hs[0].it.carga) * 10) / 10;
      evoEx = e.id;
      return { t: `${e.nome}: seu recorde é ${num(rec)} kg. ${hs.length > 1 ? `Desde ${fmtData(hs[0].s.data)} você ${d >= 0 ? 'subiu' : 'baixou'} ${num(Math.abs(d))} kg.` : ''}\n\nÚltimas vezes:\n${hs.slice(-4).reverse().map(o => `• ${fmtData(o.s.data)}: ${o.it.cargas?.length ? o.it.cargas.map(c => c === '' ? '–' : num(c)).join(' · ') : num(o.it.carga)} kg`).join('\n')}`, acao: 'ir:evolucao' }; }
    const recs = [...new Set(S.sessoes.flatMap(s => s.itens.map(i => i.ex)))].map(id => ({ id, rec: Math.max(0, ...historicoDe(id).map(o => +o.it.carga || 0)) })).filter(x => x.rec).sort((a, b) => b.rec - a.rec).slice(0, 5);
    if (recs.length) return { t: `Seus maiores recordes de carga:\n${recs.map(x => `• ${EX[x.id]?.nome}: ${num(x.rec)} kg`).join('\n')}\n\nPergunte de um exercício, por exemplo "minha evolução no supino".`, acao: 'ir:evolucao' };
  }
  // treinos cadastrados
  if (/proximo treino|treino de hoje|treino hoje|o que (eu )?treino hoje/.test(t) && !/\b(comer|comi|dieta|beber|tomar|antes do|depois do|lanche|refeic\w*)\b/.test(t)) {
    const p = proximoPlano(); if (!p || !p.itens.length) return { t: 'Seus treinos ainda estão vazios. Quer que eu monte um? Diga, por exemplo, "monta um treino de peito para o dia 1".' };
    const i = S.planos.indexOf(p); return { t: `${fezHoje ? 'Seu próximo treino é o' : 'Hoje é o treino'} ${letra(i)}, ${p.nome} (dia ${i + 1}):\n\n${resumoTreino(p)}${S.ativo ? '\n\nVocê já tem um treino em andamento.' : ''}`, acao: 'ir:hoje' };
  }
  if (/\b(meus|quais|mostra|lista)\b.*\btreinos\b|\btreino [a-e]\b|\bdia [1-5]\b/.test(t) && !tem_('dieta', 'refei')) {
    const dia = acharDia(t);
    if (dia > -1) { const p = S.planos[dia]; return { t: `Treino ${letra(dia)} · ${p.nome} (dia ${dia + 1}):\n\n${resumoTreino(p)}`, acao: 'ir:treinos' }; }
    return { t: S.planos.map((p, i) => `• ${letra(i)} · ${p.nome}: ${p.itens.length ? plural(p.itens.length, 'exercício', 'exercícios') : 'vazio'}`).join('\n') + '\n\nPergunte de um dia para ver os exercícios, por exemplo "o que tem no treino C?".', acao: 'ir:treinos' };
  }
  // perfil
  if (tem_('meu perfil', 'meus objetivos', 'meu objetivo', 'meu imc', 'meu nivel')) {
    const pf = S.perfil, imc = pf.peso / (pf.altura / 100) ** 2;
    return { t: `Seu perfil: ${num(pf.peso)} kg, ${pf.altura} cm (IMC ${num(Math.round(imc * 10) / 10)}), nível ${NIVEL[pf.nivel || 'iniciante'][0].toLowerCase()}. Objetivos: ${nomesObj().toLowerCase()}. Você muda isso em Ajustes › Seu perfil.`, acao: 'ir:ajustes' };
  }
  if (tem_('foto', 'fotos') && tem_('treino', 'minhas', 'galeria')) { const k = S.sessoes.filter(s => s.foto).length; return { t: k ? `Você tem ${plural(k, 'foto', 'fotos')} de treino. Elas ficam em Evolução › Fotos dos treinos, e dá para gerar a versão story de cada uma.` : 'Você ainda não tem fotos de treino. Ao finalizar um treino, toque em "Tirar foto" ou "Da galeria".', acao: 'ir:evolucao' }; }
  return null;
}

/* ---------- Contexto completo para a IA (quando ligada) ---------- */
function contextoApp(){
  return {
    treinos: S.planos.map((p, i) => ({ dia: i + 1, letra: letra(i), nome: p.nome, exercicios: p.itens.map(it => `${EX[it.ex]?.nome} ${it.series}x${it.reps}`) })),
    proximo: proximoPlano()?.nome, checkins: S.checkins.length, concluidos: S.sessoes.length, semanasSeguidas: semanasSeguidas(), diasSeguidos: streakDias(), recordeDias: recordeDias(),
    ultimosTreinos: S.sessoes.slice(-5).map(s => ({ data: s.data, nome: s.nome, minutos: s.minutos, cargas: s.itens.filter(i => i.carga !== '' && i.carga != null).map(i => `${EX[i.ex]?.nome}: ${(i.cargas?.length ? i.cargas : [i.carga]).join('/')} kg`) })),
    hoje: hoje(), checkinHoje: S.checkins.includes(hoje()) ? (S.horas?.[hoje()] || true) : false, checkinsRecentes: [...S.checkins].sort().slice(-14),
    treinosFeitosHoje: S.sessoes.filter(s => s.data === hoje()).map(s => ({ nome: s.nome, minutos: s.minutos, exercicios: s.itens.map(i => `${EX[i.ex]?.nome} ${i.series} séries`) })),
    pesos: S.pesos.slice(-6), telas: Object.fromEntries(Object.entries(TELAS).map(([k, v]) => [v.nome, v.desc]))
  };
}

/* ---------- Integração com a conversa ---------- */
const _respostaLocalBase = respostaLocal;
respostaLocal = q => respostaApp(q) || _respostaLocalBase(q);
const _bolhaBase = bolha;
bolha = msg => {
  if (msg.acao === 'proposta') {
    const pr = nutri().proposta;
    const botoes = !pr ? '' : pr.dia > -1
      ? `<button class="btn sm primary mu-ir" onclick="salvarProposta(${pr.dia})">Salvar no dia ${pr.dia + 1}</button><button class="btn sm mu-ir" onclick="nutri().proposta.dia=-1;save();renderChat(false)">Escolher outro dia</button>`
      : `<div class="mu-dias">${S.planos.map((p, i) => `<button class="chip" onclick="salvarProposta(${i})" aria-label="Salvar no dia ${i + 1}, ${esc(p.nome)}">${letra(i)} · ${esc(p.nome).slice(0, 14)}</button>`).join('')}</div>`;
    return _bolhaBase({ ...msg, acao: null }).replace(/<\/div><\/div>$/, `${botoes}</div></div>`);
  }
  if (/^ir:/.test(msg.acao || '')) {
    const v = msg.acao.slice(3);
    return _bolhaBase({ ...msg, acao: null }).replace(/<\/div><\/div>$/, `<button class="btn sm mu-ir" onclick="irTela('${v}')">Ir para ${TELAS[v]?.nome || v} ›</button></div></div>`);
  }
  return _bolhaBase(msg);
};
