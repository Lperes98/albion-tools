import { useState, useEffect } from 'react'

const FAVORITOS_KEY = 'albion_favoritos'

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState([])

  // Carrega favoritos do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITOS_KEY)
      if (saved) {
        setFavoritos(JSON.parse(saved))
      }
    } catch (e) {
      console.warn('Erro ao carregar favoritos:', e)
    }
  }, [])

  // Salva favoritos no localStorage
  const salvarFavoritos = (novosFavoritos) => {
    setFavoritos(novosFavoritos)
    try {
      localStorage.setItem(FAVORITOS_KEY, JSON.stringify(novosFavoritos))
    } catch (e) {
      console.warn('Erro ao salvar favoritos:', e)
    }
  }

  // Adiciona item aos favoritos
  const adicionarFavorito = (item) => {
    const existe = favoritos.some(f => f.uniqueName === item.uniqueName)
    if (!existe) {
      salvarFavoritos([...favoritos, item])
    }
  }

  // Remove item dos favoritos
  const removerFavorito = (uniqueName) => {
    salvarFavoritos(favoritos.filter(f => f.uniqueName !== uniqueName))
  }

  // Verifica se item é favorito
  const isFavorito = (uniqueName) => {
    return favoritos.some(f => f.uniqueName === uniqueName)
  }

  // Toggle favorito
  const toggleFavorito = (item) => {
    if (isFavorito(item.uniqueName)) {
      removerFavorito(item.uniqueName)
    } else {
      adicionarFavorito(item)
    }
  }

  return {
    favoritos,
    adicionarFavorito,
    removerFavorito,
    isFavorito,
    toggleFavorito
  }
}
