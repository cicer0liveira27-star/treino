/* Registro diário de saúde (pressão arterial e glicemia) para quem marcou pressão alta ou diabetes no Musculinho.
   O app registra as aferições, mostra a evolução e o Musculinho sugere ajustes de ALIMENTAÇÃO e HÁBITOS.
   Nunca orienta mudança de remédio. Valores perigosos geram aviso para procurar atendimento.
   Referências: Diretrizes Brasileiras de Hipertensão Arterial (SBC, 2020) e ADA Standards of Care (metas glicêmicas). */

function saudeDados(){ return S.saude ||= { afericoes: [], adiado: '' }; }
function condicoes(){ const s = S.nutri?.r?.saude || []; return { pressao: s.includes('pressao'), diabetes: s.includes('diabetes'), renal: s.includes('renal') }; }
const precisaRegistro = () => { const c = condicoes(); return c.pressao || c.diabetes; };
const agoraHora = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const MOMENTOS = { jejum: 'Em jejum', antes: 'Antes de uma refeição', depois: '1 a 2 h depois de comer', outro: 'Outro horário' };

/* ---------- Classificação ---------- */
function classificarPA(sis, dia){
  if (sis >= 180 || dia >= 120) return { n: 4, nome: 'Muito alta', cor: 'perigo', urgente: true };
  if (sis >= 160 || dia >= 100) return { n: 3, nome: 'Alta (estágio 2)', cor: 'alerta' };
  if (sis >= 140 || dia >= 90) return { n: 2, nome: 'Alta (estágio 1)', cor: 'alerta' };
  if (sis >= 130 || dia >= 85) return { n: 1, nome: 'Limítrofe', cor: 'atencao' };
  if (sis < 90 || dia < 60) return { n: -1, nome: 'Baixa', cor: 'atencao' };
  return { n: 0, nome: sis < 120 && dia < 80 ? 'Ótima' : 'Normal', cor: 'ok' };
}
function classificarGli(v, momento){
  if (v < 54) return { n: -2, nome: 'Muito baixa', cor: 'perigo', urgente: true };
  if (v < 70) return { n: -1, nome: 'Baixa (hipoglicemia)', cor: 'perigo', urgente: true };
  if (v >= 300) return { n: 3, nome: 'Muito alta', cor: 'perigo', urgente: true };
  if (v >= 250) return { n: 2, nome: 'Bem alta', cor: 'alerta' };
  const limite = momento === 'depois' || momento === 'outro' ? 180 : 130;
  if (v > limite) return { n: 1, nome: 'Acima da meta', cor: 'atencao' };
  return { n: 0, nome: 'Dentro da meta', cor: 'ok' };
}

/* ---------- Orientações do Musculinho ---------- */
function orientacoes(a){
  const c = condicoes(), out = { titulo: '', urgente: '', dicas: [] };
  if (a.tipo === 'pa') {
    const k = classificarPA(a.sis, a.dia); out.titulo = `Pressão ${a.sis}/${a.dia} mmHg · ${k.nome}`;
    if (k.urgente) out.urgente = 'Valor muito alto. Repita a medida em 5 minutos, sentado e em repouso. Se continuar assim, ou se tiver dor no peito, falta de ar, dor de cabeça forte, alteração na visão, fala ou força, procure atendimento médico agora (SAMU 192).';
    if (k.n === -1) out.dicas.push('A pressão está baixa. Se sentir tontura, sente ou deite com as pernas elevadas, beba água e avise seu médico, principalmente se isso se repetir.');
    if (k.n >= 1) out.dicas.push('Hoje, capriche na redução do sal: tempere com alho, cebola, ervas e limão, e evite embutidos (presunto, salsicha, linguiça), temperos prontos, salgadinhos e enlatados.');
    if (k.n >= 1 && !c.renal) out.dicas.push('Inclua mais frutas, verduras e legumes nas refeições, como banana, laranja, folhas verdes e feijão. Esse padrão de alimentação ajuda a controlar a pressão.');
    if (k.n >= 1) out.dicas.push('Evite bebida alcoólica e reduza café e energéticos hoje. Antes do treino, meça de novo: com a pressão alta, prefira um treino leve.');
    if (k.n >= 2) out.dicas.push('Se os valores ficarem altos por vários dias, leve este histórico ao seu médico. Ele é quem decide se precisa mudar o tratamento.');
    if (k.n === 0) out.dicas.push('Pressão em bom nível. Continue com pouco sal, comida de verdade e treinos regulares.');
  } else {
    const k = classificarGli(a.valor, a.momento); out.titulo = `Glicemia ${a.valor} mg/dL (${MOMENTOS[a.momento].toLowerCase()}) · ${k.nome}`;
    if (k.n < 0) out.urgente = 'Glicemia baixa. Coma ou beba agora 15 g de carboidrato de absorção rápida, como meio copo de suco de fruta, 1 colher de sopa de açúcar ou mel. Meça de novo em 15 minutos e repita se ainda estiver abaixo de 70. Não treine agora. Se não melhorar, se estiver confuso ou com muito mal-estar, procure atendimento (SAMU 192).';
    else if (k.n >= 3) out.urgente = 'Glicemia muito alta. Beba água, não treine agora e siga o plano combinado com seu médico. Se tiver vômitos, muita sede, sonolência, falta de ar ou confusão, procure atendimento médico agora (SAMU 192).';
    if (k.n === 2) out.dicas.push('Valor bem alto: evite treino intenso agora e entre em contato com seu médico se isso se repetir hoje.');
    if (k.n >= 1) out.dicas.push('Nas próximas refeições, divida bem os carboidratos: metade do prato com verduras e legumes, um quarto com proteína e um quarto com arroz integral, batata-doce ou feijão.');
    if (k.n >= 1) out.dicas.push('Troque pão branco, doces e sucos por versões integrais, frutas inteiras com casca e água. Sempre combine o carboidrato com proteína ou fibra.');
    if (k.n === 1) out.dicas.push('Se o seu médico liberar, uma caminhada leve de 10 a 15 minutos depois das refeições ajuda a baixar a glicemia.');
    if (k.n === 0) out.dicas.push('Glicemia dentro da meta. Continue distribuindo os carboidratos ao longo do dia e com refeições em horários regulares.');
    if (k.n !== 0) out.dicas.push('Não altere insulina nem remédios por conta própria. Leve este histórico ao seu médico.');
  }
  return out;
}

/* ---------- Pop-up do dia ---------- */
function abrirRegistroSaude(forcar){
  if (!precisaRegistro() && !forcar) return;
  const c = condicoes(), el = document.createElement('div');
  el.className = 'orig on sd-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Registro de saúde do dia');
  el.innerHTML = `<div class="orig-fundo"></div><div class="orig-painel sd-painel">
    <div class="sd-head"><span class="mu-mini">${mascote()}</span><div><b>Registro de saúde de hoje</b><div class="small muted">O Musculinho usa sua aferição para ajustar as dicas de alimentação.</div></div></div>
    ${c.pressao || forcar ? `<fieldset class="sd-grupo"><legend>Pressão arterial (mmHg)</legend>
      <div class="row"><label class="grow small muted">Máxima<input type="number" inputmode="numeric" id="sdSis" min="60" max="260" placeholder="Ex.: 120"></label><span class="sd-x">x</span>
      <label class="grow small muted">Mínima<input type="number" inputmode="numeric" id="sdDia" min="30" max="160" placeholder="Ex.: 80"></label></div></fieldset>` : ''}
    ${c.diabetes || forcar ? `<fieldset class="sd-grupo"><legend>Glicemia (mg/dL)</legend>
      <div class="row"><label class="grow small muted">Valor<input type="number" inputmode="numeric" id="sdGli" min="20" max="600" placeholder="Ex.: 100"></label>
      <label class="grow small muted">Quando<select id="sdMom">${Object.entries(MOMENTOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label></div></fieldset>` : ''}
    <p id="sdErro" class="small" style="color:var(--accent);margin:0" role="alert"></p>
    <button class="btn primary block" id="sdSalvar">Salvar aferição</button>
    <button class="orig-cancel" id="sdDepois">Agora não</button>
  </div>`;
  document.body.append(el);
  const fechar = () => el.remove();
  el.querySelector('.orig-fundo').onclick = fechar;
  el.querySelector('#sdDepois').onclick = () => { saudeDados().adiado = hoje(); save(); fechar(); };
  el.querySelector('#sdSalvar').onclick = () => {
    const sis = +el.querySelector('#sdSis')?.value || 0, dia = +el.querySelector('#sdDia')?.value || 0, gli = +el.querySelector('#sdGli')?.value || 0, mom = el.querySelector('#sdMom')?.value || 'outro';
    const erro = m => { el.querySelector('#sdErro').textContent = m; };
    const temPA = sis || dia, novas = [];
    if (temPA) { if (!(sis >= 60 && sis <= 260 && dia >= 30 && dia <= 160 && sis > dia)) return erro('Confira a pressão: a máxima (ex.: 120) deve ser maior que a mínima (ex.: 80).'); novas.push({ tipo: 'pa', sis, dia }); }
    if (gli) { if (!(gli >= 20 && gli <= 600)) return erro('Confira a glicemia: informe um valor entre 20 e 600 mg/dL.'); novas.push({ tipo: 'gli', valor: gli, momento: mom }); }
    if (!novas.length) return erro('Preencha pelo menos uma aferição.');
    const sd = saudeDados(), data = hoje(), hora = agoraHora();
    novas.forEach(a => sd.afericoes.push({ ...a, data, hora }));
    save(); fechar(); comentarAfericoes(novas);
  };
  setTimeout(() => el.querySelector('input')?.focus(), 50);
}
function comentarAfericoes(novas){
  const os = novas.map(a => orientacoes(a)), urgente = os.find(o => o.urgente);
  if (S.nutri) {
    os.forEach(o => falar(`📋 ${o.titulo}${o.urgente ? '\n\n⚠️ ' + o.urgente : ''}${o.dicas.length ? '\n\n' + o.dicas.map(d => '• ' + d).join('\n') : ''}`, { aviso: !!o.urgente }));
    save();
  }
  if (urgente) {
    abrirDlg(`<div class="dlg sd-urg"><div class="dlg-head"><h2>⚠️ Atenção</h2><button class="icon-btn" onclick="fecharDlg()" aria-label="Fechar">✕</button></div>
      ${os.filter(o => o.urgente).map(o => `<p><b>${esc(o.titulo)}</b></p><p>${esc(o.urgente)}</p>`).join('')}
      <a class="btn primary block" href="tel:192" style="text-align:center;text-decoration:none">Ligar para o SAMU (192)</a>
      <button class="btn block" style="margin-top:8px" onclick="fecharDlg();view='musculinho';nutri().aba='chat';render()">Ver orientações do Musculinho</button></div>`);
  } else { toast('Aferição salva. O Musculinho deixou dicas para hoje.'); if (view === 'musculinho') render(); }
}
function lembrarRegistro(){
  if (!S.perfil || !precisaRegistro() || document.querySelector('.sd-pop')) return;
  const sd = saudeDados(), h = hoje();
  if (sd.adiado === h || sd.afericoes.some(a => a.data === h)) return;
  abrirRegistroSaude();
}

/* ---------- Na Evolução ---------- */
function saudeHtml(){
  if (!precisaRegistro() && !saudeDados().afericoes.length) return '';
  const sd = saudeDados(), pas = sd.afericoes.filter(a => a.tipo === 'pa'), glis = sd.afericoes.filter(a => a.tipo === 'gli');
  const linha = a => { const k = a.tipo === 'pa' ? classificarPA(a.sis, a.dia) : classificarGli(a.valor, a.momento);
    return `<div class="ex-linha"><span class="small muted">${fmtData(a.data)} ${a.hora}</span><span>${a.tipo === 'pa' ? `${a.sis}/${a.dia} <span class="muted small">mmHg</span>` : `${a.valor} <span class="muted small">mg/dL · ${MOMENTOS[a.momento].toLowerCase()}</span>`}</span><span class="sd-tag ${k.cor}">${k.nome}</span></div>`; };
  return `<section class="card" id="sec-saude">
    <div class="row" style="justify-content:space-between"><h3>Registro de saúde</h3><button class="btn sm primary" onclick="abrirRegistroSaude(true)">+ Aferição</button></div>
    ${pas.length > 1 ? `<h4 class="small muted" style="margin:12px 0 0">Pressão máxima (mmHg)</h4>${lineChart(pas.map(a => ({ x: a.data, y: a.sis })), 'mmHg')}` : ''}
    ${glis.length > 1 ? `<h4 class="small muted" style="margin:12px 0 0">Glicemia (mg/dL)</h4>${lineChart(glis.map(a => ({ x: a.data, y: a.valor })), 'mg/dL')}` : ''}
    ${sd.afericoes.length ? `<div style="margin-top:8px">${[...sd.afericoes].reverse().slice(0, 14).map(linha).join('')}</div>` : '<p class="muted small">Nenhuma aferição ainda. Toque em “+ Aferição”.</p>'}
    <p class="small muted" style="margin:10px 0 0">Leve este histórico às suas consultas. Ele ajuda seu médico, mas não substitui o acompanhamento.</p>
  </section>`;
}

/* ---------- Integração ---------- */
const _aposRenderSaude = window.aposRender;
window.aposRender = () => { _aposRenderSaude?.(); if (view === 'hoje') setTimeout(lembrarRegistro, 600); };
setTimeout(() => { if (view === 'hoje') lembrarRegistro(); }, 900);
