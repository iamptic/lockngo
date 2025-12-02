import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

// API Routes
const api = new Hono<{ Bindings: Bindings }>()

// 1. Получить локации (с типом)
api.get('/locations', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM stations').all()
    return c.json(results)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// 2. Детали локации + РЕАЛЬНЫЕ ТАРИФЫ
api.get('/location/:id', async (c) => {
  const id = c.req.param('id')
  const station = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first()
  
  if(!station) return c.json({error: 'Not found'}, 404)

  // Получаем тарифы для этой станции
  const { results: tariffs } = await c.env.DB.prepare('SELECT * FROM tariffs WHERE station_id = ?').bind(id).all()

  // Получаем доступность
  const { results: availability } = await c.env.DB.prepare(`
    SELECT size, count(*) as total, 
    sum(case when status = 'free' then 1 else 0 end) as free 
    FROM cells WHERE station_id = ? GROUP BY size
  `).bind(id).all()

  return c.json({ station, tariffs, availability })
})

// 3. Бронирование (С учетом тарифов)
api.post('/book', async (c) => {
  const { station_id, size } = await c.req.json()
  
  // 1. Ищем свободную ячейку
  const cell = await c.env.DB.prepare(`
    SELECT id, cell_number FROM cells 
    WHERE station_id = ? AND size = ? AND status = 'free' 
    LIMIT 1
  `).bind(station_id, size).first()

  if (!cell) return c.json({ success: false, message: 'Нет ячеек' }, 400)

  // 2. Узнаем цену (для логов)
  const tariff = await c.env.DB.prepare(`
    SELECT * FROM tariffs WHERE station_id = ? AND size = ?
  `).bind(station_id, size).first()

  const price = tariff ? tariff.price_initial : 0
  const currency = tariff ? tariff.currency : 'RUB'

  // 3. Бронируем
  await c.env.DB.prepare("UPDATE cells SET status = 'booked' WHERE id = ?").bind(cell.id).run()
  
  // 4. Пишем лог транзакции
  await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, ?, ?)")
    .bind(station_id, 'booking', `Booked Cell #${cell.cell_number} (${size}). Price: ${price} ${currency}`)
    .run()

  return c.json({ 
    success: true, 
    booking: { 
      id: Date.now(), 
      cell_number: cell.cell_number, 
      code: Math.floor(1000 + Math.random() * 9000), // 4-digit PIN
      price_info: `${price} ${currency}`
    } 
  })
})

// Mount API
app.route('/api', api)

app.get('/*', async (c) => {
  return c.env.ASSETS.fetch(new URL('/index.html', c.req.url))
})

export default app
