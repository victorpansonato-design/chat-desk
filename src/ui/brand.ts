import logoUrl from '../assets/grupo-anchieta.png';

/**
 * Ponto único para ativos de marca. O logotipo "Grupo Anchieta" foi entregue por CX em 10/11/2026
 * (PNG 385×137). A miniatura oficial da Ana (src/assets/ana.png, 144×144) foi entregue em 10/11/2026.
 * O selo comemorativo de 85 anos não é usado (prompt.md §4).
 */
/** Foto oficial da Ana: basta salvar em src/assets/ana.png (ou .webp/.jpg). Sem o arquivo, usa-se o símbolo abstrato. */
const ana = Object.values(import.meta.glob('../assets/ana.{png,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }))[0] as string | undefined;

export const brand = {
  anaUrl: ana,
  logoUrl,
  logoRatio: 385 / 137,
  wordmark: 'Grupo Anchieta',
  product: 'Chat Anchieta',
};
