/* Musculinho — assistente de dieta, descanso e treinos do Musculito.
   Funciona sem internet com regras baseadas em:
   - ISSN Position Stand: Protein and Exercise (2017): 1,4 a 2,0 g de proteína por kg/dia para quem treina.
   - Guia Alimentar para a População Brasileira (Ministério da Saúde): base em alimentos in natura
     e minimamente processados, evitando ultraprocessados.
   - Gasto de energia estimado pela equação de Mifflin-St Jeor.
   Quando IA_URL (index.html) estiver configurado, perguntas livres vão para a IA. */

/* ---------- Alimentos (porções-base; as quantidades são ajustadas às calorias de cada refeição) ---------- */
// item: [nome, quantidade, unidade, kcal, etiquetas]  etiquetas: c=carne/frango, p=peixe, o=ovo, l=leite/derivado, g=glúten, x=livre (não escala)
const CARDAPIO = {
  cafe: [
    [['Pão francês', 1, 'un', 135, 'g'], ['Ovos mexidos', 2, 'un', 150, 'o'], ['Mamão', 1, 'fatia', 60, ''], ['Café com leite', 1, 'xíc', 90, 'l']],
    [['Tapioca (goma)', 3, 'col. sopa', 200, ''], ['Queijo branco', 2, 'fatias', 120, 'l'], ['Banana', 1, 'un', 90, ''], ['Café sem açúcar', 1, 'xíc', 0, 'x']],
    [['Iogurte natural', 1, 'pote', 110, 'l'], ['Aveia em flocos', 3, 'col. sopa', 110, ''], ['Banana', 1, 'un', 90, ''], ['Pasta de amendoim', 1, 'col. sopa', 95, '']],
    [['Pão integral', 2, 'fatias', 140, 'g'], ['Pasta de amendoim', 1, 'col. sopa', 95, ''], ['Banana', 1, 'un', 90, ''], ['Bebida vegetal', 1, 'copo', 80, '']],
    [['Cuscuz de milho', 1, 'xíc', 180, ''], ['Ovos cozidos', 2, 'un', 150, 'o'], ['Melão', 1, 'fatia', 30, ''], ['Café sem açúcar', 1, 'xíc', 0, 'x']]
  ],
  refeicao: [
    [['Arroz', 4, 'col. sopa', 160, ''], ['Feijão', 1, 'concha', 110, ''], ['Frango grelhado', 120, 'g', 200, 'c'], ['Salada verde', 1, 'prato', 20, 'x'], ['Legumes refogados', 1, 'xíc', 60, ''], ['Azeite', 1, 'col. chá', 40, '']],
    [['Arroz integral', 4, 'col. sopa', 150, ''], ['Feijão', 1, 'concha', 110, ''], ['Carne magra (patinho)', 100, 'g', 220, 'c'], ['Salada verde', 1, 'prato', 20, 'x'], ['Abóbora cozida', 1, 'xíc', 70, '']],
    [['Batata-doce', 150, 'g', 130, ''], ['Peixe grelhado', 150, 'g', 180, 'p'], ['Brócolis', 1, 'xíc', 35, ''], ['Feijão', 1, 'concha', 110, ''], ['Salada verde', 1, 'prato', 20, 'x'], ['Azeite', 1, 'col. sopa', 90, '']],
    [['Arroz', 4, 'col. sopa', 160, ''], ['Feijão', 2, 'conchas', 220, ''], ['Ovos (cozidos ou mexidos)', 2, 'un', 150, 'o'], ['Salada verde', 1, 'prato', 20, 'x'], ['Legumes refogados', 1, 'xíc', 60, '']],
    [['Arroz', 4, 'col. sopa', 160, ''], ['Lentilha ou grão-de-bico', 1, 'concha cheia', 180, ''], ['Tofu grelhado', 100, 'g', 120, ''], ['Salada verde', 1, 'prato', 20, 'x'], ['Legumes refogados', 1, 'xíc', 60, ''], ['Azeite', 1, 'col. chá', 40, '']]
  ],
  lanche: [
    [['Iogurte natural', 1, 'pote', 110, 'l'], ['Fruta', 1, 'un', 70, ''], ['Castanhas', 15, 'g', 90, '']],
    [['Pão integral', 2, 'fatias', 140, 'g'], ['Frango desfiado', 40, 'g', 70, 'c'], ['Queijo branco', 1, 'fatia', 60, 'l']],
    [['Fruta', 1, 'un', 70, ''], ['Pasta de amendoim', 1, 'col. sopa', 95, ''], ['Bebida vegetal', 1, 'copo', 80, '']],
    [['Leite', 200, 'ml', 120, 'l'], ['Banana', 1, 'un', 90, ''], ['Aveia em flocos', 2, 'col. sopa', 70, '']],
    [['Ovos cozidos', 2, 'un', 150, 'o'], ['Fruta', 1, 'un', 70, '']]
  ],
  ceia: [
    [['Iogurte natural', 1, 'pote', 110, 'l'], ['Chia', 1, 'col. sopa', 60, '']],
    [['Fruta', 1, 'un', 70, ''], ['Castanhas', 15, 'g', 90, '']],
    [['Ovos cozidos', 2, 'un', 150, 'o']]
  ]
};
const REFEICOES = { 3: ['cafe', 'almoco', 'jantar'], 4: ['cafe', 'almoco', 'lanche', 'jantar'], 5: ['cafe', 'lanche1', 'almoco', 'lanche', 'jantar'], 6: ['cafe', 'lanche1', 'almoco', 'lanche', 'jantar', 'ceia'] };
const REF_INFO = {
  cafe: ['Café da manhã', 'cafe', 22], lanche1: ['Lanche da manhã', 'lanche', 10], almoco: ['Almoço', 'refeicao', 30],
  lanche: ['Lanche da tarde', 'lanche', 13], jantar: ['Jantar', 'refeicao', 25], ceia: ['Ceia', 'ceia', 8]
};
const SAUDE = { gestante: 'Gestante ou amamentando', diabetes: 'Diabetes', renal: 'Problema nos rins', pressao: 'Pressão alta', transtorno: 'Histórico de transtorno alimentar', outra: 'Outra condição de saúde' };
const RESTR = { vegetariano: 'Vegetariano', vegano: 'Vegano', 'sem-lactose': 'Sem lactose', 'sem-gluten': 'Sem glúten' };

/* ---------- Estado ---------- */
function nutri(){ return S.nutri ||= { r: {}, chat: [], plano: null, aba: 'chat' }; }

/* ---------- Cálculo das metas ---------- */
const hm = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const hhmm = m => { m = ((Math.round(m / 15) * 15) % 1440 + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
function metasDieta(r){
  const pf = S.perfil, peso = +pf.peso, alt = +pf.altura, idade = +r.idade;
  const tmb = 10 * peso + 6.25 * alt - 5 * idade + ({ m: 5, f: -161 }[r.sexo] ?? -78);
  const fator = { sentado: 1.45, leve: 1.55, ativo: 1.7 }[r.atividade] || 1.5;
  const gasto = tmb * fator, imc = peso / (alt / 100) ** 2;
  let ajuste = 0, foco = 'manter o peso com mais saúde e energia';
  const avisos = [];
  if (tem('emagrecer') && imc < 18.5) avisos.push('Seu IMC já está abaixo de 18,5, então não montei um plano para emagrecer. O foco ficou em manter o peso com boa nutrição. Vale conversar com um nutricionista.');
  else if (tem('emagrecer') && (tem('hipertrofia') || tem('forca'))) { ajuste = -.10; foco = 'perder gordura mantendo ou ganhando músculo (recomposição)'; }
  else if (tem('emagrecer')) { ajuste = -.18; foco = 'perder gordura de forma gradual, cerca de 0,5 kg por semana'; }
  else if (tem('definir')) { ajuste = -.12; foco = 'definir, com um déficit leve de calorias'; }
  else if (tem('hipertrofia')) { ajuste = .10; foco = 'ganhar massa muscular com um superávit leve'; }
  else if (tem('forca')) { ajuste = .05; foco = 'ganhar força com energia de sobra para os treinos'; }
  const piso = Math.max(tmb * 1.05, r.sexo === 'm' ? 1500 : 1200);
  const kcal = Math.round(Math.max(piso, gasto * (1 + ajuste)) / 10) * 10;
  const protKg = ajuste < 0 ? 2.0 : tem('hipertrofia') || tem('forca') ? 1.8 : 1.6;
  const prot = Math.round(peso * protKg), gord = Math.round(Math.max(peso * .9, kcal * .22 / 9));
  const carb = Math.max(100, Math.round((kcal - prot * 4 - gord * 9) / 4));
  return { kcal, prot, gord, carb, protKg, agua: Math.round(peso * 35 / 100) / 10, gasto: Math.round(gasto / 10) * 10, foco, avisos, imc };
}

/* ---------- Cardápio ---------- */
function permitido(item, r){
  const t = item[4], rs = r.restricoes || [];
  if (rs.includes('vegano') && /[cpol]/.test(t)) return false;
  if (rs.includes('vegetariano') && /[cp]/.test(t)) return false;
  return true;
}
function adaptar(item, r){
  let [nome] = item; const rs = r.restricoes || [];
  if (rs.includes('sem-lactose') && /l/.test(item[4])) nome += ' (sem lactose)';
  if (rs.includes('sem-gluten') && /g/.test(item[4])) nome = nome.replace('Pão francês', 'Tapioca').replace('Pão integral', 'Pão sem glúten');
  if (rs.includes('sem-gluten') && nome === 'Aveia em flocos') nome = 'Aveia sem glúten';
  return nome;
}
function porcao(qtd, un, k){
  let q = qtd * k;
  if (/^(g|ml)$/.test(un)) q = Math.max(10, Math.round(q / 10) * 10);
  else if (/^(un|fatia|fatias)$/.test(un)) q = Math.max(1, Math.round(q));
  else q = Math.max(.5, Math.round(q * 2) / 2);
  const txt = String(q).replace('.', ',').replace(',5', '½').replace(/^0½/, '½');
  const plural = q > 1 && /^(un|fatia|xíc|copo|pote|concha)$/.test(un) ? { fatia: 'fatias', copo: 'copos', pote: 'potes', concha: 'conchas', 'xíc': 'xíc' }[un] || un : un;
  return /^(g|ml)$/.test(un) ? `${txt} ${un}` : `${txt} ${plural}`;
}
function opcoesRefeicao(tipo, kcal, r, idx, restrito){
  const lista_ = CARDAPIO[tipo].filter(op => op.every(it => permitido(it, r)));
  const ops = [];
  for (let j = 0; j < lista_.length && ops.length < 2; j++) {
    const op = lista_[(idx + j) % lista_.length], base = op.reduce((s, it) => s + it[3], 0) || 1, k = Math.min(2.2, Math.max(.6, kcal / base));
    ops.push(op.map(it => ({ nome: adaptar(it, r), qtd: restrito ? '' : it[4] === 'x' ? 'à vontade' : porcao(it[1], it[2], k) })));
  }
  return ops;
}
function montarRefeicoes(r, m, restrito){
  const chaves = REFEICOES[r.refeicoes] || REFEICOES[5];
  const tot = chaves.reduce((s, c) => s + REF_INFO[c][2], 0);
  const acorda = hm(r.acorda || '06:30'), dorme = hm(r.dorme || '22:30') + (hm(r.dorme) < hm(r.acorda) ? 1440 : 0);
  const hora = { cafe: acorda + 30, almoco: Math.min(Math.max(acorda + 300, 720), dorme - 540), jantar: dorme - 180, ceia: dorme - 60 };
  hora.lanche1 = (hora.cafe + hora.almoco) / 2; hora.lanche = (hora.almoco + hora.jantar) / 2;
  const treinoMin = { manha: acorda + 120, tarde: 16 * 60, noite: 19 * 60 + 30 }[r.treinoHora] ?? 18 * 60;
  const out = chaves.map((c, i) => {
    const [nome, tipo, pct] = REF_INFO[c], kcal = Math.round(m.kcal * pct / tot / 10) * 10;
    return { chave: c, nome, hora: hhmm(hora[c]), min: hora[c], kcal: restrito ? null : kcal, opcoes: opcoesRefeicao(tipo, kcal, r, i, restrito), nota: '' };
  });
  const antes = [...out].filter(x => x.min <= treinoMin - 45).pop(), depois = out.find(x => x.min >= treinoMin + 30);
  if (antes) antes.nota = 'Antes do treino: dê preferência a carboidratos fáceis de digerir (fruta, pão, tapioca) e um pouco de proteína, de 1 a 2 horas antes.';
  if (depois) depois.nota = 'Depois do treino: inclua uma boa fonte de proteína e carboidrato para recuperar.';
  return out;
}

/* ---------- Descanso ---------- */
function rotinaDescanso(r){
  const sono = ((hm(r.acorda) - hm(r.dorme)) + 1440) % 1440 / 60, d = [];
  d.push(sono < 7 ? `Hoje você dorme cerca de ${String(Math.round(sono * 10) / 10).replace('.', ',')} h. Tente chegar a 7 a 9 horas: é durante o sono que o músculo se recupera.`
    : `Você dorme cerca de ${String(Math.round(sono * 10) / 10).replace('.', ',')} h por noite. Ótimo, mantenha entre 7 e 9 horas.`);
  d.push(`Horário sugerido: deitar às ${r.dorme || '22:30'} e acordar às ${r.acorda || '06:30'}, inclusive no fim de semana, para manter o relógio do corpo regulado.`);
  d.push('Com 5 treinos por semana, use os 2 dias livres para descanso ativo: caminhada leve, alongamento ou bicicleta tranquila.');
  d.push('Evite treinar o mesmo grupo muscular em dias seguidos. Cada músculo precisa de cerca de 48 horas para se recuperar.');
  d.push('Café e outros estimulantes só até umas 6 horas antes de dormir. Na última hora antes de deitar, diminua as telas e a luz forte.');
  d.push('Sentiu dor que não passa, cansaço excessivo ou queda de desempenho por vários dias? Descanse um dia a mais e, se continuar, procure um profissional.');
  return d;
}

/* ---------- Treinos sugeridos ---------- */
function gerarTreinos(){
  const nivel = S.perfil?.nivel || 'iniciante', es = esquema(), usados = new Set();
  const curados = Exercicios.lista.filter(e => !e.id.startsWith('x-'));
  const nota = e => (e.tipo === 'C' ? 4 : 0) + (usados.has(e.id) ? -6 : 0)
    + (nivel === 'iniciante' && /Máquina|Polia|Peso do corpo|Colchonete|Smith/.test(e.aparelho) ? 2 : 0)
    + (nivel === 'avancado' && /Barra|Halter/.test(e.aparelho) ? 2 : 0);
  return divisao().map(([nome, alvos]) => {
    const itens = [];
    alvos.filter(a => a !== 'cardio').forEach(a => {
      const n = GRANDES.includes(a) ? (nivel === 'iniciante' ? 2 : 3) : 2;
      curados.filter(e => e.alvo[0] === a).sort((x, y) => nota(y) - nota(x)).slice(0, n)
        .forEach(e => { usados.add(e.id); itens.push({ ex: e.id, series: e.tempo ? 3 : es.series, reps: e.tempo ? '30 s' : es.reps, descanso: es.descanso }); });
    });
    if (alvos.includes('cardio') || querCardio()) itens.push({ ex: 'aerobico', series: 1, reps: querCardio() ? '20 a 30 min' : '10 min', descanso: 0 });
    return { nome, itens };
  });
}

/* ---------- Plano completo ---------- */
function gerarPlano(){
  const n = nutri(), r = n.r, saude = (r.saude || []).filter(x => x !== 'nenhuma');
  const menor = +r.idade < 18, transtorno = saude.includes('transtorno');
  const restrito = menor || saude.length > 0;
  const m = metasDieta(r);
  const p = { data: hoje(), restrito, transtorno, menor, saude, metas: restrito ? null : m, avisos: [...(restrito ? [] : m.avisos)] };
  if (transtorno) p.avisos.unshift('Como você marcou histórico de transtorno alimentar, eu não monto plano de dieta nem falo de calorias. O melhor caminho é um acompanhamento com nutricionista e psicólogo. Separei aqui só a rotina de descanso e os treinos.');
  else if (menor) p.avisos.unshift('Como você tem menos de 18 anos, não calculo calorias nem quantidades. Montei só uma organização das refeições com alimentos saudáveis. Para um plano com números, procure um nutricionista junto com seus responsáveis.');
  else if (saude.length) p.avisos.unshift(`Como você marcou ${lista(saude.map(s => SAUDE[s].toLowerCase()))}, não calculei calorias nem quantidades: isso precisa de acompanhamento de um nutricionista e do seu médico. Deixei uma organização das refeições com alimentos saudáveis como ponto de partida.`);
  p.refeicoes = transtorno ? [] : montarRefeicoes(r, m, restrito);
  p.descanso = rotinaDescanso(r);
  p.treinos = gerarTreinos();
  p.dicas = [
    'Monte o prato com comida de verdade: arroz, feijão, legumes, verduras, frutas, ovos, carnes e leite. Evite ultraprocessados como salgadinhos, refrigerantes e embutidos.',
    'Cozinhe quando puder e coma com calma, de preferência em horários regulares.',
    ...(restrito ? [] : [`Distribua a proteína ao longo do dia: cerca de ${Math.round(m.prot / Math.max(3, (REFEICOES[r.refeicoes] || REFEICOES[5]).length - 1))} g em cada refeição principal.`]),
    `Beba água ao longo do dia${restrito ? '' : `: cerca de ${String(m.agua).replace('.', ',')} litros`}, mais nos dias quentes e de treino.`,
    'Não precisa ser perfeito: seguir o plano na maior parte da semana já traz resultado.'
  ];
  n.plano = p; save(); return p;
}

/* ---------- Conversa guiada ---------- */
const ETAPAS = [
  { id: 'saude', multi: true, txt: () => 'Antes de tudo, alguma dessas situações se aplica a você?', ops: () => [['nenhuma', 'Nenhuma'], ...Object.entries(SAUDE)] },
  { id: 'idade', num: [12, 100], txt: () => 'Quantos anos você tem?', ph: 'Ex.: 28' },
  { id: 'sexo', txt: () => 'Para estimar quanta energia você gasta, qual cálculo devo usar?', ops: () => [['m', 'Masculino'], ['f', 'Feminino'], ['x', 'Prefiro não dizer']], pular: r => r.idade < 18 || (r.saude || []).some(s => s !== 'nenhuma') },
  { id: 'atividade', txt: () => 'Fora da academia, como é o seu dia?', ops: () => [['sentado', 'Passo a maior parte sentado'], ['leve', 'Fico em pé ou ando um pouco'], ['ativo', 'Bem ativo, com esforço físico']], pular: r => r.idade < 18 || (r.saude || []).some(s => s !== 'nenhuma') },
  { id: 'treinoHora', txt: () => 'Em que horário você costuma treinar?', ops: () => [['manha', 'Manhã'], ['tarde', 'Tarde'], ['noite', 'Noite']], pular: r => (r.saude || []).includes('transtorno') },
  { id: 'horas', horas: true, txt: () => 'Que horas você costuma acordar e dormir?' },
  { id: 'refeicoes', txt: () => 'Quantas refeições por dia funcionam na sua rotina?', ops: () => [['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], pular: r => (r.saude || []).includes('transtorno') },
  { id: 'restricoes', multi: true, txt: () => 'Tem alguma restrição alimentar?', ops: () => [['nenhuma', 'Nenhuma'], ...Object.entries(RESTR)], pular: r => (r.saude || []).includes('transtorno') },
  { id: 'confirma', txt: () => `Vou usar o seu perfil: ${String(S.perfil.peso).replace('.', ',')} kg, ${S.perfil.altura} cm, objetivo${objetivos().length > 1 ? 's' : ''}: ${nomesObj().toLowerCase()}, nível ${NIVEL[S.perfil.nivel || 'iniciante'][0].toLowerCase()}. Está certo?`, ops: () => [['ok', 'Está certo, pode montar!'], ['perfil', 'Quero atualizar o perfil']] }
];
function etapaAtual(){ const r = nutri().r; return ETAPAS.find(e => r[e.id] === undefined && !(e.pular && e.pular(r))); }
function falar(texto, extra = {}){ nutri().chat.push({ de: 'm', t: texto, ...extra }); }
function eu(texto){ nutri().chat.push({ de: 'u', t: texto }); }
function iniciarMusculinho(){
  const n = nutri();
  if (!n.chat.length) {
    falar(`Oi, ${S.nome || 'tudo bem'}! Eu sou o Musculinho 💪 Vou te ajudar a montar sua alimentação, sua rotina de descanso e treinos para ${nomesObj().toLowerCase()}.`);
    falar('São só algumas perguntas rápidas. No fim, você recebe o plano completo e pode baixar em PDF.');
    perguntarProxima();
  }
}
function perguntarProxima(){
  const e = etapaAtual(), n = nutri();
  if (e) { falar(e.txt(), { etapa: e.id }); return; }
  const p = gerarPlano();
  falar(p.transtorno ? 'Pronto. Separei sua rotina de descanso e uma sugestão de treinos.' : 'Prontinho! Montei o seu plano 🎉', { plano: true });
  if (p.avisos.length) p.avisos.forEach(a => falar(a, { aviso: true }));
  falar('Pode me perguntar qualquer coisa do app: seu treino de hoje, sua evolução de carga, sequência, peso, onde fica cada função, ou pedir para eu montar um treino. Também respondo sobre dieta, proteína, água e sono. Toque em 💡 para ver sugestões.');
  n.aba = 'chat';
}
function responder(id, valor, rotulo){
  const n = nutri();
  if (id === 'confirma' && valor === 'perfil') { eu(rotulo); falar('Sem problemas! Atualize o perfil em Ajustes e depois volte aqui que eu continuo.'); save(); view = 'ajustes'; render(); scrollTo(0, 0); return; }
  n.r[id] = valor; eu(rotulo);
  perguntarProxima(); save(); renderChat(true);
}
function refazer(){
  if (!confirm('Refazer as perguntas e gerar um plano novo?')) return;
  const n = nutri(); n.r = {}; n.plano = null; n.chat.push({ de: 'm', t: 'Vamos lá de novo! 🔄' }); perguntarProxima(); save(); n.aba = 'chat'; render(); renderChat(true);
}

/* ---------- Perguntas livres (sem IA) ---------- */
const semAc = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function respostaLocal(q){
  const t = semAc(q), p = nutri().plano, m = p?.metas;
  const tem_ = (...ws) => ws.some(w => t.includes(w));
  if (tem_('pdf', 'baixar', 'imprimir')) return { t: 'Claro! Toque em "Baixar PDF" para gerar seu plano com o timbrado do Musculito.', acao: 'pdf' };
  if (!p && tem_('dieta', 'plano', 'cardapio', 'almoco', 'jantar', 'lanche', 'comer', 'alimenta', 'treino', 'exercicio', 'meta', 'caloria')) return { t: 'Primeiro preciso terminar as perguntas. Responda a pergunta acima e eu monto tudo.' };
  if (tem_('pressao', 'glicemia', 'glicose', 'afericao', 'aferir', 'diabetes', 'acucar no sangue')) {
    const ult = (S.saude?.afericoes || []).slice(-2);
    return { t: ult.length ? `Suas últimas aferições: ${ult.map(a => a.tipo === 'pa' ? `pressão ${a.sis}/${a.dia} (${fmtData(a.data)})` : `glicemia ${a.valor} mg/dL (${fmtData(a.data)})`).join(' · ')}. Quer registrar uma nova? Eu ajusto as dicas de hoje com base nela.` : 'Registre sua aferição de hoje que eu ajusto as dicas de alimentação com base nela.', acao: 'afericao' };
  }
  if (tem_('proteina', 'whey')) return { t: m ? `Sua meta é de cerca de ${m.prot} g de proteína por dia (${String(m.protKg).replace('.', ',')} g por kg). Boas fontes: ovos, frango, peixe, carne magra, iogurte, queijo branco, feijão, lentilha e tofu. O whey é só uma praticidade, não é obrigatório.` : 'Quem treina costuma precisar de 1,4 a 2,0 g de proteína por kg por dia. Para o seu caso, o ideal é definir a quantidade com um nutricionista.' };
  if (tem_('agua', 'hidrat')) return { t: m ? `Beba cerca de ${String(m.agua).replace('.', ',')} litros de água por dia, mais nos dias quentes e de treino. Uma dica é deixar uma garrafa sempre à vista.` : 'Beba água ao longo do dia todo, mais nos dias quentes e de treino.' };
  if (tem_('pre treino', 'pre-treino', 'antes do treino', 'antes de treinar')) return { t: 'De 1 a 2 horas antes do treino, prefira carboidratos fáceis de digerir com um pouco de proteína: banana com aveia, pão com ovo ou tapioca com queijo. Treinando cedo, uma fruta já ajuda.' };
  if (tem_('pos treino', 'pos-treino', 'depois do treino', 'apos o treino')) return { t: 'Depois do treino, faça uma refeição com proteína e carboidrato, como arroz, feijão e frango, ou iogurte com fruta e aveia. Não precisa ser no minuto seguinte: nas próximas horas já está ótimo.' };
  if (tem_('doce', 'chocolate', 'sobremesa', 'acucar', 'besteira', 'lixo')) return { t: 'Pode sim, com moderação! Encaixe um doce pequeno depois do almoço algumas vezes por semana, em vez de beliscar o dia todo. O que manda no resultado é o conjunto da semana.' };
  if (tem_('creatina', 'suplement')) return { t: 'A creatina é um dos suplementos mais estudados para quem treina força, geralmente usada em 3 a 5 g por dia. Antes de usar qualquer suplemento, principalmente se você tiver algum problema de saúde, converse com um nutricionista ou médico.' };
  if (tem_('trocar', 'substitu', 'nao gosto')) return { t: 'Troque dentro do mesmo grupo: arroz ↔ macarrão, batata, mandioca ou cuscuz; frango ↔ peixe, carne magra, ovos ou tofu; feijão ↔ lentilha ou grão-de-bico; fruta ↔ outra fruta. Mantenha quantidades parecidas.' };
  if (tem_('dica de sono', 'dicas de sono')) return { t: (p ? p.descanso.slice(0, 2) : rotinaDescanso(nutri().r).slice(0, 2)).join('\n\n') + (p ? '\n\nA rotina completa está em "Meu plano" › Rotina de descanso.' : ''), acao: p ? 'plano:descanso' : null };
  if (tem_('sono', 'dormir', 'descanso', 'recupera')) return p ? { t: 'Sua rotina de descanso está em "Meu plano" › Rotina de descanso: horas de sono, horários, dias de descanso ativo e recuperação. Toque abaixo que eu te levo lá 👇', acao: 'plano:descanso' } : { t: rotinaDescanso(nutri().r).slice(0, 2).join('\n\n') };
  if (tem_('cafe da manha', 'almoco', 'jantar', 'lanche', 'ceia', 'cardapio', 'dieta', 'refeic', 'comer', 'alimenta')) return { t: `Sua dieta está em "Meu plano" › Plano alimentar: ${p.refeicoes.length} refeições com horários e duas opções em cada uma. Toque abaixo que eu te levo lá 👇`, acao: 'plano:refeicoes' };
  if (tem_('treino', 'exercicio', 'academia', 'musculacao')) return { t: 'Seus 5 treinos sugeridos estão em "Meu plano" › Treinos sugeridos. De lá você pode copiar todos para a aba Treinos com um toque. Te levo lá 👇', acao: 'plano:treinos' };
  if (tem_('caloria', 'kcal', 'meta', 'macro')) return { t: m ? `Sua meta é de cerca de ${m.kcal} kcal por dia, para ${m.foco}. Você gasta em torno de ${m.gasto} kcal. Divisão: ${m.prot} g de proteína, ${m.carb} g de carboidrato e ${m.gord} g de gordura.` : 'No seu caso, as metas de calorias precisam ser definidas com um nutricionista.', acao: m ? 'plano:metas' : null };
  if (tem_('meu plano', 'plano')) return { t: 'Seu plano completo está na aba "Meu plano": metas, dieta, descanso, treinos e dicas. Te levo lá 👇', acao: 'plano:inicio' };
  if (tem_('oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e ai')) return { t: `Oi, ${S.nome || ''}! 😄 Em que posso ajudar?` };
  if (tem_('obrigad', 'valeu')) return { t: 'Tamo junto! Bora pra cima 💪' };
  return null;
}
// "apague a conversa", "limpar chat", "nova conversa", "começar um novo chat"...
function pedeLimpar(q){
  const t = semAc(q);
  const verbo = /\b(apag|limp|zer|delet|exclu|reset|reinici|recome)/.test(t), alvo = /(conversa|chat|historico|mensage|papo)/.test(t);
  return (verbo && alvo) || /\b(nova|novo|outra|outro)\s+(conversa|chat)\b/.test(t);
}
function novaConversa(){
  const n = nutri(); n.chat = []; n.sug = false;
  if (n.plano && !etapaAtual()) falar(`Conversa nova! 🧹 Apaguei as mensagens anteriores, ${S.nome || ''}. Seu plano continua salvo em "Meu plano". Em que posso ajudar?`, { acao: 'plano:inicio' });
  else { falar('Conversa nova! 🧹 Vamos recomeçar.'); perguntarProxima(); }
  save(); renderChat(true); toast('Conversa apagada');
}
async function enviarPergunta(){
  const inp = document.getElementById('muQ'), q = inp?.value.trim(); if (!q) return;
  inp.value = ''; eu(q);
  const etapa = etapaAtual();
  if (etapa && etapa.num) { const v = parseInt(q); if (v >= etapa.num[0] && v <= etapa.num[1]) { nutri().chat.pop(); return responder(etapa.id, v, `${v} anos`); } }
  if (pedeLimpar(q)) return novaConversa();
  const loc = respostaLocal(q);
  if (loc) {
    const n = nutri(); n.sug = false; falar('', { pensando: true }); renderChat(true);
    const espera = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.min(1400, 450 + loc.t.length * 6);
    setTimeout(() => { n.chat = n.chat.filter(x => !x.pensando); falar(loc.t, loc.acao ? { acao: loc.acao } : {}); save(); renderChat(true); }, espera);
    return;
  }
  if (typeof IA_URL === 'string' && IA_URL) {
    falar('Pensando…', { pensando: true }); renderChat(true);
    const n = nutri();
    try {
      const r = await fetch(IA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modo: 'musculinho', pergunta: q, perfil: { ...S.perfil, nome: S.nome, ...n.r }, plano: n.plano ? { metas: n.plano.metas, restrito: n.plano.restrito } : null, afericoes: (S.saude?.afericoes || []).slice(-10), contexto: typeof contextoApp === 'function' ? contextoApp() : null }) });
      const j = await r.json(); n.chat = n.chat.filter(x => !x.pensando); falar(j.resposta || 'Não consegui responder agora.');
    } catch { n.chat = n.chat.filter(x => !x.pensando); falar('Não consegui falar com a IA agora. Tente de novo em instantes.'); }
    save(); return renderChat(true);
  }
  falar('Ainda não sei responder isso 😅 Posso ajudar com proteína, água, pré e pós-treino, doces, trocas de alimentos, sono, calorias e treinos.');
  save(); renderChat(true);
}

/* ---------- Tela ---------- */
function vMusculinho(){
  if (!S.perfil) { view = 'hoje'; return vHoje(); }
  iniciarMusculinho();
  const n = nutri();
  return `
    <div class="mu-top">
      <span class="mu-av">${mascote()}</span>
      <div class="grow"><h1>Musculinho</h1><span class="small muted">Dieta, descanso e treinos para você</span></div>
      ${n.plano ? `<button class="icon-btn" onclick="refazer()" aria-label="Refazer plano" title="Refazer plano">↻</button>` : ''}
    </div>
    <div class="seg mu-seg" role="tablist">
      <button role="tab" class="${n.aba !== 'plano' ? 'on' : ''}" aria-selected="${n.aba !== 'plano'}" onclick="nutri().aba='chat';save();render();renderChat(true)">Conversa</button>
      <button role="tab" class="${n.aba === 'plano' ? 'on' : ''}" aria-selected="${n.aba === 'plano'}" onclick="abrirPlano()" ${n.plano ? '' : 'disabled'}>Meu plano</button>
    </div>
    ${n.aba === 'plano' && n.plano ? planoHtml(n.plano) : `<div id="muChat" class="mu-chat" aria-live="polite"></div>`}`;
}
let planoAlvo = '', planoAnimado = false, planoTimer = null;
function abrirPlano(secao = ''){ const n = nutri(); if (!n.plano) return; planoAlvo = secao; n.aba = 'plano'; save(); render(); scrollTo(0, 0); }
function irPara(el){ if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.remove('mu-destaque'); void el.offsetWidth; el.classList.add('mu-destaque'); }
function animarPlano(){
  clearTimeout(planoTimer);
  const box = document.querySelector('.mu-plano'); if (!box) return;
  const passos = [...box.querySelectorAll('.mu-step')], intro = box.querySelector('#muIntro'), alvo = planoAlvo && box.querySelector('#sec-' + planoAlvo);
  const frase = intro.dataset.t, reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tudo = () => { intro.textContent = frase; passos.forEach(x => x.classList.add('show')); box.querySelector('.mu-typing')?.remove(); planoAnimado = true; };
  if (reduz || planoAnimado) { tudo(); if (alvo) setTimeout(() => irPara(alvo), 60); planoAlvo = ''; return; }
  intro.textContent = ''; let i = 0;
  const digita = () => { intro.textContent = frase.slice(0, ++i); if (i < frase.length) planoTimer = setTimeout(digita, 18); else proximo(0); };
  const typing = box.querySelector('.mu-typing');
  const proximo = k => {
    if (!document.body.contains(box)) return;
    if (k >= passos.length) { typing.remove(); planoAnimado = true; return; }
    passos[k].after(typing); typing.hidden = false;
    planoTimer = setTimeout(() => {
      passos[k].classList.add('show'); typing.hidden = true;
      if (alvo && passos[k] === alvo) { irPara(alvo); planoAlvo = ''; passos.slice(k + 1).forEach(x => x.classList.add('show')); typing.remove(); planoAnimado = true; return; }
      proximo(k + 1);
    }, k === 0 ? 450 : 650);
  };
  digita();
}
function bolha(msg){
  const b = msg.de === 'u';
  return `<div class="mu-msg ${b ? 'eu' : 'ele'} ${msg.aviso ? 'aviso' : ''}">${b ? '' : `<span class="mu-mini">${mascote()}</span>`}<div class="mu-b">${msg.pensando ? '<span class="mu-dots" aria-label="Musculinho está digitando"><i></i><i></i><i></i></span>' : esc(msg.t).replace(/\n/g, '<br>')}${msg.plano && nutri().plano ? resumoPlano(nutri().plano) : ''}${msg.acao === 'afericao' ? `<button class="btn sm primary mu-ir" onclick="abrirRegistroSaude(true)">Registrar aferição</button>` : ''}${msg.acao === 'pdf' ? `<button class="btn sm primary mu-ir" onclick="baixarPDF()">Baixar PDF</button>` : ''}${/^plano/.test(msg.acao || '') ? `<button class="btn sm mu-ir" onclick="abrirPlano('${msg.acao.split(':')[1] || ''}')">${{ 'plano:refeicoes': 'Ver minha dieta', 'plano:treinos': 'Ver meus treinos', 'plano:descanso': 'Ver rotina de descanso', 'plano:metas': 'Ver minhas metas', 'plano:inicio': 'Ver meu plano', plano: 'Ver meu plano' }[msg.acao]} ›</button>` : ''}</div></div>`;
}
function resumoPlano(p){
  const m = p.metas;
  return `<div class="mu-resumo">
    ${m ? `<div class="mu-kcal"><b>${m.kcal}</b><span>kcal por dia</span></div>
    <div class="mu-macros"><span><b>${m.prot} g</b>proteína</span><span><b>${m.carb} g</b>carboidrato</span><span><b>${m.gord} g</b>gordura</span><span><b>${String(m.agua).replace('.', ',')} L</b>água</span></div>` : ''}
    <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn sm primary" onclick="abrirPlano()">Ver plano completo</button><button class="btn sm" onclick="baixarPDF()">Baixar PDF</button></div></div>`;
}
function rapidas(){
  const e = etapaAtual();
  if (e && e.ops) {
    if (e.multi) return `<div class="mu-ops multi" data-etapa="${e.id}">${e.ops().map(([v, l]) => `<button class="chip" data-v="${v}" aria-pressed="false">${esc(l)}</button>`).join('')}<button class="btn primary sm mu-ok" disabled>Continuar</button></div>`;
    return `<div class="mu-ops" data-etapa="${e.id}">${e.ops().map(([v, l]) => `<button class="chip" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
  }
  if (e && e.horas) return `<div class="mu-ops horas" data-etapa="horas"><label class="small muted">Acordo<input type="time" id="muAc" value="${nutri().r.acorda || '06:30'}"></label><label class="small muted">Durmo<input type="time" id="muDo" value="${nutri().r.dorme || '22:30'}"></label><button class="btn primary sm" onclick="salvarHoras()">Continuar</button></div>`;
  if (e && e.num) return '';
  return '';
}
const SUGESTOES = ['Qual meu treino de hoje?', 'Monta um treino de peito e tríceps', 'Como está minha sequência?', 'Minha evolução de carga', 'Minha dieta', 'Rotina de descanso', 'Minhas metas', 'Quanto de proteína?', 'O que comer antes do treino?', 'Posso comer doce?', 'Como trocar alimentos?', 'Onde fica o backup?', 'Baixar PDF'];
function bandeja(){
  const n = nutri(); if (!n.plano || etapaAtual() || !n.sug) return '';
  return `<div class="mu-bandeja" role="group" aria-label="Sugestões de perguntas"><div class="mu-bandeja-h small muted">Sobre o que quer falar?</div>${SUGESTOES.map(x => `<button class="chip" data-livre="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
}
function salvarHoras(){
  const a = document.getElementById('muAc').value || '06:30', d = document.getElementById('muDo').value || '22:30';
  const n = nutri(); n.r.acorda = a; n.r.dorme = d; n.r.horas = true; eu(`Acordo às ${a} e durmo às ${d}`); perguntarProxima(); save(); renderChat(true);
}
function renderChat(rolar){
  const box = document.getElementById('muChat'); if (!box) return;
  const n = nutri(), e = etapaAtual();
  box.innerHTML = `${n.chat.map(bolha).join('')}<div class="mu-rapidas">${rapidas()}</div>
    ${bandeja()}
    <div class="mu-entrada">${n.plano && !e ? `<button class="mu-lamp ${n.sug ? 'on' : ''}" onclick="nutri().sug=!nutri().sug;save();renderChat(nutri().sug)" aria-label="${n.sug ? 'Esconder' : 'Mostrar'} sugestões de perguntas" aria-expanded="${!!n.sug}">💡</button>` : ''}<input id="muQ" type="${e && e.num ? 'number' : 'text'}" inputmode="${e && e.num ? 'numeric' : 'text'}" placeholder="${e && e.num ? e.ph : 'Pergunte ao Musculinho…'}" aria-label="Mensagem para o Musculinho" autocomplete="off"><button class="btn primary" onclick="enviarPergunta()" aria-label="Enviar">➤</button></div>`;
  box.querySelector('#muQ').onkeydown = ev => { if (ev.key === 'Enter') enviarPergunta(); };
  const ops = box.querySelector('.mu-ops[data-etapa]:not(.horas)');
  if (ops) {
    const multi = ops.classList.contains('multi'), sel = new Set();
    ops.querySelectorAll('.chip').forEach(c => c.onclick = () => {
      if (!multi) return responder(ops.dataset.etapa, c.dataset.v, c.textContent);
      const v = c.dataset.v;
      if (v === 'nenhuma') { sel.clear(); sel.add(v); } else { sel.delete('nenhuma'); sel.has(v) ? sel.delete(v) : sel.add(v); }
      ops.querySelectorAll('.chip').forEach(x => { const on = sel.has(x.dataset.v); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      ops.querySelector('.mu-ok').disabled = !sel.size;
    });
    const ok = ops.querySelector('.mu-ok');
    if (ok) ok.onclick = () => { const vals = [...sel]; responder(ops.dataset.etapa, vals.includes('nenhuma') ? [] : vals, vals.map(v => (Object.fromEntries(ETAPAS.find(x => x.id === ops.dataset.etapa).ops()))[v]).join(', ')); };
  }
  box.querySelectorAll('[data-livre]').forEach(c => c.onclick = () => { nutri().sug = false; document.getElementById('muQ').value = c.dataset.livre; enviarPergunta(); });
  if (rolar) requestAnimationFrame(() => { scrollTo(0, document.body.scrollHeight); });
}
function planoHtml(p){
  const m = p.metas;
  const nomeSec = { metas: 'suas metas', refeicoes: 'sua dieta', descanso: 'sua rotina de descanso', treinos: 'seus treinos' }[planoAlvo];
  const frase = nomeSec ? `Aqui está ${nomeSec}, ${S.nome || ''}! Já te levo até lá 👇` : `Aqui está o seu plano, ${S.nome || ''}! Vou te mostrando por partes 👇`;
  return `<div class="stack mu-plano">
    <div class="mu-msg ele"><span class="mu-mini">${mascote()}</span><div class="mu-b" id="muIntro" data-t="${esc(frase)}" aria-live="polite">${esc(frase)}</div></div>
    ${p.avisos.map(a => `<div class="card mu-aviso mu-step">${esc(a)}</div>`).join('')}
    ${m ? `<section class="card mu-step" id="sec-metas"><h3>Suas metas diárias</h3><p class="small muted" style="margin:4px 0 10px">Foco: ${esc(m.foco)}.</p>
      <div class="mu-macros big"><span><b>${m.kcal}</b>kcal</span><span><b>${m.prot} g</b>proteína</span><span><b>${m.carb} g</b>carbo</span><span><b>${m.gord} g</b>gordura</span><span><b>${String(m.agua).replace('.', ',')} L</b>água</span></div></section>` : ''}
    ${p.refeicoes.length ? `<section class="card mu-step" id="sec-refeicoes"><h3>Plano alimentar</h3>${p.refeicoes.map(r => `
      <div class="mu-ref"><div class="mu-ref-h"><b>${r.hora} · ${esc(r.nome)}</b>${r.kcal ? `<span class="small muted">~${r.kcal} kcal</span>` : ''}</div>
      ${r.opcoes.map((op, i) => `<div class="mu-op"><span class="small muted">Opção ${i + 1}</span><ul>${op.map(it => `<li>${esc(it.nome)}${it.qtd ? ` <span class="muted">· ${esc(it.qtd)}</span>` : ''}</li>`).join('')}</ul></div>`).join('')}
      ${r.nota ? `<p class="small mu-nota">${esc(r.nota)}</p>` : ''}</div>`).join('')}</section>` : ''}
    <section class="card mu-step" id="sec-descanso"><h3>Rotina de descanso</h3><ul class="mu-lista">${p.descanso.map(d => `<li>${esc(d)}</li>`).join('')}</ul></section>
    <section class="card mu-step" id="sec-treinos"><h3>Treinos sugeridos</h3><p class="small muted" style="margin:4px 0 8px">${esquema().series} séries de ${esquema().reps} repetições, para o seu objetivo principal.</p>
      ${p.treinos.map((t, i) => `<div class="mu-tr"><b>${letra(i)} · ${esc(t.nome)}</b><span class="small muted">${t.itens.map(it => esc(EX[it.ex]?.nome || it.ex)).join(' · ')}</span></div>`).join('')}
      <button class="btn block" style="margin-top:12px" onclick="usarTreinosSugeridos()">Usar estes treinos nos meus 5 dias</button></section>
    <section class="card mu-step" id="sec-dicas"><h3>Dicas do Musculinho</h3><ul class="mu-lista">${p.dicas.map(d => `<li>${esc(d)}</li>`).join('')}</ul></section>
    <div class="mu-step"><button class="btn primary block" onclick="baixarPDF()">Baixar PDF do plano</button></div>
    <div class="mu-msg ele mu-typing" hidden><span class="mu-mini">${mascote()}</span><div class="mu-b"><span class="mu-dots" aria-label="Musculinho está digitando"><i></i><i></i><i></i></span></div></div>
    <p class="small muted" style="text-align:center">Plano automático e educativo. Não substitui nutricionista nem profissional de educação física.<br>Baseado no Guia Alimentar para a População Brasileira e nas recomendações de proteína da ISSN.</p>
  </div>`;
}
function usarTreinosSugeridos(){
  const p = nutri().plano; if (!p) return;
  const temAlgo = S.planos.some(x => x.itens.length);
  if (temAlgo && !confirm('Isso vai substituir os exercícios dos seus 5 treinos pelos sugeridos. Continuar?')) return;
  p.treinos.forEach((t, i) => { if (!S.planos[i]) S.planos.push({ id: uid(), nome: '', itens: [] }); S.planos[i].nome = t.nome; S.planos[i].itens = t.itens.map(x => ({ ...x })); });
  save(); toast('Treinos atualizados'); view = 'treinos'; render(); scrollTo(0, 0);
}

/* ---------- PDF timbrado (gerador próprio, funciona sem internet) ---------- */
const WIN = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159, '↔': 0 };
function winAnsi(s){
  let o = '';
  for (const ch of String(s).replace(/↔/g, '/').replace(/½/g, '½').replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '')) {
    const c = ch.codePointAt(0);
    let b = c < 128 || (c >= 160 && c < 256) ? c : WIN[ch];
    if (!b) b = 63;
    if (b === 40 || b === 41 || b === 92) o += '\\' + String.fromCharCode(b);
    else if (b > 126 || b < 32) o += '\\' + b.toString(8).padStart(3, '0');
    else o += String.fromCharCode(b);
  }
  return o;
}
class Pdf {
  constructor(){ this.W = 595.28; this.H = 841.89; this.pages = []; this.imgs = []; this.ctx = document.createElement('canvas').getContext('2d'); this.novaPagina(); }
  novaPagina(){ this.c = []; this.pages.push(this.c); }
  cor(rgb){ return rgb.map(v => (v / 255).toFixed(3)).join(' '); }
  ret(x, y, w, h, rgb){ this.c.push(`${this.cor(rgb)} rg ${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
  linha(x1, y1, x2, y2, rgb, w = .6){ this.c.push(`${this.cor(rgb)} RG ${w} w ${x1.toFixed(2)} ${(this.H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - y2).toFixed(2)} l S`); }
  medir(t, tam, neg){ this.ctx.font = `${neg ? 'bold ' : ''}${tam}px Helvetica, Arial, sans-serif`; return this.ctx.measureText(t).width; }
  texto(t, x, y, tam, neg, rgb = [40, 30, 27], alinha){ const w = this.medir(t, tam, neg), xx = alinha === 'dir' ? x - w : alinha === 'meio' ? x - w / 2 : x; this.c.push(`BT /${neg ? 'F2' : 'F1'} ${tam} Tf ${this.cor(rgb)} rg ${xx.toFixed(2)} ${(this.H - y).toFixed(2)} Td (${winAnsi(t)}) Tj ET`); }
  quebrar(t, tam, neg, larg){
    const out = []; String(t).split('\n').forEach(par => { let l = ''; par.split(' ').forEach(p => { const n = l ? l + ' ' + p : p; if (this.medir(n, tam, neg) > larg && l) { out.push(l); l = p; } else l = n; }); out.push(l); }); return out;
  }
  imagem(dataUrl, w, h){ const bin = atob(dataUrl.split(',')[1]); this.imgs.push({ bin, w, h }); return this.imgs.length; }
  desenharImagem(id, x, y, w, h){ this.c.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} cm /Im${id} Do Q`); }
  saida(){
    const objs = [], add = s => { objs.push(s); return objs.length; };
    const cat = add(null), pagesId = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const imgIds = this.imgs.map(im => add({ bin: im.bin, dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bin.length} >>` }));
    const xo = imgIds.map((id, i) => `/Im${i + 1} ${id} 0 R`).join(' ');
    const kids = this.pages.map(c => { const s = c.join('\n'); const cid = add({ bin: s, dict: `<< /Length ${s.length} >>` }); return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << ${xo} >> >> /Contents ${cid} 0 R >>`); });
    objs[cat - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n` + (typeof o === 'string' ? o : `${o.dict}\nstream\n${o.bin}\nendstream`) + '\nendobj\n'; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return new Blob([bytes], { type: 'application/pdf' });
  }
}
const rgbDe = s => (s.match(/\d+/g) || [232, 87, 63]).slice(0, 3).map(Number);
async function logoJpeg(corFundo){
  const img = await imgDe(mascoteSrc(`rgb(${corFundo.join(',')})`)), cv = document.createElement('canvas'); cv.width = cv.height = 160;
  const c = cv.getContext('2d'); c.fillStyle = `rgb(${corFundo.join(',')})`; c.fillRect(0, 0, 160, 160); c.drawImage(img, 10, 10, 140, 140);
  return cv.toDataURL('image/jpeg', .92);
}
async function baixarPDF(){
  const n = nutri(), p = n.plano; if (!p) return toast('Termine as perguntas para gerar o plano.');
  toast('Gerando o PDF…');
  let acc = rgbDe(corCss('--accent', '#e8573f'));
  if (acc[0] * .299 + acc[1] * .587 + acc[2] * .114 > 200) acc = [20, 20, 20];
  const doc = new Pdf(), W = doc.W, H = doc.H, M = 46, L = W - 2 * M, ink = [40, 30, 27], cinza = [110, 100, 96];
  const logo = doc.imagem(await logoJpeg(acc), 160, 160);
  const dt = new Date(), dataTxt = `${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}`;
  let y = 0;
  const timbre = () => {
    doc.ret(0, 0, W, 86, acc);
    doc.desenharImagem(logo, M, 18, 50, 50);
    doc.texto('Musculito', M + 62, 44, 22, true, [255, 255, 255]);
    doc.texto('Plano personalizado do Musculinho', M + 62, 62, 10, false, [255, 255, 255]);
    doc.texto(S.nome || '', W - M, 44, 12, true, [255, 255, 255], 'dir');
    doc.texto(dataTxt, W - M, 62, 9.5, false, [255, 255, 255], 'dir');
    doc.ret(0, 86, W, 4, acc.map(v => Math.round(v * .7)));
    y = 118;
  };
  const precisa = h => { if (y + h > H - 60) { doc.novaPagina(); timbre(); } };
  const para = (t, tam = 10.5, neg = false, cor = ink, rec = 0, gap = 4) => { doc.quebrar(t, tam, neg, L - rec).forEach(l => { precisa(tam + 4); doc.texto(l, M + rec, y + tam, tam, neg, cor); y += tam + gap; }); };
  const titulo = t => { precisa(44); y += 10; doc.texto(t, M, y + 15, 15, true, acc); y += 24; doc.linha(M, y, W - M, y, acc, 1.2); y += 12; };
  const bullet = t => { const ls = doc.quebrar(t, 10.5, false, L - 16); precisa(ls.length * 15); ls.forEach((l, i) => { if (!i) doc.texto('•', M + 2, y + 10.5, 10.5, true, acc); doc.texto(l, M + 16, y + 10.5, 10.5, false, ink); y += 15; }); y += 3; };
  timbre();
  doc.texto(`Plano de ${S.nome || 'treino e alimentação'}`, M, y + 20, 22, true, ink); y += 34;
  para(`Peso ${String(S.perfil.peso).replace('.', ',')} kg · Altura ${S.perfil.altura} cm · Nível ${NIVEL[S.perfil.nivel || 'iniciante'][0].toLowerCase()}`, 10.5, false, cinza);
  para(`Objetivo${objetivos().length > 1 ? 's' : ''}: ${nomesObj()}`, 10.5, false, cinza); y += 4;
  p.avisos.forEach(a => { const ls = doc.quebrar(a, 10, false, L - 24); precisa(ls.length * 14 + 16); doc.ret(M, y, L, ls.length * 14 + 14, [255, 244, 225]); doc.ret(M, y, 4, ls.length * 14 + 14, [233, 162, 59]); ls.forEach((l, i) => doc.texto(l, M + 14, y + 18 + i * 14, 10, false, ink)); y += ls.length * 14 + 22; });
  if (p.metas) {
    const m = p.metas; titulo('Metas diárias');
    para(`Foco: ${m.foco}. Gasto estimado: cerca de ${m.gasto} kcal por dia.`, 10.5, false, cinza); y += 4;
    const cx = [[`${m.kcal}`, 'kcal'], [`${m.prot} g`, 'proteína'], [`${m.carb} g`, 'carboidrato'], [`${m.gord} g`, 'gordura'], [`${String(m.agua).replace('.', ',')} L`, 'água']], cw = (L - 4 * 8) / 5;
    precisa(62); cx.forEach(([v, l], i) => { const x = M + i * (cw + 8); doc.ret(x, y, cw, 54, [246, 241, 238]); doc.ret(x, y, cw, 3, acc); doc.texto(v, x + cw / 2, y + 28, 15, true, ink, 'meio'); doc.texto(l, x + cw / 2, y + 44, 9, false, cinza, 'meio'); }); y += 66;
  }
  if (p.refeicoes.length) {
    titulo('Plano alimentar');
    p.refeicoes.forEach(r => {
      precisa(40); doc.texto(`${r.hora}  ${r.nome}`, M, y + 12, 12, true, ink); if (r.kcal) doc.texto(`~${r.kcal} kcal`, W - M, y + 12, 10, false, cinza, 'dir'); y += 20;
      r.opcoes.forEach((op, i) => para(`Opção ${i + 1}: ` + op.map(it => it.nome + (it.qtd ? ` (${it.qtd})` : '')).join('; ') + '.', 10.5, false, ink, 10));
      if (r.nota) para(r.nota, 9.5, false, cinza, 10);
      y += 6;
    });
  }
  const afs = (S.saude?.afericoes || []).slice(-14);
  if (afs.length) {
    titulo('Registro de saúde (últimas aferições)');
    afs.forEach(a => { const k = a.tipo === 'pa' ? classificarPA(a.sis, a.dia) : classificarGli(a.valor, a.momento); bullet(`${fmtData(a.data)} ${a.hora} · ${a.tipo === 'pa' ? `Pressão ${a.sis}/${a.dia} mmHg` : `Glicemia ${a.valor} mg/dL (${MOMENTOS[a.momento].toLowerCase()})`} · ${k.nome}`); });
    para('Leve este registro às suas consultas. Não altere remédios sem orientação médica.', 9.5, false, cinza);
  }
  titulo('Rotina de descanso'); p.descanso.forEach(bullet);
  titulo('Treinos sugeridos pelo Musculinho');
  para(`Para o seu objetivo principal: ${esquema().series} séries de ${esquema().reps} repetições, com cerca de ${esquema().descanso} s de descanso.`, 10, false, cinza); y += 2;
  p.treinos.forEach((t, i) => { precisa(34); doc.texto(`Treino ${letra(i)} · ${t.nome}`, M, y + 12, 12, true, ink); y += 20; t.itens.forEach(it => { const e = EX[it.ex]; bullet(`${e?.nome || it.ex} · ${+it.series === 1 ? it.reps : it.series + ' x ' + it.reps}`); }); y += 2; });
  titulo('Dicas do Musculinho'); p.dicas.forEach(bullet);
  y += 8; para('Este plano é uma sugestão automática e educativa. Ele não substitui a avaliação de um nutricionista, de um médico e de um profissional de educação física. Fontes: Guia Alimentar para a População Brasileira (Ministério da Saúde) e ISSN Position Stand: Protein and Exercise (2017).', 8.5, false, cinza);
  const total = doc.pages.length;
  doc.pages.forEach((pg, i) => { doc.c = pg; doc.linha(M, H - 40, W - M, H - 40, [225, 215, 210]); doc.texto('Gerado pelo Musculito · Musculinho', M, H - 26, 8.5, false, cinza); doc.texto(`Página ${i + 1} de ${total}`, W - M, H - 26, 8.5, false, cinza, 'dir'); });
  const blob = doc.saida(), nome = `plano-musculito-${semAc(S.nome || 'usuario').replace(/[^a-z0-9]+/g, '-')}.pdf`;
  const arq = new File([blob], nome, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [arq] })) { try { await navigator.share({ files: [arq], title: 'Plano Musculito' }); } catch {} return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('PDF baixado');
}

/* integra à tela */
window.aposRender = () => { if (view !== 'musculinho') return; if (nutri().aba === 'plano') animarPlano(); else renderChat(false); };
