# Musculinho com IA (Google Gemini, plano gratuito)

O Musculinho já responde muita coisa sozinho, sem internet. Com a IA ligada, as perguntas livres que ele não sabe responder vão para o **Google Gemini**, que tem uma chave de API gratuita (sem cartão de crédito), com limite de uso por minuto e por dia.

A chave **não pode** ficar no site, porque o código do GitHub Pages é público. Por isso ela fica guardada num pequeno servidor gratuito da Cloudflare (o "Worker"), que repassa as perguntas.

## Passo a passo (uns 10 minutos)

1. **Chave do Gemini:** entre em https://aistudio.google.com com sua conta Google, abra **Get API key → Create API key** e copie a chave. Não compartilhe essa chave com ninguém.
2. **Cloudflare:** crie uma conta grátis em https://dash.cloudflare.com e vá em **Workers & Pages → Create → Create Worker**. Dê o nome `musculinho-ia` e clique em **Deploy**.
3. Clique em **Edit code**, apague o conteúdo, cole o arquivo `worker.js` desta pasta e clique em **Deploy**.
4. Em **Settings → Variables and secrets** do Worker, adicione:
   - `GEMINI_API_KEY` (tipo **Secret**): a chave do passo 1.
   - `ALLOWED_ORIGIN` (tipo Text): `https://cicer0liveira27-star.github.io`
5. Copie o endereço do Worker (algo como `https://musculinho-ia.SEU-USUARIO.workers.dev`) e mande para o Claude, ou coloque em `const IA_URL = '...'` no `index.html` e publique de novo.

## Privacidade

- Antes da primeira pergunta enviada à IA, o Musculinho pede permissão à pessoa. Dá para ligar ou desligar em **Ajustes → Musculinho com IA**.
- O nome da pessoa não é enviado. Vão a pergunta e um resumo do perfil, treinos, metas e aferições.
- No plano gratuito, o Google pode usar o conteúdo enviado para melhorar os produtos dele. Se quiser evitar isso, ative o faturamento no Google AI Studio (plano pago) ou use a alternativa com Claude (`ANTHROPIC_API_KEY`, pago por uso).

## Opções avançadas

- `GEMINI_MODEL`: lista de modelos separados por vírgula, testados em ordem (padrão: `gemini-flash-latest,gemini-3.8-flash,gemini-2.5-flash,gemini-flash-lite-latest`). Se o Google trocar os nomes, ajuste aqui.
- Sem `GEMINI_API_KEY`, o Worker usa o Claude se houver `ANTHROPIC_API_KEY`.
