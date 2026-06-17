export const LISTA_PALAVRAS = [
  { palavra: 'TUBO', dica: 'Peça cilíndrica e vazia, leva líquidos ou gases' },
  { palavra: 'CABO', dica: 'Fio condutor, liga aparelhos à corrente eléctrica' },
  { palavra: 'MOLA', dica: 'Espiral metálica que faz força e volta à forma' },
  { palavra: 'LIXA', dica: 'Folha áspera usada para alisar superfícies' },
  { palavra: 'FITA', dica: 'Enrola-se, cola ou serve para medir distâncias' },
  { palavra: 'EIXO', dica: 'Vara central à volta da qual uma roda gira' },
  { palavra: 'LUVA', dica: 'Protege as mãos do trabalhador na oficina' },
  { palavra: 'RODA', dica: 'Gira sobre um eixo e move qualquer veículo' },
  { palavra: 'PINO', dica: 'Pequena peça que encaixa e fixa duas partes' },
  { palavra: 'ARCO', dica: 'Forma curva, também nome de um tipo de serra' },
  { palavra: 'TOPO', dica: 'A parte mais alta de uma peça ou estrutura' },
  { palavra: 'BASE', dica: 'A parte inferior que sustenta toda a estrutura' },
  { palavra: 'VARA', dica: 'Peça longa e fina, de madeira ou metal' },
  { palavra: 'MACO', dica: 'Martelo de madeira usado para bater sem marcar' },
  { palavra: 'PIAO', dica: 'Objeto que gira sobre o próprio eixo' },
  { palavra: 'TINA', dica: 'Recipiente largo para lavar peças ou misturar' },
  { palavra: 'BICO', dica: 'Ponta fina de uma ferramenta, como o do alicate' },
  { palavra: 'COLA', dica: 'Substância usada para juntar duas superfícies' },
  { palavra: 'FUSO', dica: 'Peça roscada que transmite movimento de rotação' },
  { palavra: 'LIME', dica: 'Ferramenta usada para desgastar e afiar metal' },
]

export const PALAVRAS = Array.from(
  new Map(
    LISTA_PALAVRAS
      .map(p => ({ palavra: p.palavra.toUpperCase(), dica: p.dica || '' }))
      .filter(p => /^[A-Z]{4}$/.test(p.palavra))
      .map(p => [p.palavra, p])
  ).values()
)
