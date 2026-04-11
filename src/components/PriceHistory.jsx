import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { consultarHistorico, CIDADES } from '../services/albionApi'

export function PriceHistory({ item, servidor, qualidade }) {
  const [historico, setHistorico] = useState([])
  const [cidade, setCidade] = useState('Caerleon')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!item) return

    const fetchHistorico = async () => {
      setLoading(true)
      try {
        const data = await consultarHistorico(item.uniqueName, servidor, qualidade, cidade)

        // Processa dados para o gráfico
        if (data && data.length > 0) {
          const dadosCidade = data.find(d => d.location === cidade || d.location === cidade.replace(' ', ''))
          if (dadosCidade && dadosCidade.data) {
            const processados = dadosCidade.data.map(d => ({
              data: new Date(d.timestamp).toLocaleDateString('pt-BR'),
              preco: d.avg_price,
              vendidos: d.item_count
            }))
            setHistorico(processados)
          } else {
            setHistorico([])
          }
        } else {
          setHistorico([])
        }
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
        setHistorico([])
      }
      setLoading(false)
    }

    fetchHistorico()
  }, [item, servidor, qualidade, cidade])

  if (!item) return null

  return (
    <div className="price-history">
      <div className="history-header">
        <h3>Histórico de Preços</h3>
        <select value={cidade} onChange={(e) => setCidade(e.target.value)}>
          {CIDADES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Carregando histórico...</div>
      ) : historico.length > 0 ? (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historico}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                dataKey="data"
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <YAxis
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                tickFormatter={(value) => value.toLocaleString('pt-BR')}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
                formatter={(value, name) => [
                  name === 'preco' ? `${value.toLocaleString('pt-BR')} prata` : value,
                  name === 'preco' ? 'Preço médio' : 'Vendidos'
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="preco"
                name="Preço médio"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="vendidos"
                name="Itens vendidos"
                stroke="#eab308"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                yAxisId={0}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="no-data">
          Sem dados históricos para {cidade}
        </div>
      )}
    </div>
  )
}
