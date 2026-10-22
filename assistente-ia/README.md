# Assistente com IA (opcional)

O Ritmo já traz um assistente automático que funciona sem internet: ele sugere o foco de cada dia, recomenda exercícios e avisa sobre volume, ordem e descanso.

Para liberar também a caixa **"Pergunte ao assistente"**, com respostas de IA (Claude), é preciso um pequeno servidor que guarde a chave da API. A chave **não pode** ficar no site, porque o código do GitHub Pages é público.

## Passo a passo

1. Crie uma chave em https://console.anthropic.com e defina um **limite de gastos mensal** em *Billing → Limits*.
2. Crie uma conta grátis na Cloudflare e vá em **Workers & Pages → Create → Worker**.
3. Cole o conteúdo de `worker.js` e publique.
4. Em **Settings → Variables and secrets** do Worker, adicione:
   - `ANTHROPIC_API_KEY` (tipo *Secret*): sua chave da API.
   - `ALLOWED_ORIGIN`: `https://cicer0liveira27-star.github.io`
5. Copie o endereço do Worker (algo como `https://ritmo-assistente.SEU-USUARIO.workers.dev`).
6. No `index.html`, preencha `const IA_URL = '...'` com esse endereço e publique de novo.

Cada pergunta usa a sua chave da API. O limite de gastos evita surpresas na fatura.
