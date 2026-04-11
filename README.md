# Albion Market

Consultor de preços para o jogo Albion Online. Permite consultar preços de itens em diferentes cidades e servidores, identificando oportunidades de arbitragem para maximizar lucros.

## Funcionalidades

- **Busca de itens** - Pesquise qualquer item do jogo por nome (português ou inglês)
- **Comparação de preços** - Veja preços de venda e compra em todas as cidades principais
- **Arbitragem** - Identifica automaticamente a melhor oportunidade de lucro (comprar barato em uma cidade, vender caro em outra)
- **Filtros** - Filtre por tier (T1-T8), qualidade (Normal até Obra-Prima) e servidor (West, East, Europe)
- **Favoritos** - Salve seus itens favoritos para acesso rápido
- **Histórico de preços** - Visualize a variação de preços ao longo do tempo
- **Modo escuro** - Interface adaptável para melhor conforto visual

## Cidades Suportadas

- Caerleon
- Bridgewatch
- Lymhurst
- Thetford
- Fort Sterling
- Martlock
- Brecilien
- Black Market

## Tecnologias

- React 18
- Vite
- Recharts (gráficos)
- Albion Online Data API

## Como Iniciar

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/albion-market.git
cd albion-market
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse no navegador: `http://localhost:5173`

### Build de Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

### Preview da Build

```bash
npm run preview
```

## Uso

1. Digite o nome de um item na barra de busca
2. Selecione o tier e qualidade desejados
3. Clique em um item da lista para ver os preços detalhados
4. A tabela mostrará os preços em cada cidade, destacando:
   - **Mais barato** - Melhor cidade para comprar
   - **Melhor venda** - Melhor cidade para vender
5. Se houver oportunidade de arbitragem, ela será destacada no topo

## API

Este projeto utiliza a [Albion Online Data Project API](https://www.albion-online-data.com/), uma API pública mantida pela comunidade com dados de preços coletados através do cliente do jogo.
