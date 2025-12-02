import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'

interface Env { DB: D1Database }
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// --- API ---

app.get('/api/locations', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM stations').all()
  return c.json(results)
})

app.get('/api/location/:id', async (c) => {
  const id = c.req.param('id')
  const station: any = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first()
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
  
  // CRM LOGIC: Check User
  if (phone) {
      let user: any = await c.env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first()
      
      // Если пользователя нет - создаем
      if (!user) {
          await c.env.DB.prepare("INSERT INTO users (phone) VALUES (?)").bind(phone).run()
          user = await c.env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first()
      }

      // Проверка на черный список
      if (user.is_blocked) {
          return c.json({ success: false, error: 'Ваш аккаунт заблокирован. Обратитесь в поддержку.' }, 403)
      }
  }

  // Promo logic
  let discount = 0;
  if (promoCode) {
     const promo: any = await c.env.DB.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").bind(promoCode).first()
     if (promo) {
         discount = promo.discount_percent;
         await c.env.DB.prepare("UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?").bind(promo.id).run()
     }
  }

  const cell: any = await c.env.DB.prepare(
    "SELECT * FROM cells WHERE station_id = ? AND size = ? AND status = 'free' LIMIT 1"
  ).bind(stationId, size).first()

  if (!cell) return c.json({ error: 'Нет свободных ячеек' }, 400)

  // Update Cell
  await c.env.DB.prepare("UPDATE cells SET status = 'booked' WHERE id = ?").bind(cell.id).run()

  // Update CRM LTV (Mock price calculation)
  if (phone) {
      const estimatedPrice = Math.max(100 * (1 - discount/100), 0);
      await c.env.DB.prepare("UPDATE users SET ltv = ltv + ?, last_booking = CURRENT_TIMESTAMP WHERE phone = ?").bind(estimatedPrice, phone).run()
  }

  const logDetail = `Booking: ${size} | Phone: ${phone} | Promo: ${promoCode || 'None'}`
  await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'booking', ?)").bind(stationId, logDetail).run()

  return c.json({ 
    success: true, 
    cellNumber: cell.cell_number, 
    accessCode: Math.floor(100000 + Math.random() * 900000),
    validUntil: new Date(Date.now() + 24*60*60*1000).toISOString()
  })
})

// --- ADMIN API ---
app.get('/api/admin/dashboard', async (c) => {
  const stats = {
    revenue: (await c.env.DB.prepare('SELECT sum(ltv) as s FROM users').first('s')) || 0, 
    stations_online: await c.env.DB.prepare('SELECT count(*) as c FROM stations').first('c'),
    cells_occupied: await c.env.DB.prepare("SELECT count(*) as c FROM cells WHERE status != 'free'").first('c'),
    incidents: await c.env.DB.prepare("SELECT count(*) as c FROM station_health WHERE error_msg IS NOT NULL AND error_msg != ''").first('c')
  }
  return c.json(stats)
})

app.get('/api/admin/monitoring', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT s.id, s.name, s.address, s.lat, s.lng,
           h.battery_level, h.wifi_signal, h.last_heartbeat, h.error_msg
    FROM stations s
    LEFT JOIN station_health h ON s.id = h.station_id
  `).all()
  return c.json(results)
})

app.get('/api/admin/users', async (c) => {
    const { results } = await c.env.DB.prepare("SELECT * FROM users ORDER BY last_booking DESC LIMIT 50").all()
    return c.json(results)
})

app.post('/api/admin/user/block', async (c) => {
    const { id, block } = await c.req.json()
    await c.env.DB.prepare("UPDATE users SET is_blocked = ? WHERE id = ?").bind(block ? 1 : 0, id).run()
    return c.json({ success: true })
})

// Re-export previous endpoints
app.get('/api/admin/cells_live', async (c) => { const { results } = await c.env.DB.prepare(`SELECT c.id, c.cell_number, c.size, c.status, c.door_open, s.name as station_name FROM cells c JOIN stations s ON c.station_id = s.id ORDER BY s.name, c.cell_number`).all(); return c.json(results) })
app.get('/api/admin/tariffs', async (c) => { const { results } = await c.env.DB.prepare(`SELECT t.*, s.name as station_name FROM tariffs t JOIN stations s ON t.station_id = s.id ORDER BY s.name`).all(); return c.json(results) })
app.post('/api/admin/tariff/update', async (c) => { const { id, price } = await c.req.json(); await c.env.DB.prepare("UPDATE tariffs SET price_initial = ? WHERE id = ?").bind(price, id).run(); return c.json({ success: true }) })
app.get('/api/admin/promos', async (c) => { const { results } = await c.env.DB.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all(); return c.json(results) })
app.post('/api/admin/promo/create', async (c) => { const { code, discount } = await c.req.json(); try { await c.env.DB.prepare("INSERT INTO promo_codes (code, discount_percent) VALUES (?, ?)").bind(code, discount).run(); return c.json({ success: true }) } catch(e) { return c.json({ error: 'Err' }, 400) } })
app.post('/api/admin/promo/delete', async (c) => { const { id } = await c.req.json(); await c.env.DB.prepare("DELETE FROM promo_codes WHERE id = ?").bind(id).run(); return c.json({ success: true }) })
app.post('/api/admin/command', async (c) => { const { cellId, cmd } = await c.req.json(); if (cmd === 'open') { await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(cellId).run(); await c.env.DB.prepare("INSERT INTO logs (action, details) VALUES ('admin_cmd', ?)").bind(`Force OPEN cell ${cellId}`).run() } return c.json({ success: true }) })
app.get('/api/admin/logs', async (c) => { const { results } = await c.env.DB.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100').all(); return c.json(results) })
app.post('/api/hardware/heartbeat', async (c) => { const { stationId, battery, wifi, error } = await c.req.json(); await c.env.DB.prepare(`INSERT INTO station_health (station_id, battery_level, wifi_signal, last_heartbeat, error_msg) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?) ON CONFLICT(station_id) DO UPDATE SET battery_level = excluded.battery_level, wifi_signal = excluded.wifi_signal, last_heartbeat = CURRENT_TIMESTAMP, error_msg = excluded.error_msg`).bind(stationId, battery, wifi, error).run(); if (error) { await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'ALARM', ?)").bind(stationId, `Hardware Error: ${error}`).run() } return c.json({ command: 'sync_ok' }) })


// --- Frontend ---
app.get('*', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Lock&Go</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <!-- Leaflet Map -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .brand-gradient { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-gray-50 h-screen flex flex-col overflow-hidden text-gray-900">
    <div id="app" class="flex-1 flex flex-col h-full relative"></div>
    <script>
        const state = { view: 'home', data: {}, activePromo: null, userPhone: '' };

        // --- Components ---
        const HomeView = () => \`
            <div class="flex flex-col h-full">
                <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
                    <div class="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tighter"><i class="fas fa-cube"></i> Lock&Go</div>
                    <button onclick="navigate('admin_login')" class="text-gray-300 hover:text-indigo-600"><i class="fas fa-cog"></i></button>
                </div>
                <div class="p-4 space-y-4 overflow-y-auto flex-1 pb-20">
                    <div class="brand-gradient rounded-2xl p-6 text-white shadow-lg"><h2 class="font-bold text-2xl mb-1">Свободные руки</h2><p class="opacity-90 text-sm">Инфраструктура вашей свободы</p></div>
                    <div id="stations-list" class="space-y-3"><div class="text-center py-8 text-gray-400"><i class="fas fa-circle-notch fa-spin"></i> Загрузка...</div></div>
                </div>
            </div>
        \`;

        const BookingView = (station) => \`
            <div class="flex flex-col h-full bg-white">
                <div class="px-4 py-4 border-b flex items-center sticky top-0 bg-white z-10">
                    <button onclick="navigate('home')" class="mr-4 text-gray-600"><i class="fas fa-arrow-left"></i></button>
                    <h1 class="font-bold text-lg truncate">\${station.name}</h1>
                </div>
                <div class="flex-1 overflow-y-auto p-5">
                    <div class="mb-4 flex items-start gap-3 text-gray-600"><i class="fas fa-map-pin mt-1 text-indigo-500"></i><span class="text-sm">\${station.address}</span></div>
                    <h3 class="font-bold mb-3">1. Ваш номер (для доступа)</h3>
                    <input type="tel" id="userPhone" value="\${state.userPhone}" placeholder="+7 (999) 000-00-00" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 mb-6 font-mono">
                    
                    <h3 class="font-bold mb-3">2. Размер ячейки</h3>
                    <div id="tariffs-list" class="space-y-3 mb-6">Loading...</div>

                    <h3 class="font-bold mb-3">3. Промокод</h3>
                    <div class="flex gap-2 mb-6"><input type="text" id="promoInput" placeholder="CODE" class="flex-1 p-2 bg-white rounded border uppercase"><button onclick="checkPromo()" class="bg-gray-900 text-white px-4 rounded text-sm">OK</button></div>
                    <div id="promoStatus" class="text-xs font-bold hidden mb-4"></div>
                </div>
                <div class="p-4 border-t">
                    <div class="flex justify-between items-center mb-4"><span class="text-gray-500 text-sm">Итого:</span><div class="text-right"><span class="text-xl font-black text-gray-900" id="total-price">--</span><div id="discount-label" class="text-xs text-green-600 font-bold hidden"></div></div></div>
                    <button onclick="processBooking(\${station.id})" class="w-full brand-gradient text-white font-bold py-4 rounded-xl shadow-lg flex justify-between px-6"><span>Оплатить и открыть</span><i class="fas fa-chevron-right mt-1"></i></button>
                </div>
            </div>
        \`;

        const SuccessView = (data) => \`<div class="flex flex-col h-full brand-gradient text-white p-8 items-center justify-center text-center"><div class="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-4xl mb-8"><i class="fas fa-unlock-alt"></i></div><h1 class="text-3xl font-bold mb-2">Открыто!</h1><div class="bg-white text-gray-900 rounded-2xl p-6 w-full shadow-2xl mb-4"><div class="text-6xl font-black text-indigo-600">\${data.cellNumber}</div><div class="text-gray-400 text-xs uppercase font-bold">Код: \${data.accessCode}</div></div><button onclick="navigate('home')" class="mt-auto w-full py-4 text-white/70">На главную</button></div>\`;

        const AdminView = () => \`
            <div class="flex h-full bg-gray-100 font-sans">
                <div class="w-64 bg-gray-900 text-gray-400 hidden md:flex flex-col">
                    <div class="p-6 text-white font-bold text-xl tracking-wider border-b border-gray-800">LOCK&GO <span class="text-xs text-indigo-500 block">ADMIN</span></div>
                    <nav class="flex-1 p-4 space-y-1">
                        <a href="#" onclick="renderAdminTab('dash')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-chart-pie"></i> Дашборд</a>
                        <a href="#" onclick="renderAdminTab('map')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition text-white bg-gray-800/50"><i class="fas fa-map text-green-500"></i> Карта сети</a>
                        <a href="#" onclick="renderAdminTab('clients')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-users text-blue-400"></i> Клиенты (CRM)</a>
                        <a href="#" onclick="renderAdminTab('monitoring')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-heartbeat text-red-500"></i> Мониторинг</a>
                        <a href="#" onclick="renderAdminTab('cells')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-th-large"></i> Ячейки</a>
                        <a href="#" onclick="renderAdminTab('tariffs')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-tag"></i> Тарифы</a>
                    </nav>
                    <div class="p-4 border-t border-gray-800"><button onclick="navigate('home')" class="text-sm hover:text-white">Выход</button></div>
                </div>
                <div class="flex-1 flex flex-col overflow-hidden">
                    <header class="bg-white shadow-sm py-4 px-6 flex justify-between items-center"><h2 class="font-bold text-gray-800 text-lg">Админ-панель</h2></header>
                    <div class="flex-1 overflow-y-auto p-6" id="admin-content"></div>
                </div>
            </div>
        \`;

        // --- Logic ---
        async function navigate(view, params = null) {
            state.view = view; state.activePromo = null;
            const app = document.getElementById('app');
            if (view === 'home') { app.innerHTML = HomeView(); loadStations(); }
            else if (view === 'booking') { app.innerHTML = BookingView(params); loadTariffs(params.id); }
            else if (view === 'success') { app.innerHTML = SuccessView(params); }
            else if (view === 'admin_login') { if (prompt("Пароль:") === '12345') navigate('admin'); }
            else if (view === 'admin') { app.innerHTML = AdminView(); renderAdminTab('dash'); }
        }

        async function loadStations() {
            const res = await fetch('/api/locations'); const data = await res.json();
            document.getElementById('stations-list').innerHTML = data.map(s => \`<div onclick='navigate("booking", \${JSON.stringify(s)})' class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition"><div class="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-2xl"><i class="fas fa-box"></i></div><div class="flex-1"><h3 class="font-bold text-gray-900">\${s.name}</h3><p class="text-xs text-gray-500">\${s.address}</p></div></div>\`).join('');
        }
        async function loadTariffs(stationId) {
            const res = await fetch('/api/location/' + stationId); const { tariffs } = await res.json(); state.currentTariffs = tariffs;
            document.getElementById('tariffs-list').innerHTML = tariffs.map(t => \`<label class="block relative group"><input type="radio" name="tariff" value="\${t.size}" class="peer sr-only" onchange="updateTotal()"><div class="p-4 rounded-xl border-2 border-gray-100 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 transition flex justify-between items-center"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700">\${t.size}</div><div class="text-sm font-bold text-gray-900">\${t.description}</div></div><div class="font-bold">\${t.price_initial} ₽</div></div></label>\`).join('');
        }
        async function checkPromo() {
            const code = document.getElementById('promoInput').value.toUpperCase();
            const res = await fetch('/api/check-promo', { method: 'POST', body: JSON.stringify({code}) });
            const data = await res.json();
            const s = document.getElementById('promoStatus'); s.classList.remove('hidden','text-green-600','text-red-600');
            if(data.valid) { state.activePromo = data; s.innerText = '✅ OK -'+data.discount+'%'; s.classList.add('text-green-600'); updateTotal(); }
            else { state.activePromo = null; s.innerText = '❌ Error'; s.classList.add('text-red-600'); updateTotal(); }
        }
        function updateTotal() {
            const sizeInput = document.querySelector('input[name="tariff"]:checked'); if(!sizeInput) return;
            const tariff = state.currentTariffs.find(t => t.size === sizeInput.value);
            let price = state.activePromo ? Math.round(tariff.price_initial * (1 - state.activePromo.discount / 100)) : tariff.price_initial;
            document.getElementById('total-price').innerText = price + ' ₽';
            const dl = document.getElementById('discount-label');
            if(state.activePromo) { dl.innerText = '-'+state.activePromo.discount+'%'; dl.classList.remove('hidden'); } else dl.classList.add('hidden');
        }
        async function processBooking(stationId) {
            const sizeInput = document.querySelector('input[name="tariff"]:checked'); if(!sizeInput) return alert('Выберите размер');
            const phone = document.getElementById('userPhone').value; 
            if(!phone) return alert('Введите номер телефона'); state.userPhone = phone;

            const res = await fetch('/api/book', { method: 'POST', body: JSON.stringify({ stationId, size: sizeInput.value, promoCode: state.activePromo?.code, phone }) });
            const result = await res.json(); if(result.success) navigate('success', result); else alert(result.error);
        }

        // Admin Tabs
        async function renderAdminTab(tab) {
            const content = document.getElementById('admin-content');
            
            if (tab === 'dash') { 
                content.innerHTML = '<div class="bg-white p-6 rounded shadow">Загрузка статистики...</div>';
                const res = await fetch('/api/admin/dashboard'); const s = await res.json();
                content.innerHTML = \`<div class="grid grid-cols-4 gap-4"><div class="bg-white p-4 rounded shadow border-l-4 border-indigo-500"><div class="text-xs text-gray-400">ВЫРУЧКА (LTV)</div><div class="text-2xl font-bold">\${s.revenue} ₽</div></div><div class="bg-white p-4 rounded shadow border-l-4 border-blue-500"><div class="text-xs text-gray-400">КЛИЕНТЫ</div><div class="text-2xl font-bold">API</div></div></div>\`;
            }
            
            else if (tab === 'map') {
                content.innerHTML = \`<div class="h-[600px] w-full bg-gray-200 rounded-xl overflow-hidden shadow-lg" id="map-container"></div>\`;
                const res = await fetch('/api/admin/monitoring'); const data = await res.json();
                
                setTimeout(() => {
                    const map = L.map('map-container').setView([59.9343, 30.3351], 11); // SPB center
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    
                    data.forEach(s => {
                        if(s.lat && s.lng) {
                           const color = (s.error_msg || !s.last_heartbeat) ? 'red' : 'green';
                           const icon = L.divIcon({
                               className: 'custom-div-icon',
                               html: \`<div style='background-color:\${color}; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);'></div>\`,
                               iconSize: [15, 15],
                               iconAnchor: [7, 7]
                           });
                           L.marker([s.lat, s.lng], {icon: icon}).addTo(map)
                            .bindPopup(\`<b>\${s.name}</b><br>\${s.address}<br>Status: \${color.toUpperCase()}\`);
                        }
                    });
                }, 100);
            }

            else if (tab === 'clients') {
                 const res = await fetch('/api/admin/users'); const users = await res.json();
                 content.innerHTML = \`<div class="bg-white rounded shadow overflow-hidden"><table class="w-full text-sm text-left"><thead class="bg-gray-50 font-bold"><tr><th class="p-3">ID</th><th class="p-3">Телефон</th><th class="p-3">LTV (Руб)</th><th class="p-3">Статус</th><th class="p-3">Действие</th></tr></thead><tbody>\${users.map(u => \`<tr><td class="p-3">\${u.id}</td><td class="p-3 font-mono">\${u.phone}</td><td class="p-3 font-bold text-green-600">\${u.ltv} ₽</td><td class="p-3">\${u.is_blocked ? '<span class="bg-red-100 text-red-600 px-2 rounded text-xs">BLOCKED</span>' : '<span class="bg-green-100 text-green-600 px-2 rounded text-xs">ACTIVE</span>'}</td><td class="p-3"><button onclick="toggleBlock(\${u.id}, \${!u.is_blocked})" class="\${u.is_blocked ? 'text-green-500' : 'text-red-500'} font-bold">\${u.is_blocked ? 'Разбан' : 'БАН'}</button></td></tr>\`).join('')}</tbody></table></div>\`;
            }

            else if (tab === 'monitoring') {
                const res = await fetch('/api/admin/monitoring'); const data = await res.json();
                content.innerHTML = \`<div class="grid grid-cols-3 gap-4">\${data.map(s => \`<div class="bg-white p-4 rounded shadow \${s.error_msg?'border border-red-500':''}"><h3 class="font-bold">\${s.name}</h3><div class="text-xs text-gray-500">\${s.address}</div><div class="mt-2 flex justify-between"><span class="\${s.battery_level<20?'text-red-500':'text-green-600'}"><i class="fas fa-battery-three-quarters"></i> \${s.battery_level}%</span><span><i class="fas fa-wifi"></i> \${s.wifi_signal}%</span></div>\${s.error_msg?\`<div class="mt-2 text-xs text-red-600 font-bold">⚠️ \${s.error_msg}</div>\`:''}</div>\`).join('')}</div>\`;
            }
            // ... (other tabs same as before)
        }

        async function toggleBlock(id, block) {
            await fetch('/api/admin/user/block', {method:'POST', body: JSON.stringify({id, block})});
            renderAdminTab('clients');
        }
        // Tools...
        async function simHeartbeat(id, bat, wifi, err = null) { await fetch('/api/hardware/heartbeat', { method: 'POST', body: JSON.stringify({ stationId: id, battery: bat, wifi: wifi, error: err }) }); renderAdminTab('monitoring'); }
        async function updateTariff(id, price) { await fetch('/api/admin/tariff/update', { method: 'POST', body: JSON.stringify({ id, price: parseInt(price) }) }); }
        async function createPromo() { const c=prompt("Код:"); const d=prompt("Скидка %:"); if(c&&d) { await fetch('/api/admin/promo/create', { method: 'POST', body: JSON.stringify({ code: c.toUpperCase(), discount: parseInt(d) }) }); renderAdminTab('promos'); } }
        async function deletePromo(id) { if(confirm('Удалить?')) { await fetch('/api/admin/promo/delete', { method: 'POST', body: JSON.stringify({ id }) }); renderAdminTab('promos'); } }
        async function adminCmd(cellId, cmd) { if(confirm('Открыть?')) { await fetch('/api/admin/command', {method:'POST', body:JSON.stringify({cellId, cmd})}); renderAdminTab('cells'); } }

        navigate('home');
    </script>
</body>
</html>
  `)
})

export default app
