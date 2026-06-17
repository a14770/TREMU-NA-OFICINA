import { ALFABETO_MANUAL } from '../data/alfabetoManual'

const DEDO_POS = [
  { x: 30, largura: 16, altura: 34, label: 'polegar' },
  { x: 56, largura: 14, altura: 58, label: 'indicador' },
  { x: 76, largura: 14, altura: 64, label: 'medio' },
  { x: 96, largura: 14, altura: 58, label: 'anelar' },
  { x: 116, largura: 13, altura: 48, label: 'mindinho' },
]

const PALMA = { x: 46, y: 70, largura: 80, altura: 64 }

export default function MaoGesto({ letra, tamanho = 120, ativo = false }) {
  const config = ALFABETO_MANUAL[letra]
  if (!config) return null
  const { dedos, rot, extra } = config

  return (
    <svg
      viewBox="0 0 180 180"
      width={tamanho}
      height={tamanho}
      className={`mao-gesto ${ativo ? 'mao-gesto--ativa' : ''}`}
      role="img"
      aria-label={`Gesto para a letra ${letra}`}
    >
      <g transform={`rotate(${rot} 90 90)`}>
        <rect x="60" y="134" width="60" height="34" rx="10" className="mao-pulso" />
        <rect
          x={PALMA.x}
          y={PALMA.y}
          width={PALMA.largura}
          height={PALMA.altura}
          rx="18"
          className="mao-palma"
        />

        {DEDO_POS.map((d, i) => {
          const esticado = dedos[i] === 1
          if (i === 0) {
            const largura = esticado ? d.altura * 0.9 : 22
            return (
              <rect
                key={d.label}
                x={esticado ? PALMA.x - largura + 14 : PALMA.x - 8}
                y={PALMA.y + 8}
                width={largura}
                height="20"
                rx="9"
                className={`mao-dedo mao-dedo--${d.label} ${esticado ? 'esticado' : 'dobrado'}`}
              />
            )
          }

          const altura = esticado ? d.altura : d.altura * 0.32
          const yFinal = esticado ? PALMA.y - (d.altura - 30) : PALMA.y - 4

          return (
            <rect
              key={d.label}
              x={d.x}
              y={yFinal}
              width={d.largura}
              height={altura}
              rx="7"
              className={`mao-dedo mao-dedo--${d.label} ${esticado ? 'esticado' : 'dobrado'}`}
            />
          )
        })}

        {extra === 'circulo' && (
          <circle cx="86" cy="100" r="14" className="mao-extra mao-extra--furo" />
        )}
        {extra === 'cruzado' && (
          <line x1="58" y1="60" x2="92" y2="40" className="mao-extra mao-extra--linha" />
        )}
        {extra === 'separado' && (
          <line x1="90" y1="50" x2="90" y2="30" className="mao-extra mao-extra--seta" />
        )}
        {extra === 'tracar' && (
          <path d="M 60 50 L 110 50 L 60 30 L 110 30" className="mao-extra mao-extra--zigzag" />
        )}
        {extra === 'gancho' && (
          <path d="M 70 40 Q 50 40 50 60" className="mao-extra mao-extra--gancho" />
        )}
        {extra === 'curva' && (
          <path d="M 130 70 A 44 44 0 0 0 130 134" className="mao-extra mao-extra--curva" />
        )}
        {extra === 'toque' && (
          <circle cx="74" cy="40" r="6" className="mao-extra mao-extra--ponto" />
        )}
        {(extra === 'tres' || extra === 'dois') && (
          <text x="90" y="118" className="mao-extra mao-extra--texto" textAnchor="middle">
            {extra === 'tres' ? '3' : '2'}
          </text>
        )}
        {extra === 'entre' && (
          <rect x="64" y="78" width="14" height="20" rx="4" className="mao-extra mao-extra--bloco" />
        )}
        {extra === 'fechado' && (
          <rect x="62" y="76" width="56" height="40" rx="14" className="mao-extra mao-extra--punho-fechado" />
        )}
        {extra === 'punho' && (
          <rect x="58" y="78" width="60" height="36" rx="14" className="mao-extra mao-extra--punho-fechado" />
        )}
        {extra === 'dobrado' && (
          <rect x="56" y="80" width="64" height="34" rx="14" className="mao-extra mao-extra--punho-fechado" />
        )}
        {extra === 'aberto' && (
          <line x1="76" y1="30" x2="64" y2="50" className="mao-extra mao-extra--linha" />
        )}
      </g>
    </svg>
  )
}
