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
    const hc = p.hip, sc = [hc[0], hc[1] - L.torso];
    const head = [sc[0], sc[1] - (L.neck + L.head)];
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
      mode: 'front', hip: hc, sh: sc, head,
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
    { id: 'agachamento', nome: 'Agachamento livre', grupo: 'Pernas e glúteos', dur: 2.6,
      poses: [S({ na: [90, 90] }), S({ hip: [-28, -44], t: 145, na: [92, 90] })],
      dicas: ['Pés na largura dos ombros, pontas levemente para fora.', 'Leve o quadril para trás como se fosse sentar.', 'Joelhos acompanham a direção dos pés.', 'Peito aberto e coluna neutra; suba empurrando o chão.'] },
    { id: 'agachamento-sumo', nome: 'Agachamento sumô', grupo: 'Pernas e glúteos', dur: 2.6,
      poses: [F({ hip: [0, -80], legs: [{ f: [38, 0] }], arms: [{ h: [4, -84] }] }), F({ hip: [0, -46], legs: [{ f: [38, 0] }], arms: [{ h: [4, -50] }] })],
      front: j => DBV([0, j.rArm[2][1] + 12]),
      dicas: ['Pés bem afastados, pontas para fora.', 'Segure o halter com as duas mãos entre as pernas.', 'Desça mantendo os joelhos abertos, na direção dos pés.', 'Tronco firme; suba contraindo os glúteos.'] },
    { id: 'agachamento-smith', nome: 'Agachamento no smith', grupo: 'Pernas e glúteos', dur: 2.8,
      poses: [{ hip: [-2, -84], t: 180, nf: [12, 0], ff: [14, 0], na: [-30, 170] }, { hip: [-21.8, -44], t: 160, nf: [12, 0], ff: [14, 0], na: [-30, 170] }],
      back: j => ln([-5, -204], [-5, 0], 'mq', 4),
      front: j => ci([j.sh[0] - 3, j.sh[1] - 4], 5) + ci([j.sh[0] - 3, j.sh[1] - 4], 11, 'plate'),
      dicas: ['Barra apoiada no alto das costas, não no pescoço.', 'Pés um pouco à frente da linha da barra.', 'Desça até as coxas ficarem paralelas ao chão.', 'Suba empurrando com o pé inteiro.'] },
    { id: 'agachamento-isometria', nome: 'Agachamento isométrico', grupo: 'Pernas e glúteos', dur: 3, tempo: true,
      poses: [S({ hip: [-28, -46], t: 145, na: [92, 90] }), S({ hip: [-28, -44.5], t: 146, na: [92, 90] })],
      dicas: ['Desça até a posição de agachamento e pare.', 'Segure o tempo indicado sem subir.', 'Peso nos calcanhares, joelhos alinhados com os pés.', 'Respire normalmente.'] },
    { id: 'agachamento-hack', nome: 'Agachamento hack', grupo: 'Pernas e glúteos', dur: 2.8,
      poses: [{ hip: [-12, -82], t: 200, nf: [20, -4], ff: [22, -4], ft: 90, na: [-20, 170] }, { hip: [1.7, -44.4], t: 200, nf: [20, -4], ff: [22, -4], ft: 90, na: [-20, 170] }],
      back: j => ln([-1.8, -27.2], [-44.3, -144.7], 'mq', 6) + ln([-12, -50], [-20, 0], 'mq', 4) + rc(0, -3, 52, 4),
      front: j => ci(j.sh, 6),
      dicas: ['Costas e ombros bem apoiados no encosto.', 'Pés no meio da plataforma, na largura do quadril.', 'Desça controlando até cerca de 90° nos joelhos.', 'Não tire os calcanhares da plataforma.'] },
    { id: 'leg-press', nome: 'Leg press 45°', grupo: 'Pernas e glúteos', dur: 2.8,
      poses: [{ hip: [-40, -30], t: -135, hd: 20, nf: [-8, -62], ff: [-6, -64], ft: -135, na: [60, 80] }, { hip: [-40, -30], t: -135, hd: 20, nf: [17, -87], ff: [19, -89], ft: -135, na: [60, 80] }],
      back: j => ln([-34, -20], [-90, -76], 'mq', 6) + ln([-40, -20], [-40, 0], 'mq', 4) + ln([-6.6, -43.6], [55.2, -105.4], 'mq', 4) + ln([-6.6, -43.6], [-6.6, 0], 'mq', 4),
      front: j => { const a = j.nLeg[2], u = [0.707, -0.707], v = [0.707, 0.707]; const o = add(a, u, 5); return ln(add(o, v, 8), add(o, v, -24), 'mq', 6); },
      dicas: ['Costas e quadril bem apoiados no banco.', 'Pés na largura do quadril no meio da plataforma.', 'Desça até os joelhos formarem cerca de 90°.', 'Empurre sem travar os joelhos no final.'] },
    { id: 'afundo', nome: 'Afundo (passada parada)', grupo: 'Pernas e glúteos', dur: 2.6,
      poses: [S({ hip: [-38, -76], t: 178, ff: [-82, -8], ftf: 40, na: [4, 4] }), S({ hip: [-40, -46], t: 178, ff: [-82, -8], ftf: 40, na: [4, 4] })],
      dicas: ['Passo largo, tronco reto.', 'Desça até o joelho de trás quase tocar o chão.', 'O joelho da frente não passa muito da ponta do pé.', 'Faça todas as repetições de um lado e depois troque.'] },
    { id: 'bulgaro', nome: 'Agachamento búlgaro', grupo: 'Pernas e glúteos', dur: 2.6,
      poses: [S({ hip: [-30, -78], t: 176, ff: [-82, -46], ftf: -80, na: [4, 4] }), S({ hip: [-34, -48], t: 176, ff: [-82, -46], ftf: -80, na: [4, 4] })],
      back: j => seat(-106, -64, -40),
      dicas: ['Peito do pé de trás apoiado no banco.', 'Pé da frente bem à frente do banco.', 'Desça na vertical até a coxa da frente ficar paralela ao chão.', 'Faça um lado e depois o outro.'] },
    { id: 'elevacao-pelvica', nome: 'Elevação pélvica', grupo: 'Pernas e glúteos', dur: 2.4, mat: true,
      poses: [{ hip: [-10, -11], t: -90, nf: [48, -4], ft: 90, na: [92, 90] },
              { hip: [-14, -44], t: -54, hd: -36, nf: [48, -4], ft: 90, na: [65, 90] }],
      dicas: ['Deitada, joelhos dobrados e pés apoiados perto do quadril.', 'Suba o quadril contraindo os glúteos.', 'No topo, corpo alinhado dos ombros aos joelhos; segure 1 segundo.', 'Desça controlando, sem arquear a lombar.'] },
    { id: 'stiff', nome: 'Stiff com halteres', grupo: 'Pernas e glúteos', dur: 3, ...halteres,
      poses: [S({ nf: [2, 0], ff: [5, 0] }), S({ hip: [-24, -80], t: 100, nf: [2, 0], ff: [5, 0] })],
      dicas: ['Joelhos levemente flexionados o tempo todo.', 'Empurre o quadril para trás, halteres rentes às pernas.', 'Coluna sempre reta; desça até sentir a parte de trás da coxa.', 'Suba contraindo os glúteos.'] },
    { id: 'mesa-flexora', nome: 'Mesa flexora', grupo: 'Pernas e glúteos', dur: 2.4,
      poses: [{ hip: [-15, -46], t: 90, hd: -10, nf: [-99, -46], ff: [-97, -46], nh: [64, -42], en: -1 }, { hip: [-15, -46], t: 90, hd: -10, nf: [-42, -85], ff: [-40, -85], nh: [64, -42], en: -1 }],
      back: j => rc(-62, -40, 134, 7) + ln([-40, -34], [-40, 0], 'mq', 4) + ln([50, -34], [50, 0], 'mq', 4),
      front: j => ci(j.nLeg[2], 6),
      dicas: ['Deitada de bruços, joelhos logo após a ponta do banco.', 'Rolo apoiado acima dos calcanhares.', 'Dobre os joelhos trazendo o rolo em direção aos glúteos.', 'Quadril colado no banco; desça devagar.'] },
    { id: 'cadeira-flexora', nome: 'Cadeira flexora', grupo: 'Pernas e glúteos', dur: 2.4,
      poses: [{ hip: [0, -50], t: 172, nf: [84, -50], ff: [84, -50], na: [20, 10] }, { hip: [0, -50], t: 172, nf: [27, -11], ff: [27, -11], na: [20, 10] }],
      back: j => seat(-22, 34, -44) + ln([-16, -46], [-25, -112], 'mq', 6),
      front: j => ci(j.nLeg[2], 6) + rc(j.nLeg[1][0] - 12, j.nLeg[1][1] - 13, 20, 6),
      dicas: ['Joelhos alinhados com o eixo da máquina.', 'Rolo de cima travando as coxas, rolo de baixo nos calcanhares.', 'Dobre os joelhos puxando o rolo para baixo e para trás.', 'Volte devagar, sem deixar o peso bater.'] },
    { id: 'cadeira-extensora', nome: 'Cadeira extensora', grupo: 'Pernas e glúteos', dur: 2.4,
      poses: [{ hip: [0, -50], t: 172, nf: [37, -8], ff: [37, -8], na: [20, 10] }, { hip: [0, -50], t: 172, nf: [84, -50], ff: [84, -50], na: [20, 10] }],
      back: j => seat(-22, 34, -44) + ln([-16, -46], [-25, -112], 'mq', 6),
      front: j => ci(add(j.nLeg[2], [3, -3]), 6),
      dicas: ['Costas apoiadas e joelhos alinhados com o eixo da máquina.', 'Rolo na frente das canelas, perto dos tornozelos.', 'Estenda as pernas até quase esticar e segure 1 segundo.', 'Desça devagar.'] },
    { id: 'cadeira-abdutora', nome: 'Cadeira abdutora', grupo: 'Pernas e glúteos', dur: 2.4,
      poses: [F({ hip: [0, -50], legs: [{ k: [17, -46], f: [17, -6] }], arms: [{ a: [14, 6] }] }), F({ hip: [0, -50], legs: [{ k: [40, -46], f: [36, -6] }], arms: [{ a: [14, 6] }] })],
      back: j => rc(-26, -118, 52, 70, 'mqb', 8) + seat(-34, 34, -44),
      front: j => rc(j.rLeg[1][0] + 5, -62, 6, 30) + rc(j.lLeg[1][0] - 11, -62, 6, 30),
      dicas: ['Costas apoiadas, almofadas na parte de fora dos joelhos.', 'Abra as pernas empurrando as almofadas para fora.', 'Segure 1 segundo aberta.', 'Volte devagar, sem deixar os pesos baterem.'] },
    { id: 'cadeira-adutora', nome: 'Cadeira adutora', grupo: 'Pernas e glúteos', dur: 2.4,
      poses: [F({ hip: [0, -50], legs: [{ k: [40, -46], f: [36, -6] }], arms: [{ a: [14, 6] }] }), F({ hip: [0, -50], legs: [{ k: [16, -46], f: [17, -6] }], arms: [{ a: [14, 6] }] })],
      back: j => rc(-26, -118, 52, 70, 'mqb', 8) + seat(-34, 34, -44),
      front: j => rc(j.rLeg[1][0] - 11, -62, 6, 30) + rc(j.lLeg[1][0] + 5, -62, 6, 30),
      dicas: ['Costas apoiadas, almofadas na parte de dentro dos joelhos.', 'Feche as pernas apertando as almofadas.', 'Segure 1 segundo fechada.', 'Abra devagar, até onde for confortável.'] },
    { id: 'coice', nome: 'Coice de glúteo (4 apoios)', grupo: 'Pernas e glúteos', dur: 2.2, mat: true,
      poses: [{ hip: [-35, -44], t: 104, nf: [-77, -5], ff: [-77, -5], ft: -90, nh: [21, 0], en: -1 },
              { hip: [-35, -44], t: 104, nf: [-77, -86], ff: [-77, -5], ft: 180, ftf: -90, nh: [21, 0], en: -1 }],
      dicas: ['Mãos abaixo dos ombros e joelhos abaixo do quadril.', 'Leve um pé em direção ao teto, joelho dobrado em 90°.', 'Não gire o quadril nem arqueie a lombar.', 'Faça um lado e depois o outro.'] },
    { id: 'coice-polia', nome: 'Coice na polia', grupo: 'Pernas e glúteos', dur: 2.4,
      poses: [{ hip: [0, -84], t: 160, nf: [4, 0], ff: [0, 0], nh: [44, -110], en: -1 }, { hip: [0, -84], t: 160, nf: [-50, -30], ff: [0, 0], nh: [44, -110], en: -1 }],
      back: j => ln([48, 0], [48, -150], 'mq', 5) + ci([48, -6], 5) + ln([48, -6], j.nLeg[2], 'cabo'),
      front: j => ci(j.nLeg[2], 4.5),
      dicas: ['Tornozeleira presa na polia baixa.', 'Segure no aparelho e incline levemente o tronco.', 'Leve a perna para trás contraindo o glúteo, sem arquear a lombar.', 'Volte devagar; faça um lado e depois o outro.'] },
    { id: 'abducao-polia', nome: 'Abdução de quadril na polia', grupo: 'Pernas e glúteos', dur: 2.4,
      poses: [F({ legs: [{ a: [2, 2] }, { a: [0, 0] }], arms: [{ a: [6, 4] }, { h: [57, -112], s: -1 }] }), F({ legs: [{ a: [36, 36] }, { a: [0, 0] }], arms: [{ a: [6, 4] }, { h: [57, -112], s: -1 }] })],
      back: j => ln([-62, 0], [-62, -170], 'mq', 5) + ci([-60, -6], 5) + ln([-60, -6], j.rLeg[2], 'cabo'),
      front: j => ci(j.rLeg[2], 4.5),
      dicas: ['Tornozeleira na perna de fora, polia baixa do lado oposto.', 'Segure no aparelho e mantenha o tronco reto.', 'Afaste a perna para o lado sem inclinar o corpo.', 'Volte devagar; faça um lado e depois o outro.'] },
    { id: 'panturrilha', nome: 'Panturrilha em pé', grupo: 'Pernas e glúteos', dur: 1.8,
      poses: [S({ ft: 90 }), S({ hip: [0, -92], nf: [0, -8], ff: [3, -8], ft: 50 })],
      dicas: ['Suba na ponta dos pés o máximo possível.', 'Segure 1 segundo no alto.', 'Desça devagar até alongar bem a panturrilha.', 'Na máquina, ombros bem apoiados nas almofadas.'] },
    { id: 'panturrilha-sentada', nome: 'Panturrilha sentada', grupo: 'Pernas e glúteos', dur: 1.8,
      poses: [{ hip: [0, -50], t: 178, nf: [42, -8], ff: [44, -8], ft: 70, nh: [32, -62] }, { hip: [0, -50], t: 178, nf: [42, -15], ff: [44, -15], ft: 25, nh: [32, -69] }],
      back: j => seat(-24, 26, -44) + rc(48, -4, 22, 4),
      front: j => rc(j.nLeg[1][0] - 14, j.nLeg[1][1] - 12, 26, 6),
      dicas: ['Ponta dos pés na plataforma, almofada sobre os joelhos.', 'Suba os calcanhares o máximo possível.', 'Segure 1 segundo no alto.', 'Desça devagar alongando a panturrilha.'] },

    /* ---------- Costas ---------- */
    { id: 'puxador-frente', nome: 'Puxador frente', grupo: 'Costas', dur: 2.6,
      poses: [{ hip: [0, -50], t: 170, nf: [45, 0], ff: [48, 0], na: [170, 175] }, { hip: [0, -50], t: 170, nf: [45, 0], ff: [48, 0], na: [-15, 150] }],
      back: j => seat(-20, 26, -44) + ci([16, -202], 5) + ln([16, -202], j.nArm[2], 'cabo'),
      front: j => ci(add(j.nLeg[1], [-2, -9]), 6) + rc(j.nArm[2][0] - 3, j.nArm[2][1] - 3, 6, 6),
      dicas: ['Coxas presas sob o apoio, pegada um pouco mais aberta que os ombros.', 'Puxe a barra até a parte de cima do peito.', 'Leve os cotovelos para baixo e aproxime as escápulas.', 'Suba devagar, sem soltar o peso.'] },
    { id: 'remada-sentada', nome: 'Remada sentada', grupo: 'Costas', dur: 2.6,
      poses: [{ hip: [-30, -26], t: 176, nf: [42, -14], ff: [44, -14], ft: 170, na: [80, 85] }, { hip: [-30, -26], t: 176, nf: [42, -14], ff: [44, -14], ft: 170, na: [-40, 85] }],
      back: j => seat(-62, 14, -22) + ln([52, -32], [52, 0], 'mq', 5) + ci([66, -62], 5) + ln([66, -62], j.nArm[2], 'cabo'),
      front: j => ci(j.nArm[2], 4),
      dicas: ['Tronco reto, pés apoiados e joelhos levemente dobrados.', 'Puxe o triângulo em direção ao umbigo.', 'Aproxime as escápulas no final, sem jogar o tronco para trás.', 'Volte esticando os braços devagar.'] },
    { id: 'remada', nome: 'Remada curvada com halteres', grupo: 'Costas', dur: 2.4, ...halteres,
      poses: [S({ hip: [-20, -78], t: 110, na: [0, 0] }), S({ hip: [-20, -78], t: 110, na: [-95, 0] })],
      dicas: ['Incline o tronco à frente, joelhos levemente flexionados.', 'Puxe os halteres em direção ao quadril.', 'Aproxime as escápulas no final do movimento.', 'Desça controlando.'] },

    /* ---------- Peito, ombros e braços ---------- */
    { id: 'peck-deck', nome: 'Peck deck (voador)', grupo: 'Peito e braços', dur: 2.6,
      poses: [F({ hip: [0, -50], legs: [{ k: [16, -46], f: [18, -6] }], arms: [{ e: [44, -104], h: [44, -132] }] }), F({ hip: [0, -50], legs: [{ k: [16, -46], f: [18, -6] }], arms: [{ e: [22, -98], h: [8, -116] }] })],
      back: j => rc(-26, -122, 52, 74, 'mqb', 8) + seat(-34, 34, -44),
      front: j => ln(j.rArm[1], j.rArm[2], 'pad') + ln(j.lArm[1], j.lArm[2], 'pad'),
      dicas: ['Costas apoiadas, cotovelos na altura dos ombros.', 'Antebraços encostados nas almofadas.', 'Feche os braços à frente do peito contraindo o peitoral.', 'Abra devagar, sem passar da linha dos ombros.'] },
    { id: 'flexao', nome: 'Flexão de braço', grupo: 'Peito e braços', dur: 2.4, mat: true,
      poses: [{ hip: [-16, -35], t: 110, nf: [-95, -6], ft: 30, nh: [45, 0], en: 1 },
              { hip: [-12, -16], t: 96.5, nf: [-95, -6], ft: 30, nh: [45, 0], en: 1 }],
      dicas: ['Mãos um pouco além da largura dos ombros.', 'Corpo reto da cabeça aos pés, abdômen firme.', 'Desça o peito perto do chão, cotovelos a ~45° do corpo.', 'Para facilitar, apoie os joelhos no chão.'] },
    { id: 'elevacao-lateral', nome: 'Elevação lateral', grupo: 'Ombros', dur: 2.4,
      poses: [F({ legs: [{ a: [2, 2] }], arms: [{ a: [8, 6] }] }), F({ legs: [{ a: [2, 2] }], arms: [{ a: [86, 88] }] })],
      front: j => DBC(j.rArm[2]) + DBC(j.lArm[2]),
      dicas: ['Halteres ao lado do corpo, cotovelos levemente dobrados.', 'Eleve os braços para os lados até a altura dos ombros.', 'Não balance o tronco nem suba os ombros em direção às orelhas.', 'Desça devagar.'] },
    { id: 'elevacao-frontal', nome: 'Elevação frontal', grupo: 'Ombros', dur: 2.4, ...halteres,
      poses: [S({ na: [4, 4] }), S({ na: [92, 92] })],
      dicas: ['Braços quase estendidos, cotovelos levemente dobrados.', 'Eleve até a altura dos ombros.', 'Sem balançar o corpo.', 'Desça devagar.'] },
    { id: 'desenvolvimento', nome: 'Desenvolvimento com halteres', grupo: 'Ombros', dur: 2.4, ...halteres,
      poses: [S({ na: [38, 172] }), S({ na: [178, 178] })],
      dicas: ['Halteres na altura dos ombros, cotovelos abaixo das mãos.', 'Empurre para cima até quase estender os braços.', 'Não arqueie a lombar; abdômen firme.', 'Desça devagar até a altura dos ombros.'] },
    { id: 'rosca', nome: 'Rosca direta', grupo: 'Peito e braços', dur: 2.2, ...halteres,
      poses: [S({ na: [3, 3] }), S({ na: [6, 158] })],
      dicas: ['Cotovelos colados ao corpo.', 'Suba o peso com as palmas viradas para cima.', 'Não balance o tronco.', 'Desça até estender os braços.'] },
    { id: 'rosca-martelo', nome: 'Rosca martelo com halter', grupo: 'Peito e braços', dur: 2.2,
      poses: [S({ na: [3, 3] }), S({ na: [6, 158] })],
      back: j => DBC(j.fArm[2]), front: j => DBC(j.nArm[2]),
      dicas: ['Palmas viradas uma para a outra, como quem segura um martelo.', 'Cotovelos colados ao corpo.', 'Suba sem girar os punhos.', 'Desça devagar.'] },
    { id: 'triceps-corda', nome: 'Tríceps na corda', grupo: 'Peito e braços', dur: 2.2,
      poses: [S({ t: 172, na: [8, 160] }), S({ t: 172, na: [8, 8] })],
      back: j => ln([58, 0], [58, -204], 'mq', 5) + ci([52, -200], 5) + ln([52, -200], j.nArm[2], 'cabo'),
      front: j => ln(j.nArm[2], add(j.nArm[2], [-3, 9]), 'cabo', 3) + ln(j.nArm[2], add(j.nArm[2], [4, 9]), 'cabo', 3),
      dicas: ['Cotovelos colados ao corpo, parados.', 'Empurre a corda para baixo até esticar os braços.', 'No final, abra levemente a corda para os lados.', 'Suba devagar até a altura do peito.'] },
    { id: 'triceps-frances', nome: 'Tríceps francês', grupo: 'Peito e braços', dur: 2.4,
      poses: [S({ na: [172, -12] }), S({ na: [176, 176] })],
      front: j => DB(j.nArm[2], ang(j.nArm[1], j.nArm[2]) + 90),
      dicas: ['Segure um halter com as duas mãos acima da cabeça.', 'Desça o peso atrás da cabeça dobrando só os cotovelos.', 'Cotovelos apontando para cima, perto da cabeça.', 'Estenda os braços de volta.'] },

    /* ---------- Abdômen ---------- */
    { id: 'abdominal', nome: 'Abdominal curto', grupo: 'Abdômen', dur: 2.2, mat: true,
      poses: [{ hip: [0, -11], t: -90, nf: [46, -4], ft: 90, na: [92, 90] },
              { hip: [0, -11], t: -116, hd: 8, nf: [46, -4], ft: 90, na: [100, 96] }],
      dicas: ['Deitada, joelhos dobrados, pés no chão.', 'Tire as escápulas do chão contraindo o abdômen.', 'Olhar para cima, sem puxar o pescoço.', 'Solte o ar ao subir.'] },
    { id: 'abdominal-infra', nome: 'Abdominal infra', grupo: 'Abdômen', dur: 2.4, mat: true,
      poses: [{ hip: [0, -11], t: -90, nf: [72, -16], ff: [72, -16], na: [92, 90] }, { hip: [0, -11], t: -90, nf: [40, -58], ff: [40, -58], na: [92, 90] }],
      dicas: ['Deitada, braços ao lado do corpo e lombar colada no chão.', 'Traga os joelhos em direção ao peito tirando levemente o quadril do chão.', 'Volte devagar sem encostar os pés no chão.', 'Solte o ar ao subir as pernas.'] },
    { id: 'abdominal-remador', nome: 'Abdominal remador', grupo: 'Abdômen', dur: 2.4, mat: true,
      poses: [{ hip: [0, -11], t: -90, nf: [83, -12], ff: [83, -12], na: [-92, -90] }, { hip: [0, -11], t: -150, nf: [34, -14], ff: [34, -14], na: [-260, -265] }],
      dicas: ['Comece deitada com braços e pernas estendidos.', 'Suba o tronco e traga os joelhos ao peito ao mesmo tempo.', 'Braços à frente, passando ao lado das pernas.', 'Volte devagar à posição inicial.'] },
    { id: 'prancha', nome: 'Prancha', grupo: 'Abdômen', dur: 3, mat: true, tempo: true,
      poses: [{ hip: [-17, -20], t: 99.7, nf: [-100, -6], ft: 30, na: [0, 90] },
              { hip: [-17, -21.5], t: 99.4, nf: [-100, -6], ft: 30, na: [0, 90] }],
      dicas: ['Antebraços no chão, cotovelos abaixo dos ombros.', 'Corpo reto: não deixe o quadril cair nem subir demais.', 'Abdômen e glúteos contraídos.', 'Respire normalmente e segure o tempo indicado.'] },

    /* ---------- Aeróbico ---------- */
    { id: 'aerobico', nome: 'Aeróbico', grupo: 'Aeróbico', dur: 1.1, tempo: true,
      poses: [{ hip: [0, -82], t: 178, nf: [24, -2], ff: [-26, -4], na: [-25, -10], fa: [25, 40] }, { hip: [0, -82], t: 178, nf: [-26, -4], ff: [24, -2], na: [25, 40], fa: [-25, -10] }],
      back: j => rc(-64, -3, 128, 6, 'mqf', 3) + ln([58, -2], [72, -112], 'mq', 5) + ln([72, -112], [50, -114], 'mq', 5),
      dicas: ['Esteira, bicicleta ou elíptico, no ritmo combinado com o professor.', 'Comece leve nos primeiros minutos.', 'Mantenha um ritmo em que ainda consiga conversar.', 'Postura ereta, sem se apoiar no painel.'] }
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
