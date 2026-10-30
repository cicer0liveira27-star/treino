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
  const t = nrm(q), n = nutri(), h = hoje();
  const tem_ = (...ws) => ws.some(w => t.includes(w));

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
  if (/proximo treino|treino de hoje|treino hoje|o que (eu )?treino hoje/.test(t)) {
    const p = proximoPlano(); if (!p || !p.itens.length) return { t: 'Seus treinos ainda estão vazios. Quer que eu monte um? Diga, por exemplo, "monta um treino de peito para o dia 1".' };
    const i = S.planos.indexOf(p); return { t: `Hoje é o treino ${letra(i)}, ${p.nome} (dia ${i + 1}):\n\n${resumoTreino(p)}${S.ativo ? '\n\nVocê já tem um treino em andamento.' : ''}`, acao: 'ir:hoje' };
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
