import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

interface Env { DB: D1Database }
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())
app.use('/assets/*', serveStatic({ root: './public' }))

// --- API ROUTES ---
app.get('/api/locations', async (c) => { 
  const { results } = await c.env.DB.prepare('SELECT * FROM stations').all(); 
  return c.json(results) 
})

app.get('/api/location/:id', async (c) => {
  const id = c.req.param('id')
  const station: any = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first()
  if(!station) return c.json({error: 'Not found'}, 404)
  const cells = await c.env.DB.prepare('SELECT * FROM cells WHERE station_id = ?').bind(id).all()
  const tariffs = await c.env.DB.prepare('SELECT * FROM tariffs WHERE station_id = ?').bind(id).all()
  const available = {
    S: cells.results.filter((cell: any) => cell.size === 'S' && cell.status === 'free').length,
    M: cells.results.filter((cell: any) => cell.size === 'M' && cell.status === 'free').length,
    L: cells.results.filter((cell: any) => cell.size === 'L' && cell.status === 'free').length
  }
  return c.json({ station, available, tariffs: tariffs.results })
})

app.post('/api/check-promo', async (c) => {
  const { code } = await c.req.json()
  const promo: any = await c.env.DB.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").bind(code).first()
  if (!promo) return c.json({ valid: false, error: 'Код не найден' })
  return c.json({ valid: true, discount: promo.discount_percent, code: promo.code })
})

app.post('/api/book', async (c) => {
  const { stationId, size, promoCode, phone } = await c.req.json()
  let user: any = await c.env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first()
  if (!user) {
      await c.env.DB.prepare("INSERT INTO users (phone) VALUES (?)").bind(phone).run()
      user = await c.env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first()
  }
  if (user.is_blocked) return c.json({ success: false, error: 'Аккаунт заблокирован' }, 403)
  const cell: any = await c.env.DB.prepare("SELECT * FROM cells WHERE station_id = ? AND size = ? AND status = 'free' LIMIT 1").bind(stationId, size).first()
  if (!cell) return c.json({ error: 'Нет свободных ячеек' }, 400)
  const tariff: any = await c.env.DB.prepare("SELECT * FROM tariffs WHERE station_id = ? AND size = ?").bind(stationId, size).first()
  let price = tariff ? tariff.price_initial : 100;
  if (promoCode) {
     const promo: any = await c.env.DB.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").bind(promoCode).first()
     if (promo) {
         price = Math.round(price * (1 - promo.discount_percent/100));
         await c.env.DB.prepare("UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?").bind(promo.id).run()
     }
  }
  // Access Code is now a unique string for QR generation
  const accessCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  await c.env.DB.prepare("UPDATE cells SET status = 'booked' WHERE id = ?").bind(cell.id).run()
  await c.env.DB.prepare("INSERT INTO bookings (user_id, cell_id, total_amount, status, access_code) VALUES (?, ?, ?, 'active', ?)").bind(user.id, cell.id, price, accessCode).run()
  await c.env.DB.prepare("UPDATE users SET ltv = ltv + ?, last_booking = CURRENT_TIMESTAMP WHERE id = ?").bind(price, user.id).run()
  // Log the booking
  await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'booking', 'User ' || ? || ' booked cell ' || ? || ' (ID: ' || ? || ')')").bind(stationId, phone, cell.cell_number, cell.id).run()
  
  return c.json({ success: true, cellNumber: cell.cell_number, accessCode, validUntil: new Date(Date.now() + 24*60*60*1000).toISOString() })
})

// --- ADMIN API (RESTORED) ---

app.get('/api/admin/dashboard', async (c) => {
    const revenue: any = await c.env.DB.prepare("SELECT SUM(total_amount) as total FROM bookings WHERE status = 'active' OR status = 'completed'").first();
    const activeRentals: any = await c.env.DB.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'active'").first();
    const incidents: any = await c.env.DB.prepare("SELECT COUNT(*) as count FROM station_health WHERE error_msg IS NOT NULL").first();
    const today: any = await c.env.DB.prepare("SELECT COUNT(*) as count FROM bookings WHERE created_at >= date('now')").first();
    
    return c.json({
        revenue: revenue?.total || 0,
        active_rentals: activeRentals?.count || 0,
        incidents: incidents?.count || 0,
        bookings_today: today?.count || 0
    });
});

app.get('/api/admin/stations', async (c) => {
    const stations: any = await c.env.DB.prepare(`
        SELECT s.*, h.battery_level, h.wifi_signal, h.last_heartbeat, h.error_msg 
        FROM stations s 
        LEFT JOIN station_health h ON s.id = h.station_id
    `).all();
    return c.json(stations.results);
});

app.get('/api/admin/users', async (c) => {
    const { results } = await c.env.DB.prepare("SELECT * FROM users ORDER BY last_booking DESC LIMIT 50").all();
    return c.json(results);
});

app.get('/api/admin/logs', async (c) => {
    const { results } = await c.env.DB.prepare(`
        SELECT l.*, s.name as station_name 
        FROM logs l 
        LEFT JOIN stations s ON l.station_id = s.id 
        ORDER BY l.created_at DESC LIMIT 100
    `).all();
    return c.json(results);
});

app.get('/api/admin/station/:id/details', async (c) => {
    const id = c.req.param('id');
    const station: any = await c.env.DB.prepare(`
        SELECT s.*, h.battery_level, h.wifi_signal, h.last_heartbeat, h.error_msg 
        FROM stations s 
        LEFT JOIN station_health h ON s.id = h.station_id
        WHERE s.id = ?
    `).bind(id).first();
    
    const cells: any = await c.env.DB.prepare("SELECT * FROM cells WHERE station_id = ? ORDER BY cell_number ASC").bind(id).all();
    const tariffs: any = await c.env.DB.prepare("SELECT * FROM tariffs WHERE station_id = ?").bind(id).all();
    
    return c.json({ station, cells: cells.results, tariffs: tariffs.results, health: station });
});

app.post('/api/admin/station/:id/open-all', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE station_id = ?").bind(id).run();
    await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'panic_open', 'EMERGENCY: OPEN ALL CELLS')").bind(id).run();
    return c.json({ success: true });
});

app.post('/api/admin/tariffs', async (c) => {
    const { id, price } = await c.req.json();
    await c.env.DB.prepare("UPDATE tariffs SET price_initial = ? WHERE id = ?").bind(price, id).run();
    return c.json({ success: true });
});

app.post('/api/admin/users/role', async (c) => {
    const { userId, role } = await c.req.json();
    await c.env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();
    return c.json({ success: true });
});

app.post('/api/admin/station/:id/screen', async (c) => {
    const id = c.req.param('id');
    const { content, mode } = await c.req.json();
    await c.env.DB.prepare("UPDATE stations SET screen_content = ?, screen_mode = ? WHERE id = ?").bind(content, mode, id).run();
    return c.json({ success: true });
});

// --- HARDWARE API ---
app.post('/api/station/scan', async (c) => {
    // Station sends scanned QR code
    const { station_id, qr_code } = await c.req.json();
    const booking: any = await c.env.DB.prepare("SELECT b.*, c.cell_number, c.station_id FROM bookings b JOIN cells c ON b.cell_id = c.id WHERE b.access_code = ? AND b.status = 'active'").bind(qr_code).first();
    
    if (!booking) return c.json({ error: 'Invalid QR' }, 400);
    if (booking.station_id != station_id) return c.json({ error: 'Wrong Station' }, 400);

    // Open the door
    await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(booking.cell_id).run();
    await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'qr_open', 'User scanned QR at station')").bind(station_id).run();
    
    return c.json({ success: true, open_cell: booking.cell_number });
})

app.post('/api/user/open', async (c) => {
    const { accessCode } = await c.req.json();
    // Verify booking is active and valid
    const booking: any = await c.env.DB.prepare("SELECT b.*, c.cell_number, c.station_id FROM bookings b JOIN cells c ON b.cell_id = c.id WHERE b.access_code = ? AND b.status = 'active'").bind(accessCode).first();
    
    if (!booking) return c.json({ error: 'Booking not found or expired' }, 400);

    // Open logic
    await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(booking.cell_id).run();
    await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'user_open', 'Client opened cell ' || ? || ' via app')").bind(booking.station_id, booking.cell_number).run();

    return c.json({ success: true });
})

app.post('/api/hw/sync', async (c) => { 
    const { id, battery, wifi, error } = await c.req.json(); 
    let stationId = id || 1; 
    
    // 1. Check for pending open commands (Remote Admin or QR)
    const pending: any = await c.env.DB.prepare("SELECT id, cell_number FROM cells WHERE station_id = ? AND door_open = 1").bind(stationId).all();
    const openCells = pending.results.map((r: any) => r.cell_number);

    // 2. Auto-reset flags after sending to hardware (Command Acknowledged)
    if (openCells.length > 0) {
        // In a real system, we would wait for ACK, but for MVP we assume HW receives it
        const ids = pending.results.map((r: any) => r.id).join(',');
        await c.env.DB.prepare(`UPDATE cells SET door_open = 0 WHERE id IN (${ids})`).run();
    }

    // 3. Update Health
    await c.env.DB.prepare(`INSERT INTO station_health (station_id, battery_level, wifi_signal, last_heartbeat, error_msg) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?) ON CONFLICT(station_id) DO UPDATE SET battery_level = excluded.battery_level, wifi_signal = excluded.wifi_signal, last_heartbeat = CURRENT_TIMESTAMP, error_msg = excluded.error_msg`).bind(stationId, battery, wifi, error).run(); 
    
    // 4. Get screen content
    const station: any = await c.env.DB.prepare("SELECT screen_content, screen_mode FROM stations WHERE id = ?").bind(stationId).first();

    // Return commands to HW
    return c.json({ 
        cmd: 'ok', 
        open: openCells, // Array of cell numbers ['A01', 'B02']
        screen: { mode: station?.screen_mode, content: station?.screen_content } 
    }) 
})

// API: Get history for specific cell
app.get('/api/admin/cell/:id/history', async (c) => {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
        SELECT l.created_at, l.action, l.details 
        FROM logs l 
        WHERE l.details LIKE '%' || ? || '%' 
        ORDER BY l.created_at DESC LIMIT 5
    `).bind(id).all();
    return c.json(results);
})

// API: Get user active bookings
app.get('/api/user/bookings', async (c) => {
    const phone = c.req.query('phone');
    if(!phone) return c.json([]);
    
    const { results } = await c.env.DB.prepare(`
        SELECT b.*, c.cell_number, c.size, s.name as station_name, s.address 
        FROM bookings b 
        JOIN cells c ON b.cell_id = c.id 
        JOIN stations s ON c.station_id = s.id 
        JOIN users u ON b.user_id = u.id
        WHERE u.phone = ? AND b.status = 'active'
        ORDER BY b.created_at DESC
    `).bind(phone).all();
    
    return c.json(results.map((r: any) => ({
        ...r,
        validUntil: new Date(new Date(r.created_at).getTime() + 24*60*60*1000).toISOString() // Assuming 24h rental
    })));
})

app.post('/api/admin/cell/open', async (c) => {
    const { cellId } = await c.req.json();
    const cell: any = await c.env.DB.prepare("SELECT * FROM cells WHERE id = ?").bind(cellId).first();
    if(!cell) return c.json({error: 'Cell not found'}, 404);
    
    await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(cellId).run();
    await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'remote_open', 'Remote open cell ' || ? || ' (ID: ' || ? || ')')").bind(cell.station_id, cell.cell_number, cellId).run();
    
    return c.json({ success: true });
})

app.post('/api/admin/cell/status', async (c) => {
    const { cellId, status } = await c.req.json(); // status: 'free', 'maintenance'
    const cell: any = await c.env.DB.prepare("SELECT * FROM cells WHERE id = ?").bind(cellId).first();
    if(!cell) return c.json({error: 'Cell not found'}, 404);

    await c.env.DB.prepare("UPDATE cells SET status = ? WHERE id = ?").bind(status, cellId).run();
    await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'status_change', 'Changed cell ' || ? || ' status to ' || ?)").bind(cell.station_id, cell.cell_number, status).run();

    return c.json({ success: true });
})

// --- FRONTEND HTML ---
const adminHtml = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Lock&Go Admin Pro</title><script src="https://cdnjs.cloudflare.com/ajax/libs/vue/3.3.4/vue.global.min.js"></script><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body { font-family: 'Inter', sans-serif; background: #F3F4F6; } [v-cloak] { display: none !important; } .sidebar-link.active { background: #4F46E5; color: white; } .sidebar-link:hover:not(.active) { background: #E5E7EB; } #map-admin { height: 600px; width: 100%; border-radius: 12px; } .cell-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; } .cell-box { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; } .cell-box:hover { transform: scale(1.05); z-index: 10; shadow: lg; } .cell-free { background: #DCFCE7; color: #166534; border-color: #BBF7D0; } .cell-booked { background: #FEE2E2; color: #991B1B; border-color: #FECACA; } .cell-maintenance { background: #F3F4F6; color: #6B7280; border-color: #E5E7EB; } .cell-selected { border-color: #4F46E5; ring: 2px; ring-color: #4F46E5; }</style></head><body><div id="app" v-cloak class="h-screen flex overflow-hidden">
<!-- LOGIN -->
<div v-if="!auth" class="fixed inset-0 bg-gray-900 flex items-center justify-center z-[100]"><div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4"><div class="flex justify-center mb-6 text-indigo-600 text-5xl"><i class="fas fa-cube"></i></div><h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Lock&Go Admin</h2><input v-model="loginPass" type="password" placeholder="Password (12345)" class="w-full p-4 border border-gray-300 rounded-xl mb-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-lg" @keyup.enter="doLogin"><button @click="doLogin" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition text-lg shadow-lg shadow-indigo-200">Войти в систему</button></div></div>
<!-- SIDEBAR -->
<aside v-if="auth" class="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex"><div class="h-16 flex items-center px-6 font-bold text-xl text-indigo-600 border-b border-gray-100"><i class="fas fa-cube mr-2"></i> Lock&Go <span class="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded ml-2">PRO</span></div><nav class="flex-1 p-4 space-y-1 overflow-y-auto"><a v-for="item in menu" :key="item.id" @click="setPage(item.id)" :class="{'active': page === item.id}" class="sidebar-link flex items-center px-4 py-3 rounded-lg text-gray-600 cursor-pointer transition font-medium"><i :class="item.icon" class="w-6"></i> {{ item.label }}</a></nav><div class="p-4 border-t border-gray-100"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">DP</div><div><div class="text-sm font-bold text-gray-900">Danila Ptitsyn</div><div class="text-xs text-gray-500">Super Admin</div></div></div></div></aside>
<!-- MAIN -->
<main v-if="auth" class="flex-1 flex flex-col overflow-hidden relative"><header class="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 md:hidden shrink-0"><div class="font-bold text-indigo-600"><i class="fas fa-cube"></i> Lock&Go</div><button @click="showMobileMenu = !showMobileMenu"><i class="fas fa-bars text-gray-600 text-xl"></i></button></header><div class="flex-1 overflow-y-auto p-6">
<!-- DASHBOARD -->
<div v-if="page === 'dashboard'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Обзор системы</h1><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Выручка</div><div class="text-3xl font-black text-gray-900">{{ stats.revenue }} ₽</div></div><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Активные</div><div class="text-3xl font-black text-indigo-600">{{ stats.active_rentals }}</div></div><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Инциденты</div><div class="text-3xl font-black" :class="stats.incidents>0?'text-red-600':'text-gray-900'">{{ stats.incidents }}</div></div><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Сегодня</div><div class="text-3xl font-black text-gray-900">{{ stats.bookings_today }}</div></div></div></div>
<!-- MAP -->
<div v-show="page === 'map'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Карта сети</h1><div id="map-admin" class="shadow-sm border border-gray-200"></div></div>
<!-- STATIONS LIST -->
<div v-if="page === 'devices'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Оборудование</h1><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div v-for="s in stations" :key="s.id" @click="openStationDetail(s.id)" class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-500 transition group"><div class="flex justify-between items-start mb-4"><div class="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl group-hover:bg-indigo-600 group-hover:text-white transition"><i class="fas fa-server"></i></div><div class="px-3 py-1 rounded-full text-xs font-bold" :class="s.error_msg ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'">{{ s.error_msg ? 'Ошибка' : 'Online' }}</div></div><h3 class="font-bold text-lg mb-1">{{ s.name }}</h3><p class="text-sm text-gray-500 mb-4">{{ s.address }}</p><div class="flex items-center gap-4 text-sm text-gray-500"><div class="flex items-center gap-2"><i class="fas fa-battery-three-quarters"></i> {{ s.battery_level || 100 }}%</div><div class="flex items-center gap-2"><i class="fas fa-wifi"></i> {{ s.wifi_signal || 100 }}%</div></div></div></div></div>
<!-- STATION DETAIL (DEEP DIVE) -->
<div v-if="page === 'station_detail' && activeStation"><div class="flex items-center gap-4 mb-6"><button @click="page='devices'" class="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-indigo-600"><i class="fas fa-arrow-left"></i></button><div><h1 class="text-2xl font-bold text-gray-900">{{ activeStation.station.name }}</h1><div class="text-sm text-gray-500">{{ activeStation.station.address }}</div></div><div class="ml-auto flex gap-3"><button @click="openAllCells(activeStation.station.id)" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-200"><i class="fas fa-radiation"></i> ОТКРЫТЬ ВСЕ ЯЧЕЙКИ</button></div></div>
<!-- SCREEN MANAGEMENT -->
<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6"><h3 class="font-bold text-lg mb-4">Управление экраном станции</h3><div class="flex gap-4"><div class="flex-1"><label class="text-xs text-gray-500 font-bold block mb-1">Тип контента</label><select v-model="activeStation.station.screen_mode" class="w-full p-2 border rounded-lg"><option value="image">Изображение (URL)</option><option value="video">Видео (URL)</option><option value="text">Текст</option></select></div><div class="flex-[3]"><label class="text-xs text-gray-500 font-bold block mb-1">Контент / Ссылка</label><input v-model="activeStation.station.screen_content" class="w-full p-2 border rounded-lg" placeholder="https://example.com/banner.jpg"></div><button @click="updateScreen(activeStation.station)" class="bg-indigo-600 text-white px-6 rounded-lg font-bold hover:bg-indigo-700">Сохранить</button></div></div>
<!-- GRID & TARIFFS -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class="lg:col-span-2"><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6"><h3 class="font-bold text-lg mb-4 flex items-center justify-between"><span>Ячейки ({{ activeStation.cells.length }})</span><span class="text-xs font-normal text-gray-400 flex gap-3"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-400"></span> Free</span><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400"></span> Booked</span></span></h3><div class="cell-grid"><div v-for="cell in activeStation.cells" :key="cell.id" class="cell-box relative" :class="{'cell-free': cell.status==='free', 'cell-booked': cell.status==='booked', 'cell-maintenance': cell.status==='maintenance'}" @click="selectCell(cell)"><div class="text-xs uppercase mb-1 opacity-50">{{ cell.size }}</div><div class="text-xl">{{ cell.cell_number }}</div><div v-if="cell.door_open" class="absolute top-1 right-1 text-red-500 text-[10px]"><i class="fas fa-lock-open"></i></div></div></div></div></div><div>
<!-- TARIFFS -->
<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6"><h3 class="font-bold text-lg mb-4">Тарифы</h3><div class="space-y-3"><div v-for="t in activeStation.tariffs" :key="t.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-white border flex items-center justify-center font-bold text-gray-700">{{ t.size }}</div><div class="text-xs text-gray-500">{{ t.description }}</div></div><input type="number" v-model="t.price_initial" @change="updateTariff(t)" class="w-20 p-1 text-right font-bold bg-white border rounded focus:ring-2 focus:ring-indigo-500 outline-none"></div></div></div>
<!-- HEALTH -->
<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 class="font-bold text-lg mb-4">Состояние</h3><div class="space-y-4"><div class="flex justify-between items-center"><span class="text-gray-500">Батарея</span><span class="font-bold text-green-600">{{ activeStation.health?.battery_level || 100 }}%</span></div><div class="flex justify-between items-center"><span class="text-gray-500">Wi-Fi Сигнал</span><span class="font-bold">{{ activeStation.health?.wifi_signal || -60 }} dBm</span></div><div class="flex justify-between items-center"><span class="text-gray-500">Последний пинг</span><span class="text-xs font-mono">{{ activeStation.health?.last_heartbeat || 'Never' }}</span></div></div></div></div></div></div>
<!-- LOGS -->
<div v-if="page === 'logs'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Журнал событий</h1><div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><table class="w-full text-sm text-left"><thead class="text-xs text-gray-400 uppercase bg-gray-50 border-b"><tr><th class="px-6 py-4">Время</th><th class="px-6 py-4">Станция</th><th class="px-6 py-4">Действие</th><th class="px-6 py-4">Детали</th></tr></thead><tbody><tr v-for="l in logs" :key="l.id" class="border-b hover:bg-gray-50"><td class="px-6 py-4 font-mono text-xs text-gray-500">{{ new Date(l.created_at).toLocaleString() }}</td><td class="px-6 py-4 font-bold">{{ l.station_name || '-' }}</td><td class="px-6 py-4"><span class="px-2 py-1 rounded bg-gray-100 text-xs font-bold uppercase">{{ l.action }}</span></td><td class="px-6 py-4 text-gray-600">{{ l.details }}</td></tr></tbody></table></div></div>
<!-- USERS -->
<div v-if="page === 'users'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Персонал и Клиенты</h1><div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><table class="w-full text-sm text-left"><thead class="text-xs text-gray-400 uppercase bg-gray-50 border-b"><tr><th class="px-6 py-4">Телефон</th><th class="px-6 py-4">Имя</th><th class="px-6 py-4">Роль</th><th class="px-6 py-4">LTV</th></tr></thead><tbody><tr v-for="u in users" :key="u.id" class="border-b"><td class="px-6 py-4 font-bold">{{u.phone}}</td><td class="px-6 py-4">{{u.name||'-'}}</td><td class="px-6 py-4"><select v-model="u.role" @change="updateRole(u)" class="p-1 bg-gray-50 border rounded text-xs font-bold uppercase" :class="{'text-indigo-600': u.role==='admin', 'text-green-600': u.role==='support'}"><option value="user">User</option><option value="support">Support</option><option value="admin">Admin</option></select></td><td class="px-6 py-4">{{u.ltv}} ₽</td></tr></tbody></table></div></div>
</div></main></div>
<!-- CELL MODAL -->
<div id="cell-modal" style="display: none;" :style="{ display: selectedCell ? 'flex' : 'none' }" class="fixed inset-0 bg-black/50 z-[60] items-center justify-center" @click.self="selectedCell=null">
    <div class="bg-white rounded-2xl p-6 w-96 shadow-2xl" v-if="selectedCell">
        <div class="flex justify-between items-center mb-6"><h3 class="text-xl font-bold">Ячейка {{ selectedCell.cell_number }}</h3><button @click="selectedCell=null" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button></div>
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 p-3 rounded-lg"><div class="text-xs text-gray-500 uppercase">Размер</div><div class="font-bold text-lg">{{ selectedCell.size }}</div></div>
            <div class="bg-gray-50 p-3 rounded-lg"><div class="text-xs text-gray-500 uppercase">Статус</div><div class="font-bold text-lg capitalize" :class="{'text-green-600': selectedCell.status==='free', 'text-red-600': selectedCell.status==='booked'}">{{ selectedCell.status }}</div></div>
        </div>
        <button @click="remoteOpen(selectedCell.id)" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mb-3 hover:bg-indigo-700"><i class="fas fa-lock-open mr-2"></i> Открыть удаленно</button>
        
        <div class="flex gap-2 mb-3">
            <button v-if="selectedCell.status !== 'maintenance'" @click="changeStatus(selectedCell.id, 'maintenance')" class="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-200 text-xs uppercase">Заблокировать</button>
            <button v-if="selectedCell.status === 'maintenance'" @click="changeStatus(selectedCell.id, 'free')" class="flex-1 bg-green-100 text-green-600 font-bold py-2 rounded-lg hover:bg-green-200 text-xs uppercase">Разблокировать</button>
        </div>

        <!-- History Section -->
        <div class="mt-4">
            <div class="text-xs font-bold text-gray-400 uppercase mb-2">История событий</div>
            <div v-if="!cellHistory || cellHistory.length === 0" class="text-sm text-gray-400 text-center py-2">Нет записей</div>
            <div v-else class="space-y-2 max-h-32 overflow-y-auto">
                <div v-for="h in cellHistory" :key="h.created_at" class="text-xs border-b pb-1">
                    <div class="flex justify-between"><span class="font-bold">{{ h.action }}</span><span class="text-gray-500">{{ new Date(h.created_at).toLocaleTimeString() }}</span></div>
                    <div class="text-gray-500 truncate">{{ h.details }}</div>
                </div>
            </div>
        </div>
    </div>
</div>
<script>const {createApp,ref,onMounted,watch,nextTick}=Vue;createApp({setup(){const auth=ref(false);const loginPass=ref('');const page=ref('dashboard');const stats=ref({});const stations=ref([]);const users=ref([]);const logs=ref([]);const activeStation=ref(null);const selectedCell=ref(null);const cellHistory=ref([]);const map=ref(null);const menu=[{id:'dashboard',label:'Главная',icon:'fas fa-home'},{id:'map',label:'Карта',icon:'fas fa-map'},{id:'devices',label:'Устройства',icon:'fas fa-server'},{id:'users',label:'Персонал',icon:'fas fa-users'},{id:'logs',label:'Логи',icon:'fas fa-list-ul'}];
const doLogin=()=>{if(loginPass.value==='12345'){auth.value=true;fetchData();}};
const fetchData=async()=>{try{const [s,st,u,l]=await Promise.all([fetch('/api/admin/dashboard'),fetch('/api/admin/stations'),fetch('/api/admin/users'),fetch('/api/admin/logs')]);if(s.ok)stats.value=await s.json();if(st.ok){stations.value=await st.json();updateMap();}if(u.ok)users.value=await u.json();if(l.ok)logs.value=await l.json();}catch(e){console.error('Fetch error',e)}};
const setPage=(p)=>{page.value=p;if(p==='map'){nextTick(()=>initMap())}else if(p==='logs'){fetchData()}};
const initMap=()=>{if(map.value)return;const el=document.getElementById('map-admin');if(!el)return;map.value=L.map('map-admin').setView([59.9343, 30.3351], 11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map.value);updateMap();};
const updateMap=()=>{if(!map.value || !stations.value.length)return;stations.value.forEach(s=>{if(s.lat && s.lng){L.marker([s.lat, s.lng]).addTo(map.value).bindPopup('<b>'+s.name+'</b><br>'+s.address).on('click', ()=>openStationDetail(s.id))}})};
const openStationDetail=async(id)=>{const res=await fetch('/api/admin/station/'+id+'/details');if(res.ok){activeStation.value=await res.json();page.value='station_detail'}};
const selectCell=async(cell)=>{
    selectedCell.value=cell;
    cellHistory.value=[];
    const res = await fetch('/api/admin/cell/'+cell.id+'/history');
    if(res.ok) cellHistory.value = await res.json();
};
const changeStatus=async(id, status)=>{
    if(!confirm('Изменить статус ячейки на '+status+'?')) return;
    await fetch('/api/admin/cell/status',{method:'POST',body:JSON.stringify({cellId:id, status})});
    alert('Статус изменен');
    selectedCell.value.status = status; // Optimistic update
    openStationDetail(activeStation.value.station.id);
};
const remoteOpen=async(id)=>{if(!confirm('Открыть ячейку удаленно? Это действие будет записано в лог.'))return;await fetch('/api/admin/cell/open',{method:'POST',body:JSON.stringify({cellId:id})});alert('Команда отправлена');selectedCell.value=null;openStationDetail(activeStation.value.station.id);};
const openAllCells=async(sid)=>{const code=prompt('ВВЕДИТЕ "CONFIRM" ЧТОБЫ ОТКРЫТЬ ВСЕ ЯЧЕЙКИ. ЭТО ЭКСТРЕННОЕ ДЕЙСТВИЕ!');if(code!=='CONFIRM')return;await fetch('/api/admin/station/'+sid+'/open-all',{method:'POST'});alert('Команда массового открытия отправлена!');openStationDetail(sid)};
const updateTariff=async(t)=>{await fetch('/api/admin/tariffs',{method:'POST',body:JSON.stringify({id:t.id,price:t.price_initial})});};
const updateRole=async(u)=>{await fetch('/api/admin/users/role',{method:'POST',body:JSON.stringify({userId:u.id,role:u.role})});alert('Роль обновлена')};
const updateScreen=async(s)=>{await fetch('/api/admin/station/'+s.id+'/screen',{method:'POST',body:JSON.stringify({content:s.screen_content,mode:s.screen_mode})});alert('Экран обновлен')};
setInterval(()=>{if(auth.value && page.value==='dashboard')fetchData()},5000);return{auth,loginPass,doLogin,page,menu,stats,stations,users,logs,activeStation,selectedCell,cellHistory,setPage,openStationDetail,selectCell,remoteOpen,openAllCells,updateTariff,updateRole,updateScreen,changeStatus}}}).mount('#app');</script></body></html>`


const userHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Lock&Go</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        body{font-family:'Inter',sans-serif;}
        .brand-gradient{background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);}
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        #map-user { width: 100%; height: 100%; border-radius: 16px; }
    </style>
</head>
<body class="bg-gray-50 h-screen flex flex-col overflow-hidden text-gray-900">
    <div id="app" class="flex-1 flex flex-col h-full relative"></div>

    <!-- AUTH MODAL MOS.RU STYLE -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onclick="closeAuth()">
        <div class="bg-white w-full max-w-sm sm:rounded-2xl rounded-t-3xl p-6 shadow-2xl relative transform transition-transform duration-300 translate-y-full" id="auth-panel" onclick="event.stopPropagation()">
            <div class="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 sm:hidden"></div>
            <h2 class="text-2xl font-bold text-center mb-6">Вход</h2>
            <div class="space-y-3">
                <button onclick="loginWith('mos')" class="w-full h-12 bg-[#d9181f] hover:bg-[#b8141a] rounded-lg font-bold text-white flex items-center justify-center gap-3 transition relative overflow-hidden">
                    <div class="absolute left-4 bg-white text-[#d9181f] w-6 h-6 rounded flex items-center justify-center font-serif font-bold text-sm">M</div>
                    <span>Войти через Mos.ru</span>
                </button>
                <button onclick="loginWith('gos')" class="w-full h-12 bg-[#0065b1] hover:bg-[#005494] rounded-lg font-bold text-white flex items-center justify-center gap-3 transition relative overflow-hidden">
                    <div class="absolute left-4 text-white text-xs font-bold border border-white rounded px-1">ГУ</div>
                    <span>Госуслуги</span>
                </button>
                <div class="grid grid-cols-3 gap-3 pt-2">
                    <button onclick="loginWith('sber')" class="h-12 bg-[#21a038] hover:bg-[#1b872f] rounded-lg font-bold text-white flex items-center justify-center transition"><span class="font-bold tracking-tighter text-sm">Sber ID</span></button>
                    <button onclick="loginWith('ya')" class="h-12 bg-[#fc3f1d] hover:bg-[#e03214] rounded-lg font-bold text-white flex items-center justify-center transition"><span class="font-bold text-sm">Ya ID</span></button>
                    <button onclick="loginWith('vk')" class="h-12 bg-[#0077ff] hover:bg-[#0066db] rounded-lg font-bold text-white flex items-center justify-center transition"><span class="font-bold text-sm">VK ID</span></button>
                </div>
            </div>
            <div class="mt-6 text-center text-xs text-gray-400">Продолжая, вы соглашаетесь с <button onclick="toggleRules(true)" class="underline hover:text-gray-600">правилами сервиса</button></div>
        </div>
    </div>

    <!-- TERMS OF SERVICE MODAL -->
    <div id="rules-modal" class="fixed inset-0 z-[60] hidden items-center justify-center bg-white sm:bg-black/50" onclick="toggleRules(false)">
        <div class="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl p-6 shadow-2xl relative flex flex-col" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-4 shrink-0"><h2 class="text-xl font-bold">Правила сервиса Lock&Go</h2><button onclick="toggleRules(false)" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i class="fas fa-times"></i></button></div>
            <div class="flex-1 overflow-y-auto text-sm text-gray-600 space-y-4 pr-2 leading-relaxed"><p><strong>1. Общие положения</strong><br>Настоящие правила регулируют отношения между сервисом Lock&Go и пользователем.</p><p><strong>2. Запрещенные предметы</strong><br>В ячейках хранения ЗАПРЕЩАЕТСЯ хранить взрывчатые вещества, оружие, наркотики.</p><p><strong>3. Ответственность</strong><br>Исполнитель не несет ответственности за ценные вещи.</p><button onclick="toggleRules(false)" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-6 shrink-0">Я ознакомился</button></div>
        </div>
    </div>

    <script>
        const state={view:'home',data:{},activePromo:null,userPhone:'',stations:[], bookings: []};
        
        const HomeView=()=>\`
            <div class="flex flex-col h-full">
                <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
                    <div class="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tighter"><i class="fas fa-cube"></i> Lock&Go</div>
                    <div class="flex gap-3">
                         <button onclick="navigate('my_rentals')" class="relative text-gray-500 hover:text-indigo-600 transition">
                            <i class="fas fa-key text-xl"></i>
                            \${state.bookings.length > 0 ? \`<span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">\${state.bookings.length}</span>\` : ''}
                         </button>
                         <button onclick="window.location.href='/admin'" class="text-gray-300 hover:text-indigo-600"><i class="fas fa-cog"></i></button>
                    </div>
                </div>
                <div class="p-4 flex-1 flex flex-col overflow-hidden">
                    <div class="brand-gradient rounded-2xl p-6 text-white shadow-lg cursor-pointer mb-4 shrink-0" onclick="alert('Сканирование QR...')">
                        <h2 class="font-bold text-2xl mb-1">Свободные руки</h2>
                        <p class="opacity-90 text-sm mb-4">Инфраструктура вашей свободы</p>
                        <button class="bg-white text-indigo-700 px-4 py-2 rounded-lg text-xs font-bold shadow-md uppercase">Как это работает?</button>
                    </div>
                    <div class="flex gap-2 mb-4 border-b border-gray-100 pb-2">
                        <button onclick="toggleMap(false)" id="btn-list" class="flex-1 py-2 text-center font-bold text-indigo-600 border-b-2 border-indigo-600">Список</button>
                        <button onclick="toggleMap(true)" id="btn-map" class="flex-1 py-2 text-center font-bold text-gray-400 hover:text-indigo-500">На карте</button>
                    </div>
                    <div id="content-area" class="flex-1 overflow-y-auto relative">
                        <div id="stations-list" class="space-y-3 pb-20"></div>
                        <div id="map-view" class="hidden h-full w-full"><div id="map-user"></div></div>
                    </div>
                </div>
            </div>\`;

        const MyRentalsView=()=>\`
             <div class="flex flex-col h-full bg-gray-50">
                <div class="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
                    <h1 class="font-bold text-xl">Мои аренды</h1>
                    <button onclick="navigate('home')" class="text-indigo-600 font-bold text-sm"><i class="fas fa-plus"></i> Еще</button>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-6">
                    \${state.bookings.length === 0 ? 
                        \`<div class="text-center text-gray-400 mt-20"><i class="fas fa-box-open text-6xl mb-4 opacity-30"></i><p>У вас нет активных аренд</p><button onclick="navigate('home')" class="mt-4 text-indigo-600 font-bold">Найти ячейку</button></div>\` 
                        : state.bookings.map((b, idx) => \`
                        <div class="bg-white rounded-2xl shadow-lg overflow-hidden relative">
                             <div class="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                             <div class="p-5">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 class="font-bold text-lg text-gray-900">\${b.station_name}</h3>
                                        <p class="text-xs text-gray-500">\${b.address}</p>
                                    </div>
                                    <div class="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-black text-xl">\${b.cell_number}</div>
                                </div>
                                
                                <div class="flex justify-center py-4 bg-gray-50 rounded-xl mb-4 border border-gray-100 relative group">
                                     <div id="qr-\${b.id}" class="p-2 bg-white rounded-lg shadow-sm"></div>
                                     <div class="absolute bottom-1 text-[10px] text-gray-400 uppercase font-bold">Код доступа</div>
                                </div>

                                <div class="flex gap-3">
                                    <button onclick="userRemoteOpen('\${b.accessCode}')" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md shadow-indigo-200 active:scale-[0.98] transition flex items-center justify-center gap-2">
                                        <i class="fas fa-unlock"></i> Открыть
                                    </button>
                                </div>
                                <div class="mt-3 text-center">
                                     <p class="text-[10px] text-gray-400 uppercase font-bold">Действует до: \${new Date(b.validUntil).toLocaleString()}</p>
                                     <p class="text-[10px] text-green-600 font-bold">Вы можете открывать ячейку многократно</p>
                                </div>
                             </div>
                        </div>
                    \`).join('')}
                </div>
                 <div class="p-4 bg-white border-t">
                    <button onclick="navigate('home')" class="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700">Вернуться на главную</button>
                </div>
             </div>
        \`;

        // Old SuccessView removed, replaced by MyRentalsView logic

        const BookingView=(station)=>\`
            <div class="flex flex-col h-full bg-white">
                <div class="px-4 py-4 border-b flex items-center sticky top-0 bg-white z-10">
                    <button onclick="navigate('home')" class="mr-4 text-gray-600"><i class="fas fa-arrow-left"></i></button>
                    <h1 class="font-bold text-lg">\${station.name}</h1>
                </div>
                <div class="flex-1 overflow-y-auto p-5">
                    <div class="mb-4 text-gray-600 text-sm flex items-start gap-2"><i class="fas fa-map-pin text-indigo-500 mt-1"></i> \${station.address}</div>
                    <div class="bg-indigo-50 p-4 rounded-xl mb-6 border border-indigo-100 cursor-pointer active:bg-indigo-100 transition" onclick="openAuth()">
                        <div class="flex justify-between items-center"><div><div class="text-xs text-indigo-400 font-bold uppercase tracking-wider">Аккаунт</div><div class="font-bold text-indigo-900 text-lg">\${state.userPhone||'Войти в профиль'}</div></div><div class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm"><i class="fas \${state.userPhone ? 'fa-user-check' : 'fa-sign-in-alt'}"></i></div></div>
                    </div>
                    <h3 class="font-bold mb-3 text-lg">Выберите размер</h3>
                    <div id="tariffs-list" class="space-y-3 mb-6"></div>
                    <button onclick="processBooking(\${station.id})" class="w-full brand-gradient text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg"><span>Оплатить</span> <i class="fas fa-chevron-right text-sm opacity-70"></i></button>
                </div>
            </div>\`;


        let mapInstance = null;

        async function navigate(view,params=null){
            state.view=view;
            const app=document.getElementById('app');
            
            // Always refresh bookings count
            if(state.userPhone) await fetchUserBookings();

            if(view==='home'){ app.innerHTML=HomeView(); loadStations(); }
            else if(view==='booking'){ app.innerHTML=BookingView(params); loadTariffs(params.id); if(!state.userPhone) setTimeout(openAuth, 500); }
            else if(view==='my_rentals'){ 
                app.innerHTML=MyRentalsView();
                setTimeout(() => {
                    state.bookings.forEach(b => {
                        const el = document.getElementById('qr-'+b.id);
                        if(el) {
                            el.innerHTML = '';
                            new QRCode(el, {
                                text: b.accessCode,
                                width: 128,
                                height: 128,
                                colorDark : "#000000",
                                colorLight : "#ffffff",
                                correctLevel : QRCode.CorrectLevel.H
                            });
                        }
                    });
                }, 100);
            }
        }

        async function fetchUserBookings(){
            if(!state.userPhone) return;
            try {
                const res = await fetch('/api/user/bookings?phone='+encodeURIComponent(state.userPhone));
                if(res.ok) state.bookings = await res.json();
            } catch(e) { console.error(e); }
        }

        async function userRemoteOpen(code) {
            if(!confirm('Вы уверены, что находитесь рядом с ячейкой?')) return;
            const btn = event.target.closest('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Открываем...';
            
            try {
                const res = await fetch('/api/user/open', {
                    method: 'POST',
                    body: JSON.stringify({ accessCode: code })
                });
                const data = await res.json();
                if(data.success) {
                    btn.classList.remove('text-indigo-600', 'bg-white');
                    btn.classList.add('bg-green-500', 'text-white');
                    btn.innerHTML = '<i class="fas fa-check"></i> Открыто!';
                    alert('Ячейка должна открыться в течение 5 секунд!');
                } else {
                    alert('Ошибка: ' + data.error);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            } catch(e) {
                alert('Ошибка соединения');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }

        async function loadStations(){
            const res=await fetch('/api/locations');
            const data=await res.json();
            state.stations=data;
            renderStationList(data);
        }
        
        function renderStationList(data){
             document.getElementById('stations-list').innerHTML=data.map(s=>\`
                <div onclick='openBooking(\${s.id})' class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition">
                    <div class="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-2xl shrink-0"><i class="fas fa-box"></i></div>
                    <div><h3 class="font-bold text-gray-900 leading-tight mb-1">\${s.name}</h3><p class="text-xs text-gray-500">\${s.address}</p></div>
                </div>\`).join('');
        }

        function toggleMap(show){
            const list = document.getElementById('stations-list');
            const mapView = document.getElementById('map-view');
            const btnList = document.getElementById('btn-list');
            const btnMap = document.getElementById('btn-map');
            
            if(show){
                list.classList.add('hidden');
                mapView.classList.remove('hidden');
                btnList.classList.replace('text-indigo-600', 'text-gray-400');
                btnList.classList.remove('border-b-2');
                btnMap.classList.replace('text-gray-400', 'text-indigo-600');
                btnMap.classList.add('border-b-2', 'border-indigo-600');
                initUserMap();
            } else {
                list.classList.remove('hidden');
                mapView.classList.add('hidden');
                btnMap.classList.replace('text-indigo-600', 'text-gray-400');
                btnMap.classList.remove('border-b-2');
                btnList.classList.replace('text-gray-400', 'text-indigo-600');
                btnList.classList.add('border-b-2', 'border-indigo-600');
            }
        }

        function initUserMap(){
            if(mapInstance) { mapInstance.invalidateSize(); return; }
            const el = document.getElementById('map-user');
            if(!el) return;
            mapInstance = L.map('map-user').setView([59.9343, 30.3351], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
            
            state.stations.forEach(s => {
                if(s.lat && s.lng){
                     L.marker([s.lat, s.lng]).addTo(mapInstance)
                      .bindPopup(\`<b>\${s.name}</b><br>\${s.address}<br><button onclick="openBooking(\${s.id})" class="mt-2 bg-indigo-600 text-white px-3 py-1 rounded text-xs">Выбрать</button>\`);
                }
            });
        }

        async function openBooking(id){
            const res=await fetch('/api/location/'+id);
            state.activeStationData=await res.json();
            navigate('booking',state.activeStationData.station);
        }

        async function loadTariffs(sid){
            const{tariffs}=state.activeStationData;
            document.getElementById('tariffs-list').innerHTML=tariffs.map(t=>\`
                <label class="block relative group cursor-pointer">
                    <input type="radio" name="tariff" value="\${t.size}" class="peer sr-only">
                    <div class="p-4 rounded-xl border-2 border-gray-100 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 transition flex justify-between items-center hover:border-gray-200">
                        <div class="flex items-center gap-4"><div class="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-black text-xl text-gray-700 shadow-sm">\${t.size}</div><div class="text-sm font-medium text-gray-600">\${t.description}</div></div>
                        <div class="font-black text-lg">\${t.price_initial} ₽</div>
                    </div>
                </label>\`).join('');
        }

        function openAuth() { document.getElementById('auth-modal').classList.remove('hidden'); document.getElementById('auth-modal').classList.add('flex'); setTimeout(() => document.getElementById('auth-panel').classList.remove('translate-y-full'), 10); }
        function closeAuth() { document.getElementById('auth-panel').classList.add('translate-y-full'); setTimeout(() => { document.getElementById('auth-modal').classList.add('hidden'); document.getElementById('auth-modal').classList.remove('flex'); }, 300); }
        function loginWith(provider) { state.userPhone = '+7 (999) 000-00-01'; closeAuth(); fetchUserBookings(); if(state.view === 'booking') navigate('booking', state.activeStationData.station); }
        function toggleRules(show) { const m = document.getElementById('rules-modal'); if(show) { m.classList.remove('hidden'); m.classList.add('flex'); } else { m.classList.add('hidden'); m.classList.remove('flex'); } }
        async function processBooking(stationId){
            if(!state.userPhone){ openAuth(); return; }
            const sizeInput=document.querySelector('input[name="tariff"]:checked');
            if(!sizeInput) return alert('Пожалуйста, выберите размер ячейки');
            const res=await fetch('/api/book',{method:'POST',body:JSON.stringify({stationId,size:sizeInput.value,phone:state.userPhone})});
            const result=await res.json();
            if(result.success) {
                await fetchUserBookings();
                navigate('my_rentals');
            }
            else alert(result.error);
        }

        navigate('home');
    </script>
</body>
</html>`

app.get('/admin', (c) => c.html(adminHtml))
app.get('/', (c) => c.html(userHtml))

export default app