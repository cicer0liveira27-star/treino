/* Biblioteca de exercícios + motor de animação (figura em SVG).
   Vista lateral: figura de frente para a direita. Vista frontal: pose.front = true.
   Coordenadas: x para a direita, y para baixo, chão em y = 0.
   Ângulos em graus: 0 = para baixo, 90 = para frente/para fora, 180 = para cima, -90 = para trás. */
(function (root) {
  const L = { torso: 58, neck: 8, head: 11, ua: 30, fa: 28, th: 42, sh: 42, foot: 12 };
  const rad = a => a * Math.PI / 180;
  const dir = a => [Math.sin(rad(a)), Math.cos(rad(a))];
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const f = n => (+n).toFixed(1);

  // Cinemática inversa de dois segmentos: articulação do meio fica do lado "s" (+1/-1)
  function ik(a, b, l1, l2, s = 1) {
    let dx = b[0] - a[0], dy = b[1] - a[1];
    let d = Math.hypot(dx, dy) || 0.001;
    const max = l1 + l2 - 0.01;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; b = [a[0] + dx, a[1] + dy]; }
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    const ux = dx / d, uy = dy / d;
    return { mid: [a[0] + ux * x + uy * h * s, a[1] + uy * x - ux * h * s], end: b };
  }

  function sideJoints(p) {
    const hip = p.hip;
    const sh = add(hip, dir(p.t), L.torso);
    const head = add(sh, dir(p.t + (p.hd || 0)), L.neck + L.head);
    const leg = (foot, s, ft) => {
      const r = ik(hip, foot, L.th, L.sh, s);
      const shinA = Math.atan2(r.end[0] - r.mid[0], r.end[1] - r.mid[1]) * 180 / Math.PI;
      return [hip, r.mid, r.end, add(r.end, dir(ft ?? shinA + 90), L.foot)];
    };
    const arm = (ang, hand, s) => {
      if (hand) { const r = ik(sh, hand, L.ua, L.fa, s); return [sh, r.mid, r.end]; }
      const e = add(sh, dir(ang[0]), L.ua);
      return [sh, e, add(e, dir(ang[1]), L.fa)];
    };
    return {
      mode: 'side', hip, sh, head,
      nLeg: leg(p.nf, p.kn ?? 1, p.ft),
      fLeg: leg(p.ff || p.nf, p.kf ?? p.kn ?? 1, p.ftf ?? p.ft),
      nArm: arm(p.na, p.nh, p.en ?? 1),
      fArm: arm(p.fa || p.na, p.fh || p.nh, p.ef ?? p.en ?? 1)
    };
  }

  // Vista frontal: especificações escritas para o lado direito (x > 0 = para fora); o esquerdo é espelhado.
  function frontJoints(p) {
    const hc = p.hip, sc = [hc[0], hc[1] - L.torso - (p.sg || 0)];
    const head = [hc[0], hc[1] - L.torso - (L.neck + L.head)];
    const HW = 10, SW = 16;
    const leg = spec => {
      const hj = [HW, hc[1]];
      let pts;
      if (spec.k) pts = [hj, spec.k, spec.f];
      else if (spec.a) { const k = add(hj, dir(spec.a[0]), L.th); pts = [hj, k, add(k, dir(spec.a[1]), L.sh)]; }
      else { const r = ik(hj, spec.f, L.th, L.sh, spec.s ?? 1); pts = [hj, r.mid, r.end]; }
      return [...pts, [pts[2][0] + 6, pts[2][1]]];
    };
    const arm = spec => {
      const sj = [SW, sc[1]];
      if (spec.e) return [sj, spec.e, spec.h];
      if (spec.a) { const e = add(sj, dir(spec.a[0]), L.ua); return [sj, e, add(e, dir(spec.a[1]), L.fa)]; }
      const r = ik(sj, spec.h, L.ua, L.fa, spec.s ?? 1); return [sj, r.mid, r.end];
    };
    const mirror = arr => arr.map(q => [2 * hc[0] - q[0], q[1]]);
    const legs = p.legs || [{ a: [0, 0] }], arms = p.arms || [{ a: [6, 4] }];
    return {
      mode: 'front', hip: hc, sh: [hc[0], hc[1] - L.torso], head,
      rLeg: leg(legs[0]), lLeg: mirror(leg(legs[1] || legs[0])),
      rArm: arm(arms[0]), lArm: mirror(arm(arms[1] || arms[0])),
      pelvis: [[hc[0] - HW, hc[1]], [hc[0] + HW, hc[1]]],
      shoulders: [[sc[0] - SW, sc[1]], [sc[0] + SW, sc[1]]]
    };
  }

  function lerp(a, b, k) {
    if (b === undefined) b = a;
    if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], k));
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
    if (a && typeof a === 'object') return mix(a, b, k);
    return k < .5 ? a : b;
  }
  function mix(A, B, k) {
    const o = {};
    for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) {
      const a = A[key] ?? B[key], b = B[key] ?? A[key];
      o[key] = lerp(a, b, k);
    }
    return o;
  }

  /* ---------- Peças de cena (aparelhos) ---------- */
  const ln = (a, b, c = 'mq', w) => `<line class="${c}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"${w ? ` style="stroke-width:${w}"` : ''}/>`;
  const rc = (x, y, w, h, c = 'mqf', r = 2) => `<rect class="${c}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}"/>`;
  const ci = (p, r, c = 'mqf') => `<circle class="${c}" cx="${f(p[0])}" cy="${f(p[1])}" r="${r}"/>`;
  const seat = (x0, x1, y) => ln([(x0 + x1) / 2, y + 4], [(x0 + x1) / 2, 0], 'mq', 5) + rc(x0, y, x1 - x0, 7);
  const ang = (e, h) => Math.atan2(h[1] - e[1], h[0] - e[0]) * 180 / Math.PI + 90;
  const DB = (h, a) => `<g class="db" transform="translate(${f(h[0])},${f(h[1])}) rotate(${f(a)})"><rect x="-9" y="-2" width="18" height="4" rx="1"/><rect x="-11" y="-6" width="5" height="12" rx="2"/><rect x="6" y="-6" width="5" height="12" rx="2"/></g>`;
  const DBV = (p) => `<g class="db" transform="translate(${f(p[0])},${f(p[1])})"><rect x="-2" y="-11" width="4" height="22" rx="1"/><rect x="-7" y="-14" width="14" height="6" rx="2"/><rect x="-7" y="8" width="14" height="6" rx="2"/></g>`;
  const DBC = p => `<circle class="dbc" cx="${f(p[0])}" cy="${f(p[1])}" r="6.5"/>`;
  const halteres = { back: j => DB(j.fArm[2], ang(j.fArm[1], j.fArm[2])), front: j => DB(j.nArm[2], ang(j.nArm[1], j.nArm[2])) };

  const stand = { hip: [0, -84], t: 180, nf: [0, 0], ff: [3, 0], na: [0, 0] };
  const S = o => Object.assign({}, stand, o);
  const F = o => Object.assign({ front: true, hip: [0, -84] }, o);

  const EX = [
    /* ---------- Pernas e glúteos ---------- */
    { id: 'agachamento', nome: 'Agachamento livre', grupo: 'Pernas e glúteos', aparelho: 'Peso do corpo ou barra', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.6,
      poses: [S({ na: [90, 90] }), S({ hip: [-28, -44], t: 145, na: [92, 90] })],
      dicas: ['Pés na largura dos ombros, pontas levemente para fora.', 'Leve o quadril para trás como se fosse sentar.', 'Joelhos acompanham a direção dos pés.', 'Peito aberto e coluna neutra; suba empurrando o chão.'] },
    { id: 'agachamento-sumo', nome: 'Agachamento sumô', grupo: 'Pernas e glúteos', aparelho: 'Halter', alvo: ['gluteos', 'adutores', 'quadriceps'], tipo: 'C', dur: 2.6,
      poses: [F({ hip: [0, -80], legs: [{ f: [38, 0] }], arms: [{ h: [4, -84] }] }), F({ hip: [0, -46], legs: [{ f: [38, 0] }], arms: [{ h: [4, -50] }] })],
      front: j => DBV([0, j.rArm[2][1] + 12]),
      dicas: ['Pés bem afastados, pontas para fora.', 'Segure o halter com as duas mãos entre as pernas.', 'Desça mantendo os joelhos abertos, na direção dos pés.', 'Tronco firme; suba contraindo os glúteos.'] },
    { id: 'agachamento-smith', nome: 'Agachamento no smith', grupo: 'Pernas e glúteos', aparelho: 'Smith (barra guiada)', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.8,
      poses: [{ hip: [-2, -84], t: 180, nf: [12, 0], ff: [14, 0], na: [-30, 170] }, { hip: [-21.8, -44], t: 160, nf: [12, 0], ff: [14, 0], na: [-30, 170] }],
      back: j => ln([-5, -204], [-5, 0], 'mq', 4),
      front: j => ci([j.sh[0] - 3, j.sh[1] - 4], 5) + ci([j.sh[0] - 3, j.sh[1] - 4], 11, 'plate'),
      dicas: ['Barra apoiada no alto das costas, não no pescoço.', 'Pés um pouco à frente da linha da barra.', 'Desça até as coxas ficarem paralelas ao chão.', 'Suba empurrando com o pé inteiro.'] },
    { id: 'agachamento-isometria', nome: 'Agachamento isométrico', grupo: 'Pernas e glúteos', aparelho: 'Peso do corpo', alvo: ['quadriceps'], tipo: 'I', dur: 3, tempo: true,
      poses: [S({ hip: [-28, -46], t: 145, na: [92, 90] }), S({ hip: [-28, -44.5], t: 146, na: [92, 90] })],
      dicas: ['Desça até a posição de agachamento e pare.', 'Segure o tempo indicado sem subir.', 'Peso nos calcanhares, joelhos alinhados com os pés.', 'Respire normalmente.'] },
    { id: 'agachamento-hack', nome: 'Agachamento hack', grupo: 'Pernas e glúteos', aparelho: 'Máquina hack', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.8,
      poses: [{ hip: [-12, -82], t: 200, nf: [20, -4], ff: [22, -4], ft: 90, na: [-20, 170] }, { hip: [1.7, -44.4], t: 200, nf: [20, -4], ff: [22, -4], ft: 90, na: [-20, 170] }],
      back: j => ln([-1.8, -27.2], [-44.3, -144.7], 'mq', 6) + ln([-12, -50], [-20, 0], 'mq', 4) + rc(0, -3, 52, 4),
      front: j => ci(j.sh, 6),
      dicas: ['Costas e ombros bem apoiados no encosto.', 'Pés no meio da plataforma, na largura do quadril.', 'Desça controlando até cerca de 90° nos joelhos.', 'Não tire os calcanhares da plataforma.'] },
    { id: 'leg-press', nome: 'Leg press 45°', grupo: 'Pernas e glúteos', aparelho: 'Máquina leg press 45', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.8,
      poses: [{ hip: [-40, -30], t: -135, hd: 20, nf: [-8, -62], ff: [-6, -64], ft: -135, na: [60, 80] }, { hip: [-40, -30], t: -135, hd: 20, nf: [17, -87], ff: [19, -89], ft: -135, na: [60, 80] }],
      back: j => ln([-34, -20], [-90, -76], 'mq', 6) + ln([-40, -20], [-40, 0], 'mq', 4) + ln([-6.6, -43.6], [55.2, -105.4], 'mq', 4) + ln([-6.6, -43.6], [-6.6, 0], 'mq', 4),
      front: j => { const a = j.nLeg[2], u = [0.707, -0.707], v = [0.707, 0.707]; const o = add(a, u, 5); return ln(add(o, v, 8), add(o, v, -24), 'mq', 6); },
      dicas: ['Costas e quadril bem apoiados no banco.', 'Pés na largura do quadril no meio da plataforma.', 'Desça até os joelhos formarem cerca de 90°.', 'Empurre sem travar os joelhos no final.'] },
    { id: 'afundo', nome: 'Afundo (passada parada)', grupo: 'Pernas e glúteos', aparelho: 'Peso do corpo ou halteres', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.6,
      poses: [S({ hip: [-38, -76], t: 178, ff: [-82, -8], ftf: 40, na: [4, 4] }), S({ hip: [-40, -46], t: 178, ff: [-82, -8], ftf: 40, na: [4, 4] })],
      dicas: ['Passo largo, tronco reto.', 'Desça até o joelho de trás quase tocar o chão.', 'O joelho da frente não passa muito da ponta do pé.', 'Faça todas as repetições de um lado e depois troque.'] },
    { id: 'bulgaro', nome: 'Agachamento búlgaro', grupo: 'Pernas e glúteos', aparelho: 'Banco e halteres', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.6,
      poses: [S({ hip: [-30, -78], t: 176, ff: [-82, -46], ftf: -80, na: [4, 4] }), S({ hip: [-34, -48], t: 176, ff: [-82, -46], ftf: -80, na: [4, 4] })],
      back: j => seat(-106, -64, -40),
      dicas: ['Peito do pé de trás apoiado no banco.', 'Pé da frente bem à frente do banco.', 'Desça na vertical até a coxa da frente ficar paralela ao chão.', 'Faça um lado e depois o outro.'] },
    { id: 'elevacao-pelvica', nome: 'Elevação pélvica', grupo: 'Pernas e glúteos', aparelho: 'Colchonete, barra ou máquina (hip thrust)', alvo: ['gluteos', 'posterior'], tipo: 'C', dur: 2.4, mat: true,
      poses: [{ hip: [-10, -11], t: -90, nf: [48, -4], ft: 90, na: [92, 90] },
              { hip: [-14, -44], t: -54, hd: -36, nf: [48, -4], ft: 90, na: [65, 90] }],
      dicas: ['Deitada, joelhos dobrados e pés apoiados perto do quadril.', 'Suba o quadril contraindo os glúteos.', 'No topo, corpo alinhado dos ombros aos joelhos; segure 1 segundo.', 'Desça controlando, sem arquear a lombar.'] },
    { id: 'stiff', nome: 'Stiff com halteres', grupo: 'Pernas e glúteos', aparelho: 'Halteres ou barra', alvo: ['posterior', 'gluteos', 'lombar'], tipo: 'C', dur: 3, ...halteres,
      poses: [S({ nf: [2, 0], ff: [5, 0] }), S({ hip: [-24, -80], t: 100, nf: [2, 0], ff: [5, 0] })],
      dicas: ['Joelhos levemente flexionados o tempo todo.', 'Empurre o quadril para trás, halteres rentes às pernas.', 'Coluna sempre reta; desça até sentir a parte de trás da coxa.', 'Suba contraindo os glúteos.'] },
    { id: 'mesa-flexora', nome: 'Mesa flexora', grupo: 'Pernas e glúteos', aparelho: 'Máquina mesa flexora', alvo: ['posterior'], tipo: 'I', dur: 2.4,
      poses: [{ hip: [-15, -46], t: 90, hd: -10, nf: [-99, -46], ff: [-97, -46], nh: [64, -42], en: -1 }, { hip: [-15, -46], t: 90, hd: -10, nf: [-42, -85], ff: [-40, -85], nh: [64, -42], en: -1 }],
      back: j => rc(-62, -40, 134, 7) + ln([-40, -34], [-40, 0], 'mq', 4) + ln([50, -34], [50, 0], 'mq', 4),
      front: j => ci(j.nLeg[2], 6),
      dicas: ['Deitada de bruços, joelhos logo após a ponta do banco.', 'Rolo apoiado acima dos calcanhares.', 'Dobre os joelhos trazendo o rolo em direção aos glúteos.', 'Quadril colado no banco; desça devagar.'] },
    { id: 'cadeira-flexora', nome: 'Cadeira flexora', grupo: 'Pernas e glúteos', aparelho: 'Máquina cadeira flexora', alvo: ['posterior'], tipo: 'I', dur: 2.4,
      poses: [{ hip: [0, -50], t: 172, nf: [84, -50], ff: [84, -50], na: [20, 10] }, { hip: [0, -50], t: 172, nf: [27, -11], ff: [27, -11], na: [20, 10] }],
      back: j => seat(-22, 34, -44) + ln([-16, -46], [-25, -112], 'mq', 6),
      front: j => ci(j.nLeg[2], 6) + rc(j.nLeg[1][0] - 12, j.nLeg[1][1] - 13, 20, 6),
      dicas: ['Joelhos alinhados com o eixo da máquina.', 'Rolo de cima travando as coxas, rolo de baixo nos calcanhares.', 'Dobre os joelhos puxando o rolo para baixo e para trás.', 'Volte devagar, sem deixar o peso bater.'] },
    { id: 'cadeira-extensora', nome: 'Cadeira extensora', grupo: 'Pernas e glúteos', aparelho: 'Máquina cadeira extensora', alvo: ['quadriceps'], tipo: 'I', dur: 2.4,
      poses: [{ hip: [0, -50], t: 172, nf: [37, -8], ff: [37, -8], na: [20, 10] }, { hip: [0, -50], t: 172, nf: [84, -50], ff: [84, -50], na: [20, 10] }],
      back: j => seat(-22, 34, -44) + ln([-16, -46], [-25, -112], 'mq', 6),
      front: j => ci(add(j.nLeg[2], [3, -3]), 6),
      dicas: ['Costas apoiadas e joelhos alinhados com o eixo da máquina.', 'Rolo na frente das canelas, perto dos tornozelos.', 'Estenda as pernas até quase esticar e segure 1 segundo.', 'Desça devagar.'] },
    { id: 'cadeira-abdutora', nome: 'Cadeira abdutora', grupo: 'Pernas e glúteos', aparelho: 'Máquina abdutora', alvo: ['gluteos'], tipo: 'I', dur: 2.4,
      poses: [F({ hip: [0, -50], legs: [{ k: [17, -46], f: [17, -6] }], arms: [{ a: [14, 6] }] }), F({ hip: [0, -50], legs: [{ k: [40, -46], f: [36, -6] }], arms: [{ a: [14, 6] }] })],
      back: j => rc(-26, -118, 52, 70, 'mqb', 8) + seat(-34, 34, -44),
      front: j => rc(j.rLeg[1][0] + 5, -62, 6, 30) + rc(j.lLeg[1][0] - 11, -62, 6, 30),
      dicas: ['Costas apoiadas, almofadas na parte de fora dos joelhos.', 'Abra as pernas empurrando as almofadas para fora.', 'Segure 1 segundo aberta.', 'Volte devagar, sem deixar os pesos baterem.'] },
    { id: 'cadeira-adutora', nome: 'Cadeira adutora', grupo: 'Pernas e glúteos', aparelho: 'Máquina adutora', alvo: ['adutores'], tipo: 'I', dur: 2.4,
      poses: [F({ hip: [0, -50], legs: [{ k: [40, -46], f: [36, -6] }], arms: [{ a: [14, 6] }] }), F({ hip: [0, -50], legs: [{ k: [16, -46], f: [17, -6] }], arms: [{ a: [14, 6] }] })],
      back: j => rc(-26, -118, 52, 70, 'mqb', 8) + seat(-34, 34, -44),
      front: j => rc(j.rLeg[1][0] - 11, -62, 6, 30) + rc(j.lLeg[1][0] + 5, -62, 6, 30),
      dicas: ['Costas apoiadas, almofadas na parte de dentro dos joelhos.', 'Feche as pernas apertando as almofadas.', 'Segure 1 segundo fechada.', 'Abra devagar, até onde for confortável.'] },
    { id: 'coice', nome: 'Coice de glúteo (4 apoios)', grupo: 'Pernas e glúteos', aparelho: 'Colchonete / caneleira', alvo: ['gluteos'], tipo: 'I', dur: 2.2, mat: true,
      poses: [{ hip: [-35, -44], t: 104, nf: [-77, -5], ff: [-77, -5], ft: -90, nh: [21, 0], en: -1 },
              { hip: [-35, -44], t: 104, nf: [-77, -86], ff: [-77, -5], ft: 180, ftf: -90, nh: [21, 0], en: -1 }],
      dicas: ['Mãos abaixo dos ombros e joelhos abaixo do quadril.', 'Leve um pé em direção ao teto, joelho dobrado em 90°.', 'Não gire o quadril nem arqueie a lombar.', 'Faça um lado e depois o outro.'] },
    { id: 'coice-polia', nome: 'Coice na polia', grupo: 'Pernas e glúteos', aparelho: 'Polia baixa + tornozeleira (cabo)', alvo: ['gluteos'], tipo: 'I', dur: 2.4,
      poses: [{ hip: [0, -84], t: 160, nf: [4, 0], ff: [0, 0], nh: [44, -110], en: -1 }, { hip: [0, -84], t: 160, nf: [-50, -30], ff: [0, 0], nh: [44, -110], en: -1 }],
      back: j => ln([48, 0], [48, -150], 'mq', 5) + ci([48, -6], 5) + ln([48, -6], j.nLeg[2], 'cabo'),
      front: j => ci(j.nLeg[2], 4.5),
      dicas: ['Tornozeleira presa na polia baixa.', 'Segure no aparelho e incline levemente o tronco.', 'Leve a perna para trás contraindo o glúteo, sem arquear a lombar.', 'Volte devagar; faça um lado e depois o outro.'] },
    { id: 'abducao-polia', nome: 'Abdução de quadril na polia', grupo: 'Pernas e glúteos', aparelho: 'Polia baixa + tornozeleira (cabo)', alvo: ['gluteos'], tipo: 'I', dur: 2.4,
      poses: [F({ legs: [{ a: [2, 2] }, { a: [0, 0] }], arms: [{ a: [6, 4] }, { h: [57, -112], s: -1 }] }), F({ legs: [{ a: [36, 36] }, { a: [0, 0] }], arms: [{ a: [6, 4] }, { h: [57, -112], s: -1 }] })],
      back: j => ln([-62, 0], [-62, -170], 'mq', 5) + ci([-60, -6], 5) + ln([-60, -6], j.rLeg[2], 'cabo'),
      front: j => ci(j.rLeg[2], 4.5),
      dicas: ['Tornozeleira na perna de fora, polia baixa do lado oposto.', 'Segure no aparelho e mantenha o tronco reto.', 'Afaste a perna para o lado sem inclinar o corpo.', 'Volte devagar; faça um lado e depois o outro.'] },
    { id: 'panturrilha', nome: 'Panturrilha em pé', grupo: 'Pernas e glúteos', aparelho: 'Máquina panturrilha em pé ou degrau', alvo: ['panturrilha'], tipo: 'I', dur: 1.8,
      poses: [S({ ft: 90 }), S({ hip: [0, -92], nf: [0, -8], ff: [3, -8], ft: 50 })],
      dicas: ['Suba na ponta dos pés o máximo possível.', 'Segure 1 segundo no alto.', 'Desça devagar até alongar bem a panturrilha.', 'Na máquina, ombros bem apoiados nas almofadas.'] },
    { id: 'panturrilha-sentada', nome: 'Panturrilha sentada', grupo: 'Pernas e glúteos', aparelho: 'Máquina (gêmeos sentado)', alvo: ['panturrilha'], tipo: 'I', dur: 1.8,
      poses: [{ hip: [0, -50], t: 178, nf: [42, -8], ff: [44, -8], ft: 70, nh: [32, -62] }, { hip: [0, -50], t: 178, nf: [42, -15], ff: [44, -15], ft: 25, nh: [32, -69] }],
      back: j => seat(-24, 26, -44) + rc(48, -4, 22, 4),
      front: j => rc(j.nLeg[1][0] - 14, j.nLeg[1][1] - 12, 26, 6),
      dicas: ['Ponta dos pés na plataforma, almofada sobre os joelhos.', 'Suba os calcanhares o máximo possível.', 'Segure 1 segundo no alto.', 'Desça devagar alongando a panturrilha.'] },

    /* ---------- Costas ---------- */
    { id: 'puxador-frente', nome: 'Puxador frente', grupo: 'Costas', aparelho: 'Polia alta / pulley (puxada)', alvo: ['costas', 'biceps'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [0, -50], t: 170, nf: [45, 0], ff: [48, 0], na: [170, 175] }, { hip: [0, -50], t: 170, nf: [45, 0], ff: [48, 0], na: [-15, 150] }],
      back: j => seat(-20, 26, -44) + ci([16, -202], 5) + ln([16, -202], j.nArm[2], 'cabo'),
      front: j => ci(add(j.nLeg[1], [-2, -9]), 6) + rc(j.nArm[2][0] - 3, j.nArm[2][1] - 3, 6, 6),
      dicas: ['Coxas presas sob o apoio, pegada um pouco mais aberta que os ombros.', 'Puxe a barra até a parte de cima do peito.', 'Leve os cotovelos para baixo e aproxime as escápulas.', 'Suba devagar, sem soltar o peso.'] },
    { id: 'remada-sentada', nome: 'Remada sentada', grupo: 'Costas', aparelho: 'Polia baixa / remada baixa (cabo, triângulo)', alvo: ['costas', 'biceps'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [-30, -26], t: 176, nf: [42, -14], ff: [44, -14], ft: 170, na: [80, 85] }, { hip: [-30, -26], t: 176, nf: [42, -14], ff: [44, -14], ft: 170, na: [-40, 85] }],
      back: j => seat(-62, 14, -22) + ln([52, -32], [52, 0], 'mq', 5) + ci([66, -62], 5) + ln([66, -62], j.nArm[2], 'cabo'),
      front: j => ci(j.nArm[2], 4),
      dicas: ['Tronco reto, pés apoiados e joelhos levemente dobrados.', 'Puxe o triângulo em direção ao umbigo.', 'Aproxime as escápulas no final, sem jogar o tronco para trás.', 'Volte esticando os braços devagar.'] },
    { id: 'remada', nome: 'Remada curvada com halteres', grupo: 'Costas', aparelho: 'Halteres', alvo: ['costas', 'biceps'], tipo: 'C', dur: 2.4, ...halteres,
      poses: [S({ hip: [-20, -78], t: 110, na: [0, 0] }), S({ hip: [-20, -78], t: 110, na: [-95, 0] })],
      dicas: ['Incline o tronco à frente, joelhos levemente flexionados.', 'Puxe os halteres em direção ao quadril.', 'Aproxime as escápulas no final do movimento.', 'Desça controlando.'] },

    /* ---------- Peito, ombros e braços ---------- */
    { id: 'peck-deck', nome: 'Peck deck (voador)', grupo: 'Peito', aparelho: 'Máquina voador (peck deck, fly)', alvo: ['peito'], tipo: 'I', dur: 2.6,
      poses: [F({ hip: [0, -50], legs: [{ k: [16, -46], f: [18, -6] }], arms: [{ e: [44, -104], h: [44, -132] }] }), F({ hip: [0, -50], legs: [{ k: [16, -46], f: [18, -6] }], arms: [{ e: [22, -98], h: [8, -116] }] })],
      back: j => rc(-26, -122, 52, 74, 'mqb', 8) + seat(-34, 34, -44),
      front: j => ln(j.rArm[1], j.rArm[2], 'pad') + ln(j.lArm[1], j.lArm[2], 'pad'),
      dicas: ['Costas apoiadas, cotovelos na altura dos ombros.', 'Antebraços encostados nas almofadas.', 'Feche os braços à frente do peito contraindo o peitoral.', 'Abra devagar, sem passar da linha dos ombros.'] },
    { id: 'supino-reto', nome: 'Supino reto com barra', grupo: 'Peito', aparelho: 'Barra e banco reto', alvo: ['peito', 'triceps', 'ombros'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, nh: [34, -104] }, { hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, nh: [26, -50] }],
      back: j => seat(-60, 60, -40),
      front: j => ci(j.nArm[2], 4) + ci(j.nArm[2], 12, 'plate'),
      dicas: ['Deitada no banco, olhos abaixo da barra, pés firmes no chão.', 'Mãos um pouco mais abertas que os ombros.', 'Desça a barra até tocar levemente o meio do peito.', 'Empurre para cima sem tirar o quadril do banco.'] },
    { id: 'supino-inclinado', nome: 'Supino inclinado com halteres', grupo: 'Peito', aparelho: 'Halteres e banco inclinado', alvo: ['peito', 'ombros', 'triceps'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [-20, -50], t: -120, hd: -10, nf: [22, 0], ff: [25, 0], nh: [-66, -137] }, { hip: [-20, -50], t: -120, hd: -10, nf: [22, 0], ff: [25, 0], nh: [-58, -82], en: -1 }],
      back: j => ln([-23.5, -43.9], [-81, -77], 'mq', 7) + rc(-30, -46, 40, 6) + ln([-14, -40], [-14, 0], 'mq', 5) + ln([-58, -66], [-44, 0], 'mq', 4) + DBC(j.fArm[2]),
      front: j => DBC(j.nArm[2]),
      dicas: ['Banco inclinado a cerca de 30°.', 'Halteres na linha do peito, cotovelos levemente abaixo das mãos.', 'Empurre para cima aproximando os halteres no alto.', 'Desça devagar até sentir o peito alongar.'] },
    { id: 'supino-maquina', nome: 'Supino na máquina', grupo: 'Peito', aparelho: 'Máquina supino (chest press)', alvo: ['peito', 'triceps'], tipo: 'C', dur: 2.4,
      poses: [{ hip: [0, -50], t: 176, nf: [40, 0], ff: [43, 0], na: [-40, 85] }, { hip: [0, -50], t: 176, nf: [40, 0], ff: [43, 0], na: [88, 90] }],
      back: j => seat(-24, 26, -44) + ln([-7, -48], [-2.5, -114], 'mq', 7) + ln([78, 0], [78, -150], 'mq', 5),
      front: j => ln(add(j.nArm[2], [0, -8]), add(j.nArm[2], [0, 8]), 'mq', 5),
      dicas: ['Ajuste o banco para as pegadas ficarem na altura do meio do peito.', 'Costas apoiadas no encosto.', 'Empurre até quase estender os braços.', 'Volte devagar sem deixar o peso encostar.'] },
    { id: 'crucifixo', nome: 'Crucifixo com halteres', grupo: 'Peito', aparelho: 'Halteres e banco reto', alvo: ['peito'], tipo: 'I', dur: 2.8,
      poses: [F({ hip: [0, -84], legs: [{ a: [4, 2] }], arms: [{ e: [44, -144], h: [70, -140] }] }), F({ hip: [0, -84], legs: [{ a: [4, 2] }], arms: [{ e: [26, -138], h: [8, -134] }] })],
      back: j => rc(-17, -196, 34, 130, 'mqb', 6),
      front: j => DBC(j.rArm[2]) + DBC(j.lArm[2]),
      dicas: ['(Animação vista de cima.) Deitada no banco reto, halteres acima do peito.', 'Cotovelos levemente dobrados durante todo o movimento.', 'Abra os braços em arco até sentir o peito alongar.', 'Feche em arco, como num abraço, contraindo o peitoral.'] },
    { id: 'crossover', nome: 'Crossover (polia)', grupo: 'Peito', aparelho: 'Polia alta / cross over (cabo)', alvo: ['peito'], tipo: 'I', dur: 2.6,
      poses: [F({ legs: [{ a: [6, 4] }], arms: [{ e: [46, -150], h: [64, -172] }] }), F({ legs: [{ a: [6, 4] }], arms: [{ e: [28, -122], h: [5, -102] }] })],
      back: j => ln([106, 0], [106, -206], 'mq', 5) + ln([-106, 0], [-106, -206], 'mq', 5) + ci([100, -198], 4) + ci([-100, -198], 4) + ln([100, -198], j.rArm[2], 'cabo') + ln([-100, -198], j.lArm[2], 'cabo'),
      dicas: ['Polias no alto, um pé à frente do outro.', 'Tronco levemente inclinado, cotovelos um pouco dobrados.', 'Traga as mãos para baixo e para o centro, à frente do quadril.', 'Volte devagar até sentir o peito alongar.'] },
    { id: 'pullover', nome: 'Pullover com halter', grupo: 'Peito', aparelho: 'Halter e banco reto', alvo: ['peito', 'costas'], tipo: 'I', dur: 2.8,
      poses: [{ hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, na: [128, 128] }, { hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, na: [178, 178] }],
      back: j => seat(-60, 60, -40),
      front: j => DB(j.nArm[2], ang(j.nArm[1], j.nArm[2]) - 90),
      dicas: ['Deitada no banco, segure um halter com as duas mãos acima do peito.', 'Leve o peso para trás da cabeça com os cotovelos levemente dobrados.', 'Desça até sentir alongar peito e costas, sem arquear a lombar.', 'Volte o peso para cima do peito.'] },
    { id: 'flexao', nome: 'Flexão de braço', grupo: 'Peito', aparelho: 'Peso do corpo', alvo: ['peito', 'triceps'], tipo: 'C', dur: 2.4, mat: true,
      poses: [{ hip: [-16, -35], t: 110, nf: [-95, -6], ft: 30, nh: [45, 0], en: 1 },
              { hip: [-12, -16], t: 96.5, nf: [-95, -6], ft: 30, nh: [45, 0], en: 1 }],
      dicas: ['Mãos um pouco além da largura dos ombros.', 'Corpo reto da cabeça aos pés, abdômen firme.', 'Desça o peito perto do chão, cotovelos a ~45° do corpo.', 'Para facilitar, apoie os joelhos no chão.'] },
    { id: 'elevacao-lateral', nome: 'Elevação lateral', grupo: 'Ombros', aparelho: 'Halteres', alvo: ['ombros'], tipo: 'I', dur: 2.4,
      poses: [F({ legs: [{ a: [2, 2] }], arms: [{ a: [8, 6] }] }), F({ legs: [{ a: [2, 2] }], arms: [{ a: [86, 88] }] })],
      front: j => DBC(j.rArm[2]) + DBC(j.lArm[2]),
      dicas: ['Halteres ao lado do corpo, cotovelos levemente dobrados.', 'Eleve os braços para os lados até a altura dos ombros.', 'Não balance o tronco nem suba os ombros em direção às orelhas.', 'Desça devagar.'] },
    { id: 'elevacao-frontal', nome: 'Elevação frontal', grupo: 'Ombros', aparelho: 'Halteres', alvo: ['ombros'], tipo: 'I', dur: 2.4, ...halteres,
      poses: [S({ na: [4, 4] }), S({ na: [92, 92] })],
      dicas: ['Braços quase estendidos, cotovelos levemente dobrados.', 'Eleve até a altura dos ombros.', 'Sem balançar o corpo.', 'Desça devagar.'] },
    { id: 'desenvolvimento', nome: 'Desenvolvimento com halteres', grupo: 'Ombros', aparelho: 'Halteres', alvo: ['ombros', 'triceps'], tipo: 'C', dur: 2.4, ...halteres,
      poses: [S({ na: [38, 172] }), S({ na: [178, 178] })],
      dicas: ['Halteres na altura dos ombros, cotovelos abaixo das mãos.', 'Empurre para cima até quase estender os braços.', 'Não arqueie a lombar; abdômen firme.', 'Desça devagar até a altura dos ombros.'] },
    { id: 'rosca', nome: 'Rosca direta', grupo: 'Braços', aparelho: 'Halteres ou barra', alvo: ['biceps'], tipo: 'I', dur: 2.2, ...halteres,
      poses: [S({ na: [3, 3] }), S({ na: [6, 158] })],
      dicas: ['Cotovelos colados ao corpo.', 'Suba o peso com as palmas viradas para cima.', 'Não balance o tronco.', 'Desça até estender os braços.'] },
    { id: 'rosca-martelo', nome: 'Rosca martelo com halter', grupo: 'Braços', aparelho: 'Halteres', alvo: ['biceps'], tipo: 'I', dur: 2.2,
      poses: [S({ na: [3, 3] }), S({ na: [6, 158] })],
      back: j => DBC(j.fArm[2]), front: j => DBC(j.nArm[2]),
      dicas: ['Palmas viradas uma para a outra, como quem segura um martelo.', 'Cotovelos colados ao corpo.', 'Suba sem girar os punhos.', 'Desça devagar.'] },
    { id: 'triceps-corda', nome: 'Tríceps na corda', grupo: 'Braços', aparelho: 'Polia alta + corda (pulley)', alvo: ['triceps'], tipo: 'I', dur: 2.2,
      poses: [S({ t: 172, na: [8, 160] }), S({ t: 172, na: [8, 8] })],
      back: j => ln([58, 0], [58, -204], 'mq', 5) + ci([52, -200], 5) + ln([52, -200], j.nArm[2], 'cabo'),
      front: j => ln(j.nArm[2], add(j.nArm[2], [-3, 9]), 'cabo', 3) + ln(j.nArm[2], add(j.nArm[2], [4, 9]), 'cabo', 3),
      dicas: ['Cotovelos colados ao corpo, parados.', 'Empurre a corda para baixo até esticar os braços.', 'No final, abra levemente a corda para os lados.', 'Suba devagar até a altura do peito.'] },
    { id: 'triceps-frances', nome: 'Tríceps francês', grupo: 'Braços', aparelho: 'Halter', alvo: ['triceps'], tipo: 'I', dur: 2.4,
      poses: [S({ na: [172, -12] }), S({ na: [176, 176] })],
      front: j => DB(j.nArm[2], ang(j.nArm[1], j.nArm[2]) + 90),
      dicas: ['Segure um halter com as duas mãos acima da cabeça.', 'Desça o peso atrás da cabeça dobrando só os cotovelos.', 'Cotovelos apontando para cima, perto da cabeça.', 'Estenda os braços de volta.'] },

    /* ---------- Abdômen ---------- */
    { id: 'abdominal', nome: 'Abdominal curto', grupo: 'Abdômen', aparelho: 'Colchonete', alvo: ['abdomen'], tipo: 'I', dur: 2.2, mat: true,
      poses: [{ hip: [0, -11], t: -90, nf: [46, -4], ft: 90, na: [92, 90] },
              { hip: [0, -11], t: -116, hd: 8, nf: [46, -4], ft: 90, na: [100, 96] }],
      dicas: ['Deitada, joelhos dobrados, pés no chão.', 'Tire as escápulas do chão contraindo o abdômen.', 'Olhar para cima, sem puxar o pescoço.', 'Solte o ar ao subir.'] },
    { id: 'abdominal-infra', nome: 'Abdominal infra', grupo: 'Abdômen', aparelho: 'Colchonete', alvo: ['abdomen'], tipo: 'I', dur: 2.4, mat: true,
      poses: [{ hip: [0, -11], t: -90, nf: [72, -16], ff: [72, -16], na: [92, 90] }, { hip: [0, -11], t: -90, nf: [40, -58], ff: [40, -58], na: [92, 90] }],
      dicas: ['Deitada, braços ao lado do corpo e lombar colada no chão.', 'Traga os joelhos em direção ao peito tirando levemente o quadril do chão.', 'Volte devagar sem encostar os pés no chão.', 'Solte o ar ao subir as pernas.'] },
    { id: 'abdominal-remador', nome: 'Abdominal remador', grupo: 'Abdômen', aparelho: 'Colchonete', alvo: ['abdomen'], tipo: 'I', dur: 2.4, mat: true,
      poses: [{ hip: [0, -11], t: -90, nf: [83, -12], ff: [83, -12], na: [-92, -90] }, { hip: [0, -11], t: -150, nf: [34, -14], ff: [34, -14], na: [-260, -265] }],
      dicas: ['Comece deitada com braços e pernas estendidos.', 'Suba o tronco e traga os joelhos ao peito ao mesmo tempo.', 'Braços à frente, passando ao lado das pernas.', 'Volte devagar à posição inicial.'] },
    { id: 'prancha', nome: 'Prancha', grupo: 'Abdômen', aparelho: 'Colchonete', alvo: ['abdomen'], tipo: 'I', dur: 3, mat: true, tempo: true,
      poses: [{ hip: [-17, -20], t: 99.7, nf: [-100, -6], ft: 30, na: [0, 90] },
              { hip: [-17, -21.5], t: 99.4, nf: [-100, -6], ft: 30, na: [0, 90] }],
      dicas: ['Antebraços no chão, cotovelos abaixo dos ombros.', 'Corpo reto: não deixe o quadril cair nem subir demais.', 'Abdômen e glúteos contraídos.', 'Respire normalmente e segure o tempo indicado.'] },

    /* ---------- Aeróbico ---------- */
    { id: 'aerobico', nome: 'Esteira (caminhada ou corrida)', grupo: 'Aeróbico', aparelho: 'Esteira', alvo: ['cardio'], tipo: 'I', dur: 1.1, tempo: true,
      poses: [{ hip: [0, -82], t: 178, nf: [24, -2], ff: [-26, -4], na: [-25, -10], fa: [25, 40] }, { hip: [0, -82], t: 178, nf: [-26, -4], ff: [24, -2], na: [25, 40], fa: [-25, -10] }],
      back: j => rc(-64, -3, 128, 6, 'mqf', 3) + ln([58, -2], [72, -112], 'mq', 5) + ln([72, -112], [50, -114], 'mq', 5),
      dicas: ['Esteira, bicicleta ou elíptico, no ritmo combinado com o professor.', 'Comece leve nos primeiros minutos.', 'Mantenha um ritmo em que ainda consiga conversar.', 'Postura ereta, sem se apoiar no painel.'] },
    /* ---------- Novos: pernas ---------- */
    { id: 'levantamento-terra', nome: 'Levantamento terra', grupo: 'Pernas e glúteos', aparelho: 'Barra (anilhas)', alvo: ['posterior', 'gluteos', 'costas', 'lombar'], tipo: 'C', dur: 3,
      poses: [{ hip: [-26, -52], t: 128, nf: [8, 0], ff: [11, 0], na: [0, 0] }, S({ nf: [8, 0], ff: [11, 0], hip: [2, -84] })],
      front: j => ci(j.nArm[2], 4) + ci(j.nArm[2], 16, 'plate'),
      dicas: ['Barra perto das canelas, pés na largura do quadril.', 'Coluna neutra e peito aberto antes de puxar.', 'Suba empurrando o chão e estendendo quadril e joelhos juntos.', 'Desça a barra rente às pernas, sem arredondar as costas.'] },
    { id: 'hip-thrust', nome: 'Elevação pélvica com barra (hip thrust)', grupo: 'Pernas e glúteos', aparelho: 'Barra e banco (ou máquina hip thrust)', alvo: ['gluteos', 'posterior'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [-22, -14], t: -122, nf: [28, 0], ff: [31, 0], na: [40, 20] }, { hip: [-20, -46], t: -90, nf: [28, 0], ff: [31, 0], na: [40, 60] }],
      back: j => seat(-112, -64, -40),
      front: j => ci(add(j.hip, [6, -9]), 4) + ci(add(j.hip, [6, -9]), 13, 'plate'),
      dicas: ['Parte de cima das costas apoiada no banco, barra sobre o quadril (use uma proteção).', 'Pés firmes, canelas na vertical no alto do movimento.', 'Suba o quadril contraindo bem os glúteos e segure 1 segundo.', 'Queixo levemente para baixo; não arqueie a lombar.'] },
    { id: 'subida-banco', nome: 'Subida no banco (step-up)', grupo: 'Pernas e glúteos', aparelho: 'Banco ou caixa (halteres opcionais)', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [-6, -80], t: 176, nf: [32, -36], ff: [-12, 0], na: [4, 4] }, { hip: [26, -118], t: 178, nf: [32, -36], ff: [24, -52], na: [4, 4] }],
      back: j => rc(8, -36, 58, 36, 'mqf', 3),
      dicas: ['Pé inteiro apoiado em cima do banco.', 'Suba empurrando com a perna da frente, sem dar impulso com a de trás.', 'Desça devagar e controlado.', 'Faça todas as repetições de um lado e depois troque.'] },
    { id: 'agachamento-goblet', nome: 'Agachamento goblet', grupo: 'Pernas e glúteos', aparelho: 'Halter ou kettlebell', alvo: ['quadriceps', 'gluteos'], tipo: 'C', dur: 2.6,
      poses: [S({ na: [10, 140] }), S({ hip: [-26, -46], t: 150, na: [10, 140] })],
      front: j => DBV(add(j.nArm[2], [2, 4])),
      dicas: ['Segure o halter junto ao peito com as duas mãos.', 'Pés um pouco mais abertos que os ombros.', 'Desça mantendo o tronco o mais reto possível.', 'Cotovelos passam por dentro dos joelhos na descida.'] },

    /* ---------- Novos: costas ---------- */
    { id: 'barra-fixa', nome: 'Barra fixa', grupo: 'Costas', aparelho: 'Barra fixa ou graviton (assistida)', alvo: ['costas', 'biceps'], tipo: 'C', dur: 2.8,
      poses: [{ hip: [2, -82], t: 180, nf: [-20, -22], ff: [-17, -22], nh: [4, -198], en: -1 }, { hip: [2, -120], t: 180, nf: [-20, -60], ff: [-17, -60], nh: [4, -198], en: -1 }],
      back: j => ln([4, -198], [74, -198], 'mq', 5) + ln([74, -198], [74, 0], 'mq', 5),
      front: j => ci([4, -198], 4),
      dicas: ['Pegada um pouco mais aberta que os ombros, palmas para frente.', 'Puxe o corpo até o queixo passar a barra.', 'Desça até quase estender os braços, sem balançar.', 'Se ainda não consegue, use o graviton ou uma faixa elástica.'] },
    { id: 'remada-unilateral', nome: 'Remada unilateral (serrote)', grupo: 'Costas', aparelho: 'Halter e banco', alvo: ['costas', 'biceps'], tipo: 'C', dur: 2.4,
      poses: [{ hip: [-14, -62], t: 95, nf: [-20, 0], ff: [-52, -44], kf: 1, ftf: -90, na: [0, 0], fh: [46, -42], ef: -1 }, { hip: [-14, -62], t: 95, nf: [-20, 0], ff: [-52, -44], kf: 1, ftf: -90, na: [-95, 0], fh: [46, -42], ef: -1 }],
      back: j => seat(-62, 62, -40),
      front: j => DB(j.nArm[2], ang(j.nArm[1], j.nArm[2])),
      dicas: ['Um joelho e uma mão apoiados no banco, costas retas.', 'Puxe o halter em direção ao quadril, cotovelo rente ao corpo.', 'Aperte as costas no alto do movimento.', 'Faça um lado e depois o outro.'] },
    { id: 'pulldown-estendido', nome: 'Pulldown com braços estendidos', grupo: 'Costas', aparelho: 'Polia alta + barra ou corda', alvo: ['costas'], tipo: 'I', dur: 2.6,
      poses: [S({ hip: [-6, -84], t: 165, nf: [2, 0], ff: [5, 0], na: [150, 150] }), S({ hip: [-6, -84], t: 165, nf: [2, 0], ff: [5, 0], na: [12, 12] })],
      back: j => ln([62, 0], [62, -206], 'mq', 5) + ci([56, -200], 5) + ln([56, -200], j.nArm[2], 'cabo'),
      front: j => ci(j.nArm[2], 4),
      dicas: ['De frente para a polia alta, tronco levemente inclinado.', 'Braços quase estendidos, cotovelos levemente dobrados.', 'Leve a barra até as coxas usando as costas.', 'Suba devagar até a altura da cabeça.'] },
    { id: 'remada-maquina', nome: 'Remada na máquina', grupo: 'Costas', aparelho: 'Máquina remada (apoio no peito)', alvo: ['costas', 'biceps'], tipo: 'C', dur: 2.4,
      poses: [{ hip: [0, -50], t: 172, nf: [42, 0], ff: [45, 0], na: [86, 88] }, { hip: [0, -50], t: 172, nf: [42, 0], ff: [45, 0], na: [-50, 95] }],
      back: j => seat(-24, 26, -44) + ln([84, 0], [84, -150], 'mq', 5),
      front: j => rc(j.sh[0] + 8, j.sh[1] - 2, 7, 34) + ln(add(j.nArm[2], [0, -8]), add(j.nArm[2], [0, 8]), 'mq', 5),
      dicas: ['Peito apoiado na almofada, pés firmes.', 'Puxe as pegadas levando os cotovelos para trás.', 'Aproxime as escápulas no final.', 'Volte esticando os braços devagar.'] },
    { id: 'hiperextensao', nome: 'Hiperextensão lombar (banco romano)', grupo: 'Costas', aparelho: 'Banco romano / banco 45°', alvo: ['lombar', 'gluteos'], tipo: 'I', dur: 2.8,
      poses: [{ hip: [-8, -88], t: 36, nf: [-54, -16], ff: [-51, -16], ft: 30, na: [25, 25] }, { hip: [-8, -88], t: 140, nf: [-54, -16], ff: [-51, -16], ft: 30, na: [140, 140] }],
      back: j => ln([-62, -10], [-44, -20], 'mq', 5) + ln([-2, -80], [-34, 0], 'mq', 5) + ln([-52, -16], [-56, 0], 'mq', 4),
      front: j => ci([-4, -82], 7),
      dicas: ['Quadril apoiado na almofada, pés presos no apoio.', 'Desça o tronco com a coluna reta.', 'Suba até alinhar o tronco com as pernas, sem passar disso.', 'Movimento controlado, sem dar trancos.'] },

    /* ---------- Novos: peito ---------- */
    { id: 'supino-reto-halteres', nome: 'Supino reto com halteres', grupo: 'Peito', aparelho: 'Halteres e banco reto', alvo: ['peito', 'triceps', 'ombros'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, nh: [34, -104] }, { hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, nh: [26, -50] }],
      back: j => seat(-60, 60, -40) + DBC(j.fArm[2]),
      front: j => DBC(j.nArm[2]),
      dicas: ['Deitada no banco, halteres na linha do peito.', 'Empurre para cima aproximando os halteres no alto.', 'Desça devagar até os cotovelos ficarem um pouco abaixo do banco.', 'Pés firmes no chão e escápulas encaixadas.'] },
    { id: 'supino-declinado', nome: 'Supino declinado', grupo: 'Peito', aparelho: 'Barra e banco declinado', alvo: ['peito', 'triceps'], tipo: 'C', dur: 2.6,
      poses: [{ hip: [-25, -56], t: 72, hd: -4, nf: [-58, -48], ff: [-55, -48], kn: -1, ft: 0, nh: [32, -98] }, { hip: [-25, -56], t: 72, hd: -4, nf: [-58, -48], ff: [-55, -48], kn: -1, ft: 0, nh: [24, -44] }],
      back: j => ln([-34, -48], [40, -24], 'mq', 7) + ln([4, -36], [4, 0], 'mq', 5) + ci([-58, -40], 6),
      front: j => ci(j.nArm[2], 4) + ci(j.nArm[2], 12, 'plate'),
      dicas: ['Pernas presas no apoio, cabeça mais baixa que o quadril.', 'Desça a barra até a parte de baixo do peito.', 'Empurre para cima sem travar os cotovelos.', 'Peça ajuda para tirar e devolver a barra.'] },
    { id: 'crossover-baixo', nome: 'Crossover polia baixa', grupo: 'Peito', aparelho: 'Polia baixa / cross over (cabo)', alvo: ['peito'], tipo: 'I', dur: 2.6,
      poses: [F({ legs: [{ a: [6, 4] }], arms: [{ e: [40, -112], h: [62, -94] }] }), F({ legs: [{ a: [6, 4] }], arms: [{ e: [24, -132], h: [6, -142] }] })],
      back: j => ln([106, 0], [106, -206], 'mq', 5) + ln([-106, 0], [-106, -206], 'mq', 5) + ci([100, -10], 4) + ci([-100, -10], 4) + ln([100, -10], j.rArm[2], 'cabo') + ln([-100, -10], j.lArm[2], 'cabo'),
      dicas: ['Polias embaixo, palmas para cima.', 'Traga as mãos para cima e para o centro, na altura do peito.', 'Cotovelos levemente dobrados o tempo todo.', 'Desça devagar abrindo os braços.'] },

    /* ---------- Novos: ombros ---------- */
    { id: 'desenvolvimento-maquina', nome: 'Desenvolvimento na máquina', grupo: 'Ombros', aparelho: 'Máquina desenvolvimento (shoulder press)', alvo: ['ombros', 'triceps'], tipo: 'C', dur: 2.4,
      poses: [{ hip: [0, -50], t: 178, nf: [40, 0], ff: [43, 0], na: [38, 172] }, { hip: [0, -50], t: 178, nf: [40, 0], ff: [43, 0], na: [178, 178] }],
      back: j => seat(-24, 26, -44) + ln([-8, -48], [-8, -120], 'mq', 7),
      front: j => ln(add(j.nArm[2], [-7, 0]), add(j.nArm[2], [7, 0]), 'mq', 5),
      dicas: ['Costas apoiadas, pegadas na altura dos ombros.', 'Empurre para cima até quase estender os braços.', 'Não tire a lombar do encosto.', 'Desça devagar.'] },
    { id: 'crucifixo-inverso', nome: 'Crucifixo inverso (voador inverso)', grupo: 'Ombros', aparelho: 'Máquina voador (sentada de frente) ou halteres', alvo: ['ombros', 'costas'], tipo: 'I', dur: 2.6,
      poses: [F({ hip: [0, -50], legs: [{ k: [16, -46], f: [18, -6] }], arms: [{ e: [24, -108], h: [8, -108] }] }), F({ hip: [0, -50], legs: [{ k: [16, -46], f: [18, -6] }], arms: [{ e: [46, -108], h: [74, -108] }] })],
      back: j => seat(-34, 34, -44),
      front: j => rc(j.rArm[2][0] - 3, j.rArm[2][1] - 9, 6, 18) + rc(j.lArm[2][0] - 3, j.lArm[2][1] - 9, 6, 18),
      dicas: ['(Animação vista de costas.) Peito apoiado no encosto da máquina.', 'Braços quase estendidos na altura dos ombros.', 'Abra os braços para trás, aproximando as escápulas.', 'Volte devagar.'] },
    { id: 'encolhimento', nome: 'Encolhimento de ombros', grupo: 'Ombros', aparelho: 'Halteres ou barra', alvo: ['ombros'], tipo: 'I', dur: 1.8,
      poses: [F({ arms: [{ a: [6, 4] }] }), F({ sg: 10, arms: [{ a: [6, 4] }] })],
      front: j => DBC(j.rArm[2]) + DBC(j.lArm[2]),
      dicas: ['Braços estendidos ao lado do corpo.', 'Suba os ombros em direção às orelhas.', 'Segure 1 segundo no alto.', 'Desça devagar, sem girar os ombros.'] },
    { id: 'remada-alta', nome: 'Remada alta', grupo: 'Ombros', aparelho: 'Barra, halteres ou polia baixa', alvo: ['ombros'], tipo: 'C', dur: 2.4,
      poses: [F({ arms: [{ e: [20, -112], h: [8, -86] }] }), F({ arms: [{ e: [44, -146], h: [10, -132] }] })],
      front: j => ln(add(j.lArm[2], [-8, 0]), add(j.rArm[2], [8, 0]), 'mq', 4),
      dicas: ['Pegada na largura dos ombros.', 'Puxe a barra rente ao corpo até a altura do peito.', 'Cotovelos sobem mais que as mãos.', 'Não suba acima da linha dos ombros.'] },
    { id: 'face-pull', nome: 'Face pull', grupo: 'Ombros', aparelho: 'Polia alta + corda', alvo: ['ombros', 'costas'], tipo: 'I', dur: 2.4,
      poses: [S({ na: [96, 96] }), S({ na: [210, 100] })],
      back: j => ln([96, 0], [96, -200], 'mq', 5) + ci([90, -150], 5) + ln([90, -150], j.nArm[2], 'cabo'),
      front: j => ci(j.nArm[2], 4),
      dicas: ['Polia na altura do rosto, segure a corda com as palmas para dentro.', 'Puxe a corda em direção ao rosto abrindo os cotovelos.', 'Gire os ombros para trás no final.', 'Volte devagar.'] },

    /* ---------- Novos: braços ---------- */
    { id: 'rosca-scott', nome: 'Rosca Scott', grupo: 'Braços', aparelho: 'Banco Scott + barra ou máquina', alvo: ['biceps'], tipo: 'I', dur: 2.4,
      poses: [{ hip: [0, -50], t: 165, nf: [36, 0], ff: [39, 0], na: [50, 70] }, { hip: [0, -50], t: 165, nf: [36, 0], ff: [39, 0], na: [50, 170] }],
      back: j => seat(-24, 22, -44) + ln([20, -94], [52, -64], 'mq', 8) + ln([44, -66], [44, 0], 'mq', 5),
      front: j => ci(j.nArm[2], 4.5),
      dicas: ['Braços apoiados no banco, axilas encostadas.', 'Suba a barra sem tirar os cotovelos do apoio.', 'Desça até quase estender, sem travar.', 'Movimento lento, principalmente na descida.'] },
    { id: 'rosca-concentrada', nome: 'Rosca concentrada', grupo: 'Braços', aparelho: 'Halter e banco', alvo: ['biceps'], tipo: 'I', dur: 2.2,
      poses: [{ hip: [0, -50], t: 150, nf: [42, 0], ff: [46, 0], na: [5, 0], fa: [40, 90] }, { hip: [0, -50], t: 150, nf: [42, 0], ff: [46, 0], na: [5, 165], fa: [40, 90] }],
      back: j => seat(-24, 24, -44),
      front: j => DB(j.nArm[2], ang(j.nArm[1], j.nArm[2])),
      dicas: ['Sentada, cotovelo apoiado na parte de dentro da coxa.', 'Suba o halter em direção ao ombro.', 'Contraia no alto e desça devagar.', 'Faça um braço e depois o outro.'] },
    { id: 'rosca-polia', nome: 'Rosca na polia', grupo: 'Braços', aparelho: 'Polia baixa + barra', alvo: ['biceps'], tipo: 'I', dur: 2.2,
      poses: [S({ na: [3, 3] }), S({ na: [6, 158] })],
      back: j => ln([60, 0], [60, -120], 'mq', 5) + ci([54, -8], 5) + ln([54, -8], j.nArm[2], 'cabo'),
      front: j => ci(j.nArm[2], 4.5),
      dicas: ['De frente para a polia baixa, cotovelos colados ao corpo.', 'Suba a barra até perto dos ombros.', 'Não balance o tronco.', 'Desça devagar.'] },
    { id: 'triceps-testa', nome: 'Tríceps testa', grupo: 'Braços', aparelho: 'Barra W ou halteres e banco', alvo: ['triceps'], tipo: 'I', dur: 2.4,
      poses: [{ hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, na: [178, 178] }, { hip: [-25, -47], t: 90, hd: -6, nf: [-66, 0], ff: [-63, 0], kn: -1, ft: -90, na: [168, 130] }],
      back: j => seat(-60, 60, -40),
      front: j => ci(j.nArm[2], 4.5),
      dicas: ['Deitada, braços estendidos acima do peito.', 'Dobre só os cotovelos, levando a barra em direção à testa.', 'Cotovelos apontando para cima, sem abrir.', 'Estenda os braços de volta.'] },
    { id: 'triceps-banco', nome: 'Tríceps no banco (mergulho)', grupo: 'Braços', aparelho: 'Banco', alvo: ['triceps', 'peito'], tipo: 'C', dur: 2.4,
      poses: [{ hip: [-9, -42], t: 179, nf: [64, 0], ff: [66, 0], nh: [-14, -44], en: -1 }, { hip: [-8, -14], t: 179, nf: [64, 0], ff: [66, 0], nh: [-14, -44], en: -1 }],
      back: j => seat(-62, -14, -44),
      dicas: ['Mãos na borda do banco, dedos para frente.', 'Desça o corpo dobrando os cotovelos para trás.', 'Quadril perto do banco.', 'Para facilitar, dobre os joelhos.'] },
    { id: 'triceps-coice', nome: 'Tríceps coice', grupo: 'Braços', aparelho: 'Halteres', alvo: ['triceps'], tipo: 'I', dur: 2.2, ...halteres,
      poses: [S({ hip: [-20, -78], t: 110, na: [-95, 0] }), S({ hip: [-20, -78], t: 110, na: [-95, -95] })],
      dicas: ['Tronco inclinado, cotovelos colados ao corpo e apontando para trás.', 'Estenda o braço para trás até ficar reto.', 'Só o antebraço se mexe.', 'Volte devagar.'] },

    /* ---------- Novos: abdômen ---------- */
    { id: 'prancha-lateral', nome: 'Prancha lateral', grupo: 'Abdômen', aparelho: 'Colchonete', alvo: ['abdomen'], tipo: 'I', dur: 3, mat: true, tempo: true,
      poses: [{ hip: [-17, -13], t: 107, nf: [-100, -6], ft: 30, na: [178, 178], fa: [0, 90] }, { hip: [-17, -20], t: 99.7, nf: [-100, -6], ft: 30, na: [178, 178], fa: [0, 90] }],
      dicas: ['Deitada de lado, cotovelo abaixo do ombro.', 'Suba o quadril até o corpo ficar reto.', 'Não deixe o quadril cair.', 'Segure o tempo indicado e troque de lado.'] },
    { id: 'elevacao-pernas', nome: 'Elevação de pernas na barra', grupo: 'Abdômen', aparelho: 'Barra fixa ou paralela', alvo: ['abdomen'], tipo: 'I', dur: 2.6,
      poses: [{ hip: [2, -84], t: 180, nf: [-4, -6], ff: [0, -6], nh: [4, -198] }, { hip: [2, -84], t: 180, nf: [44, -42], ff: [47, -42], nh: [4, -198] }],
      back: j => ln([4, -198], [74, -198], 'mq', 5) + ln([74, -198], [74, 0], 'mq', 5),
      front: j => ci([4, -198], 4),
      dicas: ['Pendurada na barra, corpo parado.', 'Suba os joelhos em direção ao peito.', 'Desça devagar, sem balançar.', 'Iniciante: faça com os joelhos dobrados.'] },
    { id: 'escalador', nome: 'Escalador (mountain climber)', grupo: 'Abdômen', aparelho: 'Peso do corpo', alvo: ['abdomen', 'cardio'], tipo: 'I', dur: 1.1, mat: true,
      poses: [{ hip: [-16, -35], t: 110, nf: [-95, -6], ff: [-10, -12], ft: 30, ftf: 60, nh: [45, 0], en: 1 }, { hip: [-16, -35], t: 110, nf: [-10, -12], ff: [-95, -6], ft: 60, ftf: 30, nh: [45, 0], en: 1 }],
      dicas: ['Posição de prancha alta, mãos abaixo dos ombros.', 'Traga um joelho em direção ao peito e troque rápido.', 'Quadril baixo e abdômen firme.', 'Ritmo constante, respirando.'] },
    { id: 'abdominal-polia', nome: 'Abdominal na polia', grupo: 'Abdômen', aparelho: 'Polia alta + corda', alvo: ['abdomen'], tipo: 'I', dur: 2.4,
      poses: [{ hip: [0, -48], t: 175, nf: [-40, -4], ff: [-37, -4], ft: -90, nh: [16, -116], en: -1 }, { hip: [0, -48], t: 112, nf: [-40, -4], ff: [-37, -4], ft: -90, nh: [62, -80], en: -1 }],
      back: j => ln([96, 0], [96, -206], 'mq', 5) + ci([88, -200], 5) + ln([88, -200], j.nArm[2], 'cabo'),
      dicas: ['Ajoelhada de frente para a polia, corda ao lado da cabeça.', 'Curve o tronco para baixo contraindo o abdômen.', 'O quadril fica parado.', 'Volte devagar.'] },
    { id: 'abdominal-bicicleta', nome: 'Abdominal bicicleta', grupo: 'Abdômen', aparelho: 'Colchonete', alvo: ['abdomen'], tipo: 'I', dur: 1.6, mat: true,
      poses: [{ hip: [0, -11], t: -110, nf: [22, -52], ff: [80, -26], nh: [-64, -44] }, { hip: [0, -11], t: -110, nf: [80, -26], ff: [22, -52], nh: [-64, -44] }],
      dicas: ['Deitada, mãos atrás da cabeça, ombros fora do chão.', 'Leve o cotovelo em direção ao joelho oposto.', 'Alterne os lados como se pedalasse.', 'Sem puxar o pescoço com as mãos.'] },
    { id: 'russian-twist', nome: 'Abdominal russo (rotação)', grupo: 'Abdômen', aparelho: 'Colchonete (anilha ou bola opcional)', alvo: ['abdomen'], tipo: 'I', dur: 1.8, mat: true,
      poses: [F({ hip: [0, -30], legs: [{ k: [14, -44], f: [20, -32] }], arms: [{ e: [-6, -70], h: [-28, -58] }, { e: [30, -72], h: [36, -56] }] }), F({ hip: [0, -30], legs: [{ k: [14, -44], f: [20, -32] }], arms: [{ e: [30, -72], h: [36, -56] }, { e: [-6, -70], h: [-28, -58] }] })],
      front: j => DBC([(j.rArm[2][0] + j.lArm[2][0]) / 2, (j.rArm[2][1] + j.lArm[2][1]) / 2]),
      dicas: ['(Animação vista de frente.) Sentada, tronco inclinado para trás.', 'Pés fora do chão ou apoiados, se for mais fácil.', 'Gire o tronco levando as mãos de um lado para o outro.', 'Coluna reta e abdômen firme.'] },

    /* ---------- Novos: aeróbico ---------- */
    { id: 'bicicleta', nome: 'Bicicleta ergométrica', grupo: 'Aeróbico', aparelho: 'Bicicleta ergométrica (spinning)', alvo: ['cardio'], tipo: 'I', dur: 1, tempo: true,
      poses: [{ hip: [-12, -80], t: 150, nf: [10, -44], ff: [10, -16], nh: [40, -102] }, { hip: [-12, -80], t: 150, nf: [10, -16], ff: [10, -44], nh: [40, -102] }],
      back: j => ln([-16, -74], [8, -30], 'mq', 5) + ln([8, -30], [44, -100], 'mq', 5) + ln([36, -102], [52, -100], 'mq', 5) + ln([-30, 0], [40, 0], 'mq', 6) + ci([10, -30], 14, 'plate') + rc(-26, -78, 22, 6),
      dicas: ['Ajuste o banco na altura do quadril.', 'Joelho quase estendido quando o pedal está embaixo.', 'Ritmo combinado com o professor.', 'Tronco firme, sem balançar o quadril.'] },
    { id: 'eliptico', nome: 'Elíptico (transport)', grupo: 'Aeróbico', aparelho: 'Elíptico / transport', alvo: ['cardio'], tipo: 'I', dur: 1.3, tempo: true,
      poses: [{ hip: [0, -92], t: 178, nf: [22, -12], ff: [-20, -16], nh: [40, -114], fh: [22, -108] }, { hip: [0, -92], t: 178, nf: [-20, -16], ff: [22, -12], nh: [22, -108], fh: [40, -114] }],
      back: j => ln(j.fArm[2], [30, -34], 'mq', 4) + ln([-50, 0], [60, 0], 'mq', 6) + ln([60, 0], [56, -96], 'mq', 5),
      front: j => ln(j.nArm[2], [30, -34], 'mq', 4),
      dicas: ['Pés inteiros nos pedais, postura ereta.', 'Empurre e puxe as alças acompanhando as pernas.', 'Mantenha um ritmo em que ainda consiga conversar.', 'Pode alternar períodos mais rápidos e mais leves.'] },
    { id: 'polichinelo', nome: 'Polichinelo', grupo: 'Aeróbico', aparelho: 'Peso do corpo', alvo: ['cardio'], tipo: 'I', dur: 0.9,
      poses: [F({ hip: [0, -84], legs: [{ a: [3, 2] }], arms: [{ a: [8, 4] }] }), F({ hip: [0, -88], legs: [{ a: [20, 20] }], arms: [{ a: [160, 170] }] })],
      dicas: ['Pule abrindo as pernas e levando os braços acima da cabeça.', 'Volte fechando pernas e braços.', 'Aterrisse suavemente, na ponta dos pés.', 'Ritmo constante.'] },
    { id: 'pular-corda', nome: 'Pular corda', grupo: 'Aeróbico', aparelho: 'Corda', alvo: ['cardio'], tipo: 'I', dur: 0.7,
      poses: [F({ hip: [0, -84], legs: [{ a: [3, 3] }], arms: [{ e: [20, -118], h: [34, -96] }] }), F({ hip: [0, -92], legs: [{ a: [3, 3] }], arms: [{ e: [20, -126], h: [34, -104] }] })],
      front: (j, k) => { const l = j.lArm[2], r = j.rArm[2], cy = 30 - k * 310; return `<path class="cabo" style="stroke-width:2;fill:none" d="M${f(l[0])},${f(l[1])} Q0,${f(cy)} ${f(r[0])},${f(r[1])}"/>`; },
      dicas: ['Cotovelos perto do corpo, gire a corda com os punhos.', 'Saltos baixos, na ponta dos pés.', 'Joelhos levemente dobrados.', 'Comece com séries curtas e aumente aos poucos.'] }

  ];

  const ease = p => { let s = 0.5 - 0.5 * Math.cos(2 * Math.PI * p); s = (s - 0.08) / 0.84; return Math.min(1, Math.max(0, s)); };

  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  const pts = a => a.map(p => f(p[0]) + ',' + f(p[1])).join(' ');

  // Cria a animação dentro de um container. Retorna { stop() }.
  function mount(container, exId, opts = {}) {
    const ex = EX.find(e => e.id === exId); if (!ex) return { stop() {} };
    const front = !!ex.poses[0].front;
    const svg = el('svg', { viewBox: '-120 -208 240 218', class: 'fig', role: 'img', 'aria-label': 'Animação: ' + ex.nome });
    svg.append(el('line', { x1: -116, y1: 0.5, x2: 116, y2: 0.5, class: 'fig-ground' }));
    if (ex.mat) svg.append(el('rect', { x: -112, y: -3, width: 224, height: 4, rx: 2, class: 'fig-mat' }));
    const gBack = el('g', {}), far = el('g', { class: 'fig-far' }), near = el('g', { class: 'fig-near' }), gFront = el('g', {});
    const mk = (g, cls) => { const p = el('polyline', { class: cls, fill: 'none' }); g.append(p); return p; };
    let parts;
    if (front) {
      parts = { rLeg: mk(near, 'limb'), lLeg: mk(near, 'limb'), pelvis: mk(near, 'limb'), spine: mk(near, 'torso'), shoulders: mk(near, 'limb') };
      parts.head = el('circle', { r: L.head, class: 'head' }); near.append(parts.head);
      parts.rArm = mk(near, 'limb'); parts.lArm = mk(near, 'limb');
    } else {
      parts = { fLeg: mk(far, 'limb'), fArm: mk(far, 'limb'), torso: mk(near, 'torso') };
      parts.head = el('circle', { r: L.head, class: 'head' }); near.append(parts.head);
      parts.nLeg = mk(near, 'limb'); parts.nArm = mk(near, 'limb');
    }
    svg.append(gBack, far, near, gFront);
    container.innerHTML = ''; container.append(svg);

    function draw(k) {
      const p = mix(ex.poses[0], ex.poses[1], k);
      const j = front ? frontJoints(p) : sideJoints(p);
      if (front) {
        for (const n of ['rLeg', 'lLeg', 'rArm', 'lArm', 'pelvis', 'shoulders']) parts[n].setAttribute('points', pts(j[n]));
        parts.spine.setAttribute('points', pts([j.hip, j.sh]));
      } else {
        for (const n of ['fLeg', 'fArm', 'nLeg', 'nArm']) parts[n].setAttribute('points', pts(j[n]));
        parts.torso.setAttribute('points', pts([j.hip, j.sh]));
      }
      parts.head.setAttribute('cx', f(j.head[0])); parts.head.setAttribute('cy', f(j.head[1]));
      if (ex.back) gBack.innerHTML = ex.back(j, k);
      if (ex.front) gFront.innerHTML = ex.front(j, k);
    }

    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf, t0 = performance.now(), alive = true;
    const loop = now => {
      if (!alive) return;
      if (!svg.isConnected) { alive = false; return; }
      draw(ease(((now - t0) / 1000 / ex.dur) % 1));
      raf = requestAnimationFrame(loop);
    };
    if (opts.still !== undefined || reduce) draw(opts.still ?? 1); else raf = requestAnimationFrame(loop);
    return { stop() { alive = false; cancelAnimationFrame(raf); } };
  }

  root.Exercicios = { lista: EX, mount, L };
})(typeof window !== 'undefined' ? window : globalThis);
