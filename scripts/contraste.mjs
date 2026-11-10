// Mede o contraste WCAG dos pares de cor usados no chat (tema claro e escuro).
// Uso: npm run contraste
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [descrição, texto, fundo, mínimo]
const light = [
  ['texto / fundo', '#0b1a33', '#ffffff', 7],
  ['texto secundário / fundo', '#42516c', '#ffffff', 7],
  ['texto terciário (hora, dica) / fundo', '#5f6d88', '#ffffff', 4.5],
  ['texto terciário / coluna do histórico', '#5f6d88', '#f5f7fb', 4.5],
  ['link e destaque azul / fundo', '#0051a0', '#ffffff', 7],
  ['saudação (branco) / azul do topo', '#ffffff', '#0a58b0', 4.5],
  ['saudação (nome) / azul do topo', '#b9d6ff', '#0a58b0', 3],
  ['balão do aluno (branco / azul)', '#ffffff', '#0a5cb8', 4.5],
  ['equipe: texto / balão creme', '#0b1a33', '#fff8e1', 7],
  ['equipe: rótulo ouro escuro / fundo', '#7a5a00', '#ffffff', 4.5],
  ['equipe: rótulo ouro escuro / creme', '#7a5a00', '#fff8e1', 4.5],
  ['erro / fundo', '#b3261e', '#ffffff', 4.5],
  ['sucesso / fundo', '#157a4c', '#ffffff', 4.5],
  ['botão primário (branco / azul)', '#ffffff', '#0051a0', 4.5],
  ['cabeçalho do app (branco / azul)', '#ffffff', '#0b3f8c', 4.5],
];
const dark = [
  ['texto / fundo', '#e8eef8', '#0a1424', 7],
  ['texto secundário / fundo', '#b7c3d9', '#0a1424', 7],
  ['texto terciário / fundo', '#94a2bc', '#0a1424', 4.5],
  ['texto terciário / cartão', '#94a2bc', '#14233e', 4.5],
  ['destaque azul / fundo', '#a9ccf7', '#0a1424', 7],
  ['saudação (branco) / azul do topo', '#ffffff', '#0a58b0', 4.5],
  ['balão do aluno (branco / azul)', '#ffffff', '#0a5cb8', 4.5],
  ['equipe: texto / balão', '#e8eef8', '#1c2333', 7],
  ['equipe: rótulo ouro / fundo', '#f3d06a', '#0a1424', 4.5],
  ['erro / fundo', '#ff9c9c', '#0a1424', 4.5],
  ['sucesso / fundo', '#5fd39c', '#0a1424', 4.5],
];

let failures = 0;
for (const [name, pairs] of [
  ['Tema claro', light],
  ['Tema escuro', dark],
]) {
  console.log(`\n${name}`);
  for (const [label, fg, bg, min] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok ' : 'FALHA'} ${r.toFixed(2).padStart(5)}:1 (mín. ${min})  ${label}`);
  }
}
console.log(`\n${light.length + dark.length} pares medidos, ${failures} abaixo do mínimo.`);
process.exit(failures ? 1 : 0);
