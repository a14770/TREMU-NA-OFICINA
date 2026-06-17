const CHAVE_STORAGE = 'tremu-oficina:modelo-v1'

const estadoInicial = () => ({
  porLetra: {},
  jogos: 0,
  vitorias: 0,
  melhorSequencia: 0,
  sequenciaAtual: 0,
})

export function carregarModelo() {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE)
    if (!raw) return estadoInicial()
    const dados = JSON.parse(raw)
    return { ...estadoInicial(), ...dados }
  } catch {
    return estadoInicial()
  }
}

export function guardarModelo(modelo) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(modelo))
  } catch {
    // armazenamento indisponível — segue sem persistência
  }
}

export function registarResposta(modelo, letra, correta) {
  const porLetra = { ...modelo.porLetra }
  const atual = porLetra[letra] || { acertos: 0, erros: 0 }
  porLetra[letra] = correta
    ? { ...atual, acertos: atual.acertos + 1 }
    : { ...atual, erros: atual.erros + 1 }
  return { ...modelo, porLetra }
}

export function registarFimDeJogo(modelo, ganhou) {
  const sequenciaAtual = ganhou ? modelo.sequenciaAtual + 1 : 0
  return {
    ...modelo,
    jogos: modelo.jogos + 1,
    vitorias: modelo.vitorias + (ganhou ? 1 : 0),
    sequenciaAtual,
    melhorSequencia: Math.max(modelo.melhorSequencia, sequenciaAtual),
  }
}

export function letrasParaPraticar(modelo, max = 3) {
  const entradas = Object.entries(modelo.porLetra)
    .map(([letra, { acertos, erros }]) => {
      const total = acertos + erros
      const taxaErro = total > 0 ? erros / total : 0
      return { letra, taxaErro, total }
    })
    .filter(e => e.total >= 2 && e.taxaErro > 0)
    .sort((a, b) => b.taxaErro - a.taxaErro)
  return entradas.slice(0, max)
}

export function taxaSucessoGlobal(modelo) {
  if (modelo.jogos === 0) return null
  return Math.round((modelo.vitorias / modelo.jogos) * 100)
}
