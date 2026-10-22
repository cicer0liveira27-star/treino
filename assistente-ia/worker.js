// Assistente do Musculito com IA (Claude) — Cloudflare Worker.
// Guarda a chave da API fora do site público. Veja assistente-ia/README.md.
export default {
  async fetch(req, env) {
    const permitido = env.ALLOWED_ORIGIN || 'https://cicer0liveira27-star.github.io';
    const cors = {
      'Access-Control-Allow-Origin': permitido,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || req.headers.get('Origin') !== permitido) return json({ resposta: 'Acesso não permitido.' }, 403);

    let b;
    try { b = await req.json(); } catch { return json({ resposta: 'Pedido inválido.' }, 400); }
    const pergunta = String(b.pergunta || '').slice(0, 600).trim();
    if (!pergunta) return json({ resposta: 'Escreva sua pergunta.' }, 400);

    const exercicios = Array.isArray(b.exercicios) ? b.exercicios.slice(0, 150).join('; ') : '';
    const system = [
      'Você é o assistente do Musculito, um app de treinos de academia. A pessoa monta sozinha 5 treinos por semana e você ajuda com dicas.',
      'Responda em português do Brasil, em tom amigável e direto, com no máximo 8 linhas.',
      'Leve em conta o perfil (peso, altura, objetivo, nível) e os treinos da semana enviados.',
      `Quando sugerir exercícios, use apenas nomes desta lista do app: ${exercicios}.`,
      'Não faça diagnósticos. Se a pessoa citar dor, lesão, gravidez ou problema de saúde, recomende procurar um médico ou um profissional de educação física antes de continuar.',
      'Não passe dietas nem metas numéricas de calorias ou de perda de peso.'
    ].join('\n');

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.MODEL || 'claude-haiku-5-5',
        max_tokens: 500,
        system,
        messages: [{ role: 'user', content: `Perfil: ${JSON.stringify(b.perfil || {})}\nSemana: ${JSON.stringify(b.semana || [])}\nDia aberto: ${b.diaAtual || '-'}\nPergunta: ${pergunta}` }]
      })
    });
    if (!r.ok) return json({ resposta: 'O assistente está indisponível agora. Tente mais tarde.' }, 502);
    const j = await r.json();
    const texto = (j.content || []).map(c => c.text || '').join('').trim();
    return json({ resposta: texto || 'Não consegui responder agora.' });
  }
};
