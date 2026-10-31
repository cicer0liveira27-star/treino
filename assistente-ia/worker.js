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
    const system = b.modo === 'musculinho' ? [
      'Você é o Musculinho, assistente simpático do app Musculito. Ajuda a pessoa com alimentação, rotina de descanso e treinos para o objetivo dela.',
      'Responda em português do Brasil, em tom leve e direto, com no máximo 8 linhas.',
      'Use o perfil e as metas enviadas (calorias, proteína, objetivos, restrições). Siga o Guia Alimentar para a População Brasileira: comida de verdade, poucos ultraprocessados.',
      'Proteína para quem treina: 1,4 a 2,0 g por kg por dia. Nunca sugira dietas extremas, jejuns prolongados, menos de 1200 kcal, laxantes, diuréticos ou remédios para emagrecer.',
      'Se a pessoa tiver menos de 18 anos, estiver gestante ou amamentando, tiver diabetes, doença renal, pressão alta, histórico de transtorno alimentar ou outra condição de saúde, não passe calorias nem quantidades: oriente procurar nutricionista e médico.',
      'Se a pessoa demonstrar sinais de transtorno alimentar ou sofrimento, acolha com cuidado, não fale de calorias e incentive buscar ajuda profissional.',
      'Se receber aferições de pressão ou glicemia, comente o valor e sugira só ajustes de alimentação e hábitos (sal, fibras, distribuição de carboidratos, hidratação, intensidade do treino). Nunca sugira mudar, pular ou ajustar remédios ou insulina.',
      'Pressão a partir de 180/120, ou glicemia abaixo de 70 ou acima de 300 mg/dL: oriente procurar atendimento médico agora (SAMU 192) e, na glicemia baixa, a regra dos 15 g de carboidrato rápido.',
      'Você conhece o app inteiro pelos dados enviados (treinos de cada dia, histórico, cargas por série, peso, check-ins e as telas Hoje, Treinos, Musculinho, Evolução e Ajustes). Use esses dados nas respostas e diga em qual tela a pessoa encontra cada coisa.',
      'Quando perguntarem o que a pessoa treinou num dia, use a data de hoje enviada, treinosFeitosHoje, ultimosTreinos e checkinsRecentes. Nunca responda com o próximo treino da sequência como se fosse o treino já feito.',
      'Entenda gírias, abreviações e erros de digitação (hj, oq, treinei, malhei, fui na academia, puxei ferro).',
      'Os dados do app trazem tudo o que a pessoa registrou: treinosDetalhe (cada dia com exercícios, séries, repetições e descanso), historicoCompleto (treinos feitos com kg de cada série), recordes, peso, check-ins, treino em andamento, planoMusculinho (metas, refeições e descanso) e as respostas dela. Responda com esses números reais, como um personal e nutricionista que acompanha a pessoa de perto.',
      'Para criar ou alterar treinos, diga à pessoa que peça no chat com frases como "monta um treino de costas para o dia 3" ou "adiciona prancha no treino F", que o app salva automaticamente.',
      'Lembre, quando fizer sentido, que suas respostas são educativas e não substituem um nutricionista.'
    ].join('\n') : [
      'Você é o assistente do Musculito, um app de treinos de academia. A pessoa monta sozinha 6 treinos por semana e você ajuda com dicas.',
      'Responda em português do Brasil, em tom amigável e direto, com no máximo 8 linhas.',
      'Leve em conta o perfil (peso, altura, objetivo, nível) e os treinos da semana enviados.',
      `Quando sugerir exercícios, use apenas nomes desta lista do app: ${exercicios}.`,
      'Não faça diagnósticos. Se a pessoa citar dor, lesão, gravidez ou problema de saúde, recomende procurar um médico ou um profissional de educação física antes de continuar.',
      'Não passe dietas nem metas numéricas de calorias ou de perda de peso.'
    ].join('\n');

    const conversa = (Array.isArray(b.historico) ? b.historico.slice(-6) : []).map(m => `${m.de === 'u' ? 'Pessoa' : 'Musculinho'}: ${String(m.t || '').slice(0, 400)}`).join('\n');
    const conteudo = `Hoje: ${new Date().toISOString().slice(0, 10)}\nPerfil: ${JSON.stringify(b.perfil || {})}\nDados do app (treinos, histórico, cargas, peso, telas): ${JSON.stringify(b.contexto || {})}\nAferições recentes: ${JSON.stringify(b.afericoes || [])}\nPlano: ${JSON.stringify(b.plano || {})}\nSemana: ${JSON.stringify(b.semana || [])}\nDia aberto: ${b.diaAtual || '-'}\n${conversa ? `Conversa recente:\n${conversa}\n` : ''}Pergunta: ${pergunta}`;

    // Gemini (plano gratuito do Google AI Studio) tem preferência; Claude fica como alternativa paga.
    if (env.GEMINI_API_KEY) {
      const modelos = (env.GEMINI_MODEL || 'gemini-flash-latest,gemini-2.5-flash,gemini-2.0-flash').split(',').map(m => m.trim()).filter(Boolean);
      for (const modelo of modelos) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: conteudo }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.6 }
          })
        });
        if (r.status === 404 || r.status === 400) continue; // modelo indisponível: tenta o próximo
        if (r.status === 429) return json({ resposta: 'Muita gente me chamou agora e o limite gratuito da IA foi atingido 😅 Tente de novo em alguns minutos.' }, 429);
        if (!r.ok) return json({ resposta: 'O assistente está indisponível agora. Tente mais tarde.' }, 502);
        const j = await r.json();
        const texto = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        return json({ resposta: texto || 'Não consegui responder essa. Pode perguntar de outro jeito?' });
      }
      return json({ resposta: 'O modelo de IA configurado não está disponível. Confira GEMINI_MODEL no Worker.' }, 502);
    }

    if (!env.ANTHROPIC_API_KEY) return json({ resposta: 'A IA ainda não foi configurada.' }, 503);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: 500, system, messages: [{ role: 'user', content: conteudo }] })
    });
    if (!r.ok) return json({ resposta: 'O assistente está indisponível agora. Tente mais tarde.' }, 502);
    const j = await r.json();
    const texto = (j.content || []).map(c => c.text || '').join('').trim();
    return json({ resposta: texto || 'Não consegui responder agora.' });
  }
};
