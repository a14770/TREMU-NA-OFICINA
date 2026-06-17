import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Menu from './components/Menu'
import MaoGesto from './components/MaoGesto'
import { LETRAS_DISPONIVEIS } from './data/alfabetoManual'
import { LISTA_PALAVRAS } from './data/palavras'
import {
  carregarDataset,
  guardarDataset,
  adicionarExemplo,
  limparDataset,
} from './data/gestosDataset'
import {
  criarDetectorDeMao,
  classificarGesto,
  desenharMao,
  detectarMao,
} from './handDetector'
import './style.css'

const TEMPO_CONFIRMACAO = 1.5
const PALAVRA_TAMANHO = 4
const JOGADAS_MAX = 6
const LETRAS_EXIBIDAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',]
const ORDEM_LETRAS = [...LETRAS_DISPONIVEIS].sort()
const STATUS_CORRETO = 'correct'
const STATUS_PRESENTE = 'present'
const STATUS_AUSENTE = 'absent'

function escolherPalavra() {
  const opcoes = LISTA_PALAVRAS.filter((item) => /^[A-Z]{4}$/.test(item.palavra))
  return opcoes[Math.floor(Math.random() * opcoes.length)] || { palavra: '____', dica: '' }
}

function criarPalavraVazia() {
  return new Array(PALAVRA_TAMANHO).fill('')
}

function contarPorLetra(dataset) {
  return dataset.exemplos.reduce((acum, item) => {
    acum[item.letra] = (acum[item.letra] || 0) + 1
    return acum
  }, {})
}

function criarArquivoExportacao(dataset) {
  const blob = new Blob([JSON.stringify(dataset, null, 2)], {
    type: 'application/json',
  })
  return URL.createObjectURL(blob)
}

function extrairCorteDaMao(video, keypoints) {
  if (!video || !keypoints || keypoints.length === 0) return null

  const largura = video.videoWidth || 640
  const altura = video.videoHeight || 480

  const xValores = keypoints.map((p) => (p.x <= 1 ? p.x * largura : p.x))
  const yValores = keypoints.map((p) => (p.y <= 1 ? p.y * altura : p.y))
  const minX = Math.max(0, Math.min(...xValores) - 0.1 * largura)
  const maxX = Math.min(largura, Math.max(...xValores) + 0.1 * largura)
  const minY = Math.max(0, Math.min(...yValores) - 0.1 * altura)
  const maxY = Math.min(altura, Math.max(...yValores) + 0.1 * altura)

  const corteLargura = Math.max(1, maxX - minX)
  const corteAltura = Math.max(1, maxY - minY)
  const canvas = document.createElement('canvas')
  canvas.width = corteLargura
  canvas.height = corteAltura
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, minX, minY, corteLargura, corteAltura, 0, 0, corteLargura, corteAltura)
  return canvas.toDataURL('image/jpeg', 0.8)
}

function avaliarChute(chute, alvo) {
  const letras = chute.split('')
  const alvoChars = alvo.split('')
  const status = new Array(PALAVRA_TAMANHO).fill(STATUS_AUSENTE)

  letras.forEach((letra, index) => {
    if (letra === alvoChars[index]) {
      status[index] = STATUS_CORRETO
      alvoChars[index] = null
      letras[index] = null
    }
  })

  letras.forEach((letra, index) => {
    if (letra) {
      const posicao = alvoChars.indexOf(letra)
      if (posicao !== -1) {
        status[index] = STATUS_PRESENTE
        alvoChars[posicao] = null
      }
    }
  })

  return status
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [dataset, setDataset] = useState(carregarDataset)
  const [cameraLigada, setCameraLigada] = useState(false)
  const [cameraStatus, setCameraStatus] = useState('Câmara desligada')
  const [candidatoGesto, setCandidatoGesto] = useState(null)
  const [progresso, setProgresso] = useState(0)
  const [palavraAtual, setPalavraAtual] = useState(() => escolherPalavra())
  const [palavraUsuario, setPalavraUsuario] = useState(criarPalavraVazia)
  const [historico, setHistorico] = useState([])
  const [selectedLetter, setSelectedLetter] = useState('A')
  const [selectedGestureIndex, setSelectedGestureIndex] = useState(null)
  const [databaseViewLetter, setDatabaseViewLetter] = useState(null)
  const [importError, setImportError] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState('Segure o gesto e aguarde 1.5s')
  const [resultadoMensagem, setResultadoMensagem] = useState('Use os gestos para compor a palavra')
  const [mostrarDica, setMostrarDica] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const detectorRef = useRef(null)
  const frameRef = useRef(null)
  const ultimoKeypointsRef = useRef(null)
  const datasetRef = useRef(dataset)
  const stableRef = useRef({ letra: null, tempo: 0 })
  const resetTimeoutRef = useRef(null)

  useEffect(() => {
    datasetRef.current = dataset
  }, [dataset])

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [])

  const resetJogo = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }
    setPalavraAtual(escolherPalavra())
    setPalavraUsuario(criarPalavraVazia())
    setHistorico([])
    setCandidatoGesto(null)
    setProgresso(0)
    stableRef.current = { letra: null, tempo: 0 }
    setConfirmMessage('Segure o gesto e aguarde 1.5s')
    setResultadoMensagem('Use os gestos para compor a palavra')
    setMostrarDica(false)
    setSelectedGestureIndex(null)
    setDatabaseViewLetter(null)
  }, [])

  useEffect(() => {
    if (screen === 'home') {
      setCameraLigada(false)
    }
    if (screen === 'play') {
      resetJogo()
    }
  }, [screen, resetJogo])

  useEffect(() => {
    if (!cameraLigada) {
      pararCamera()
      return
    }

    iniciarCamera()
    return () => {
      pararCamera()
    }
  }, [cameraLigada])

  const limparConfirmacao = useCallback(() => {
    stableRef.current = { letra: null, tempo: 0 }
    setProgresso(0)
  }, [])

  const adicionarLetra = useCallback((novaLetra) => {
    setPalavraUsuario((anterior) => {
      const copia = [...anterior]
      const indice = copia.findIndex((item) => item === '')
      if (indice === -1) return copia
      copia[indice] = novaLetra
      return copia
    })
    setConfirmMessage(`Letra ${novaLetra} adicionada`)
  }, [])

  const aplicarLetraDetetada = useCallback((novaLetra) => {
    adicionarLetra(novaLetra)
  }, [adicionarLetra])

  const removerUltimaLetra = useCallback(() => {
    setPalavraUsuario((anterior) => {
      const copia = [...anterior]
      const ultimoIndice = copia.map((item) => item !== '').lastIndexOf(true)
      if (ultimoIndice === -1) return copia
      copia[ultimoIndice] = ''
      return copia
    })
  }, [])

  const submeterPalpite = useCallback(() => {
    if (palavraUsuario.some((letra) => letra === '')) {
      setResultadoMensagem('Preencha os 4 caracteres antes de enviar')
      return
    }

    const chute = palavraUsuario.join('')
    const status = avaliarChute(chute, palavraAtual.palavra)
    const novaEntrada = { letras: [...palavraUsuario], status }
    const tentativaAtual = historico.length + 1

    setHistorico((anterior) => [...anterior, novaEntrada])

    if (status.every((item) => item === STATUS_CORRETO)) {
      setResultadoMensagem('Parabéns! Palavra certa. Nova palavra em breve.')
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = setTimeout(resetJogo, 2200)
      return
    }

    if (tentativaAtual >= JOGADAS_MAX) {
      setResultadoMensagem(`Acabaram as 6 tentativas. A palavra era ${palavraAtual.palavra}.`) 
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = setTimeout(resetJogo, 2600)
      return
    }

    setResultadoMensagem(`Tentativa ${tentativaAtual + 1} de ${JOGADAS_MAX}`)
    setPalavraUsuario(criarPalavraVazia())
    setCandidatoGesto(null)
    limparConfirmacao()
  }, [palavraAtual, palavraUsuario, historico.length, limparConfirmacao, resetJogo])

  const pararCamera = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    setCameraStatus('Câmara desligada')
    setCandidatoGesto(null)
    setProgresso(0)
    stableRef.current = { letra: null, tempo: 0 }
  }, [])

  const iniciarCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Câmara não suportada')
      return
    }

    if (!videoRef.current) return
    setCameraStatus('A carregar câmara...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      if (!detectorRef.current) {
        setCameraStatus('A carregar modelo...')
        detectorRef.current = await criarDetectorDeMao()
      }

      setCameraStatus('Câmara ativa')

      const processar = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          frameRef.current = requestAnimationFrame(processar)
          return
        }

        const tempoAtual = performance.now()
        const landmarks = detectarMao(videoRef.current, tempoAtual)
        ultimoKeypointsRef.current = landmarks?.[0] || null

        if (landmarks && landmarks.length > 0) {
          const { letra } = classificarGesto(landmarks, datasetRef.current)
          setCandidatoGesto(letra)
          if (letra) {
            if (stableRef.current.letra === letra) {
              const delta = tempoAtual - (stableRef.current.ultimoTempo || tempoAtual)
              stableRef.current.tempo += Math.min(0.06, delta / 1000)
            } else {
              stableRef.current = { letra, tempo: 0, ultimoTempo: tempoAtual }
            }
            const atual = Math.min(1, stableRef.current.tempo / TEMPO_CONFIRMACAO)
            setProgresso(atual)
            stableRef.current.ultimoTempo = tempoAtual
            if (atual >= 1) {
              aplicarLetraDetetada(letra)
              limparConfirmacao()
            }
          } else {
            setCandidatoGesto(null)
            limparConfirmacao()
          }

          desenharMao(canvasRef.current, videoRef.current, landmarks)
        } else {
          setCandidatoGesto(null)
          limparConfirmacao()
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          }
        }

        frameRef.current = requestAnimationFrame(processar)
      }

      frameRef.current = requestAnimationFrame(processar)
    } catch (erro) {
      console.error(erro)
      setCameraStatus('Erro ao aceder à câmara')
    }
  }, [aplicarLetraDetetada, limparConfirmacao])

  const salvarGesto = () => {
    const keypoints = ultimoKeypointsRef.current
    if (!keypoints || keypoints.length === 0) return

    const foto = extrairCorteDaMao(videoRef.current, keypoints)
    if (!foto) return

    setDataset((anterior) => {
      const atualizado = adicionarExemplo(anterior, selectedLetter, keypoints, foto)
      guardarDataset(atualizado)
      return atualizado
    })
  }

  const apagarGestoSelecionado = () => {
    if (selectedGestureIndex === null) return
    setDataset((anterior) => {
      const exemplos = anterior.exemplos.filter((_, index) => index !== selectedGestureIndex)
      const atualizado = { ...anterior, exemplos }
      guardarDataset(atualizado)
      return atualizado
    })
    setSelectedGestureIndex(null)
  }

  const apagarTodosGestosLetra = () => {
    setDataset((anterior) => {
      const exemplos = anterior.exemplos.filter((item) => item.letra !== selectedLetter)
      const atualizado = { ...anterior, exemplos }
      guardarDataset(atualizado)
      return atualizado
    })
    setSelectedGestureIndex(null)
  }

  const apagarLetra = (letra) => {
    setDataset((anterior) => {
      const exemplos = anterior.exemplos.filter((item) => item.letra !== letra)
      const atualizado = { ...anterior, exemplos }
      guardarDataset(atualizado)
      return atualizado
    })
    if (databaseViewLetter === letra) {
      setDatabaseViewLetter(null)
    }
  }

  const limparBase = () => {
    const vazio = limparDataset()
    setDataset(vazio)
    setDatabaseViewLetter(null)
    setSelectedGestureIndex(null)
  }

  const exportarBase = () => {
    const url = criarArquivoExportacao(dataset)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tremu-database.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importarBase = (event) => {
    const arquivo = event.target.files?.[0]
    if (!arquivo) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const valor = JSON.parse(reader.result)
        if (!valor || !Array.isArray(valor.exemplos)) {
          throw new Error('Formato inválido')
        }
        const atualizado = { exemplos: valor.exemplos }
        guardarDataset(atualizado)
        setDataset(atualizado)
        setImportError(null)
      } catch (erro) {
        console.error(erro)
        setImportError('Não foi possível importar a base de dados')
      }
    }
    reader.readAsText(arquivo)
    event.target.value = ''
  }

  const exemplosDaLetraSelecionada = useMemo(
    () => dataset.exemplos.filter((item) => item.letra === selectedLetter),
    [dataset.exemplos, selectedLetter]
  )

  const letrasPorContagem = useMemo(() => {
    const contagem = contarPorLetra(dataset)
    return ORDEM_LETRAS.map((letra) => ({ letra, quantidade: contagem[letra] || 0 }))
  }, [dataset])

  const exemplosVisiveis = useMemo(() => {
    if (!databaseViewLetter) return []
    return dataset.exemplos.filter((item) => item.letra === databaseViewLetter)
  }, [dataset.exemplos, databaseViewLetter])

  const tentativasRestantes = JOGADAS_MAX - historico.length

  return (
    <div className="app-shell">
      {screen === 'home' ? (
        <Menu
          onJogar={() => setScreen('play')}
          onTreinar={() => setScreen('train')}
          onBase={() => setScreen('database')}
          onConfig={() => setScreen('settings')}
        />
      ) : (
        <div className="screen">
          <header className="screen__header">
            <button type="button" className="icon-button" onClick={() => setScreen('home')}>
              ← Início
            </button>
            <div className="screen__title">
              {screen === 'play' ? 'Jogar' : screen === 'train' ? 'Treinar' : screen === 'database' ? 'Base de Dados' : 'Configurações'}
            </div>
            <button type="button" className="icon-button" onClick={() => setScreen('home')}>
              ✕
            </button>
          </header>

          <div className="screen__body">
            <section className="camera-panel">
              <div className="camera-label">CÂMARA ATIVA</div>
              <div className="camera-card">
                <video ref={videoRef} className="camera-video" muted playsInline />
                <canvas ref={canvasRef} className="camera-overlay" />
                <div className="camera-badge">
                  <span className="camera-badge__label">LETRA</span>
                  <span className="camera-badge__letter">{candidatoGesto || '-'}</span>
                </div>
              </div>
              <div className="camera-status-row">
                <span>{cameraStatus}</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCameraLigada((anterior) => !anterior)}
                >
                  {cameraLigada ? 'Parar' : 'Ligar'}
                </button>
              </div>
            </section>

            {screen === 'play' && (
              <main className="play-content">
                <div className="play-header">
                  <div>
                    <div className="section-label">Palavra secreta</div>
                    <div className="word-target">• • • •</div>
                  </div>
                  <div className="play-badges">
                    <span className="hint-badge">Tentativas: {tentativasRestantes}</span>
                    <button type="button" className="hint-button" onClick={() => setMostrarDica((anterior) => !anterior)}>
                      {mostrarDica ? 'Esconder dica' : 'Mostrar dica'}
                    </button>
                  </div>
                </div>

                {mostrarDica && (
                  <div className="hint-panel">
                    <strong>Dica</strong>
                    <p>{palavraAtual.dica || 'Sem dica disponível.'}</p>
                  </div>
                )}

                <div className="word-panel">
                  {palavraUsuario.map((letra, index) => (
                    <div key={index} className="word-chip word-chip--current">
                      {letra || '—'}
                    </div>
                  ))}
                </div>

                <div className="play-actions">
                  <button type="button" className="primary-button" onClick={submeterPalpite}>
                    Enviar
                  </button>
                  <button type="button" className="secondary-button" onClick={removerUltimaLetra}>
                    Apagar letra
                  </button>
                  <button type="button" className="secondary-button" onClick={resetJogo}>
                    Nova palavra
                  </button>
                </div>

                <div className="status-card">
                  <div>{resultadoMensagem}</div>
                  <div className="status-caption">{confirmMessage}</div>
                </div>
                <section className="history-panel">
                  <div className="section-label">Histórico de tentativas</div>
                  {historico.length === 0 ? (
                    <div className="empty-state">Seu histórico aparecerá aqui depois de enviar uma palavra.</div>
                  ) : (
                    <div className="history-grid">
                      {historico.map((item, index) => (
                        <div key={index} className="history-row">
                          {item.letras.map((letra, letraIndex) => (
                            <div
                              key={letraIndex}
                              className={`word-chip word-chip--status word-chip--${item.status[letraIndex]}`}
                            >
                              {letra}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="gesture-row">
                  <div className="section-label">Gestos disponíveis</div>
                  <div className="gesture-strip">
                    {LETRAS_EXIBIDAS.map((letra) => (
                      <button
                        key={letra}
                        type="button"
                        className={`gesture-card ${candidatoGesto === letra ? 'gesture-card--active' : ''}`}
                        onClick={() => adicionarLetra(letra)}
                      >
                        <div className="gesture-icon">
                          <MaoGesto letra={letra} tamanho={52} ativo />
                        </div>
                        <span>{letra}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </main>
            )}

            {screen === 'train' && (
              <main className="train-content">
                <div className="train-header">
                  <div>
                    <span className="section-label">Letra atual</span>
                    <div className="letter-pill">{selectedLetter}</div>
                  </div>
                  <div className="save-count">{exemplosDaLetraSelecionada.length} imagens</div>
                </div>

                <div className="train-actions">
                  <button type="button" className="primary-button" onClick={salvarGesto} disabled={!cameraLigada || !ultimoKeypointsRef.current}>
                    Guardar gesto
                  </button>
                  <button type="button" className="secondary-button" onClick={apagarGestoSelecionado} disabled={selectedGestureIndex === null}>
                    Eliminar gesto selecionado
                  </button>
                  <button type="button" className="secondary-button" onClick={apagarTodosGestosLetra} disabled={exemplosDaLetraSelecionada.length === 0}>
                    Eliminar todos os gestos
                  </button>
                </div>

                <div className="letter-picker">
                  <span className="section-label">Escolher letra</span>
                  <div className="letter-grid">
                    {ORDEM_LETRAS.map((letra) => (
                      <button
                        key={letra}
                        type="button"
                        className={`letter-chip ${selectedLetter === letra ? 'letter-chip--selected' : ''}`}
                        onClick={() => {
                          setSelectedLetter(letra)
                          setSelectedGestureIndex(null)
                        }}
                      >
                        {letra}
                      </button>
                    ))}
                  </div>
                </div>

                <section className="gallery-card">
                  <div className="gallery-header">
                    <div>
                      <span className="section-label">Gestos guardados</span>
                      <p className="gallery-subtitle">Escolha um gesto para excluir</p>
                    </div>
                  </div>
                  {exemplosDaLetraSelecionada.length === 0 ? (
                    <div className="empty-state">Nenhuma imagem guardada para esta letra.</div>
                  ) : (
                    <div className="gallery-grid">
                      {exemplosDaLetraSelecionada.map((item, index) => {
                        const globalIndex = dataset.exemplos.findIndex((example) => example === item)
                        return (
                          <button
                            key={`${item.criadoEm}-${index}`}
                            type="button"
                            className={`gallery-item ${selectedGestureIndex === globalIndex ? 'gallery-item--selected' : ''}`}
                            onClick={() => setSelectedGestureIndex(globalIndex)}
                          >
                            <img src={item.imagem} alt={`Gesto ${item.letra}`} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>
              </main>
            )}

            {screen === 'database' && (
              <main className="database-content">
                <div className="database-summary">
                  <div className="database-card">
                    <span>Gestos</span>
                    <strong>{new Set(dataset.exemplos.map((item) => item.letra)).size}</strong>
                  </div>
                  <div className="database-card">
                    <span>Imagens</span>
                    <strong>{dataset.exemplos.length}</strong>
                  </div>
                  <div className="database-card">
                    <span>Letras</span>
                    <strong>{ORDEM_LETRAS.filter((letra) => contarPorLetra(dataset)[letra] > 0).length}</strong>
                  </div>
                </div>

                <div className="database-list">
                  {letrasPorContagem.map((item) => (
                    <div key={item.letra} className={`letter-row ${databaseViewLetter === item.letra ? 'letter-row--active' : ''}`}>
                      <button type="button" className="trash-button" onClick={() => apagarLetra(item.letra)}>
                        🗑
                      </button>
                      <button type="button" className="letter-row__main" onClick={() => setDatabaseViewLetter(item.letra)}>
                        <div>
                          <span className="letter-row__title">{item.letra}</span>
                          <p>{item.quantidade} gestos</p>
                        </div>
                        <span className="letter-row__action">›</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="database-actions">
                  <button type="button" className="primary-button" onClick={exportarBase} disabled={dataset.exemplos.length === 0}>
                    Exportar base
                  </button>
                  <label className="secondary-button file-button">
                    Importar base
                    <input type="file" accept="application/json" onChange={importarBase} />
                  </label>
                  <button type="button" className="secondary-button" onClick={limparBase} disabled={dataset.exemplos.length === 0}>
                    Limpar base
                  </button>
                </div>

                {importError && <p className="import-error">{importError}</p>}

                {databaseViewLetter && (
                  <section className="gallery-card">
                    <div className="gallery-header">
                      <div>
                        <span className="section-label">Imagens da letra {databaseViewLetter}</span>
                        <p className="gallery-subtitle">Toque para ver ou apagar</p>
                      </div>
                    </div>
                    {exemplosVisiveis.length === 0 ? (
                      <div className="empty-state">Não há imagens registadas para esta letra.</div>
                    ) : (
                      <div className="gallery-grid">
                        {exemplosVisiveis.map((item, index) => (
                          <div key={`${item.criadoEm}-${index}`} className="gallery-item gallery-item--static">
                            <img src={item.imagem} alt={`Gesto ${item.letra}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </main>
            )}

            {screen === 'settings' && (
              <main className="settings-content">
                <section className="settings-card">
                  <h2>Configurações</h2>
                  <div className="settings-row">
                    <span>Tema</span>
                    <strong>Escuro</strong>
                  </div>
                  <div className="settings-row">
                    <span>Idioma</span>
                    <strong>Português</strong>
                  </div>
                  <div className="settings-row">
                    <span>Resolução da câmara</span>
                    <strong>720p</strong>
                  </div>
                </section>
              </main>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
