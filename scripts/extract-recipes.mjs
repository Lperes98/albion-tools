import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json'

const ITEM_TYPES = [
  'simpleitem', 'consumableitem', 'consumablefrominventoryitem',
  'equipmentitem', 'weapon', 'mount', 'furnitureitem', 'farmableitem',
  'journalitem', 'labourercontract', 'siegebanner', 'crystalleagueitem',
  'killtrophy', 'trackingitem', 'hideoutitem', 'siegeweapon', 'transportitem',
]

function toArray(v) {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function parseReq(req) {
  const resources = toArray(req.craftresource)
  const ingredients = resources
    .filter(r => r['@uniquename'])
    .map(r => ({ id: r['@uniquename'], count: parseInt(r['@count']) || 1 }))
  if (!ingredients.length) return null
  return {
    amountCrafted: parseInt(req['@amountcrafted']) || 1,
    craftingFocus: parseInt(req['@craftingfocus']) || 0,
    silver: parseInt(req['@silver']) || 0,
    ingredients,
  }
}

function extractItem(item) {
  const uid = item['@uniquename']
  if (!uid) return []
  const tierMatch = uid.match(/^T(\d+)_/)
  const tier = tierMatch ? parseInt(tierMatch[1]) : 0
  const base = {
    tier,
    category: item['@shopcategory'] || '',
    subcategory: item['@shopsubcategory1'] || '',
    craftingCategory: item['@craftingcategory'] || '',
  }
  const results = []

  // Receita base
  for (const req of toArray(item.craftingrequirements)) {
    const recipe = parseReq(req)
    if (recipe) { results.push({ id: uid, ...base, ...recipe }); break }
  }

  // Receitas encantadas
  for (const enchant of toArray(item.enchantments?.enchantment)) {
    const level = parseInt(enchant['@enchantmentlevel'])
    if (!level) continue
    for (const req of toArray(enchant.craftingrequirements)) {
      const recipe = parseReq(req)
      if (recipe) { results.push({ id: `${uid}@${level}`, enchantmentLevel: level, ...base, ...recipe }); break }
    }
  }

  return results
}

async function main() {
  console.log('Baixando items.json (~17MB)...')
  const res = await fetch(ITEMS_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  console.log('Parseando JSON...')
  const data = await res.json()
  const items = data.items

  const recipes = {}
  let count = 0

  for (const itemType of ITEM_TYPES) {
    for (const item of toArray(items[itemType])) {
      for (const r of extractItem(item)) {
        recipes[r.id] = r
        count++
      }
    }
  }

  const dataDir = resolve(__dirname, '../src/data')
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(resolve(dataDir, 'recipes.json'), JSON.stringify(recipes))
  console.log(`Extraídas ${count} receitas → src/data/recipes.json`)
}

main().catch(e => { console.error(e); process.exit(1) })
