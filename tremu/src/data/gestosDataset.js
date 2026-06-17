const CHAVE_DATASET = 'tremu-oficina:dataset-v1'

const estadoInicialDataset = () => ({
  exemplos: [],
})

export function carregarDataset() {
  try {
    const raw = localStorage.getItem(CHAVE_DATASET)
    if (!raw) return estadoInicialDataset()
    return JSON.parse(raw)
  } catch {
    return estadoInicialDataset()
  }
}

export function guardarDataset(dataset) {
  try {
    localStorage.setItem(CHAVE_DATASET, JSON.stringify(dataset))
  } catch {
    // armazenamento indisponível
  }
}

export function adicionarExemplo(dataset, letra, keypoints, imagem) {
  const exemplo = {
    letra,
    imagem,
    keypoints: keypoints.map((p) => ({ x: p.x, y: p.y, name: p.name })),
    criadoEm: new Date().toISOString(),
  }

  return {
    ...dataset,
    exemplos: [...dataset.exemplos, exemplo],
  }
}

export function limparDataset() {
  try {
    localStorage.removeItem(CHAVE_DATASET)
  } catch {
    // ignore
  }

  return estadoInicialDataset()
}
