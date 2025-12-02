import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

interface Env { DB: D1Database }
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())
app.use('/assets/*', serveStatic({ root: './public' }))

// --- API ROUTES (Same as before) ---
// (I will include the full API code again to ensure it's complete)

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
  await c.env.DB.prepare("UPDATE cells SET status = 'booked' WHERE id = ?").bind(cell.id).run()
  await c.env.DB.prepare("INSERT INTO bookings (user_id, cell_id, total_amount, status) VALUES (?, ?, ?, 'active')").bind(user.id, cell.id, price).run()
  await c.env.DB.prepare("UPDATE users SET ltv = ltv + ?, last_booking = CURRENT_TIMESTAMP WHERE id = ?").bind(price, user.id).run()
  return c.json({ success: true, cellNumber: cell.cell_number, accessCode: Math.floor(100000 + Math.random() * 900000), validUntil: new Date(Date.now() + 24*60*60*1000).toISOString() })
})

app.get('/api/admin/dashboard', async (c) => {
  const stats = {
    revenue: (await c.env.DB.prepare('SELECT sum(ltv) as s FROM users').first('s')) || 0, 
    bookings_today: (await c.env.DB.prepare("SELECT count(*) as c FROM bookings WHERE start_time > date('now')").first('c')) || 0,
    active_rentals: (await c.env.DB.prepare("SELECT count(*) as c FROM bookings WHERE status = 'active'").first('c')) || 0,
    incidents: (await c.env.DB.prepare("SELECT count(*) as c FROM station_health WHERE error_msg IS NOT NULL").first('c')) || 0
  }
  return c.json(stats)
})
app.get('/api/admin/stations', async (c) => { const { results } = await c.env.DB.prepare(`SELECT s.*, h.battery_level, h.wifi_signal, h.last_heartbeat, h.error_msg, (SELECT count(*) FROM cells WHERE station_id = s.id AND status = 'free') as free_cells FROM stations s LEFT JOIN station_health h ON s.id = h.station_id`).all(); return c.json(results) })
app.get('/api/admin/users', async (c) => { const { results } = await c.env.DB.prepare("SELECT * FROM users ORDER BY last_booking DESC LIMIT 100").all(); return c.json(results) })
app.get('/api/admin/bookings', async (c) => { const { results } = await c.env.DB.prepare(`SELECT b.*, u.phone, c.cell_number, s.name as station_name FROM bookings b JOIN users u ON b.user_id = u.id JOIN cells c ON b.cell_id = c.id JOIN stations s ON c.station_id = s.id ORDER BY b.start_time DESC LIMIT 50`).all(); return c.json(results) })
app.post('/api/admin/cell/open', async (c) => { const { cellId } = await c.req.json(); await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(cellId).run(); await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES ((SELECT station_id FROM cells WHERE id=?), 'admin_open', 'Remote Open')").bind(cellId, cellId).run(); return c.json({success: true}) })
app.post('/api/hw/sync', async (c) => { const { id, battery, wifi, error } = await c.req.json(); let stationId = 1; await c.env.DB.prepare(`INSERT INTO station_health (station_id, battery_level, wifi_signal, last_heartbeat, error_msg) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?) ON CONFLICT(station_id) DO UPDATE SET battery_level = excluded.battery_level, wifi_signal = excluded.wifi_signal, last_heartbeat = CURRENT_TIMESTAMP, error_msg = excluded.error_msg`).bind(stationId, battery, wifi, error).run(); return c.json({ cmd: 'ok' }) })


// --- FRONTEND HTML ---

const adminHtml = \`<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Lock&Go Panel</title><script src="https://unpkg.com/vue@3/dist/vue.global.js"></script><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body { font-family: 'Inter', sans-serif; background: #F3F4F6; } .sidebar-link.active { background: #4F46E5; color: white; } .sidebar-link:hover:not(.active) { background: #E5E7EB; }</style></head>
<body>
<div id="app" class="h-screen flex overflow-hidden">
  <div v-if="!auth" class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50"><div class="bg-white p-8 rounded-2xl shadow-2xl w-96"><div class="flex justify-center mb-6 text-indigo-600 text-5xl"><i class="fas fa-cube"></i></div><h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Lock&Go Admin</h2><input v-model="loginPass" type="password" placeholder="Password (12345)" class="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" @keyup.enter="doLogin"><button @click="doLogin" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition">Войти</button></div></div>
  <aside v-if="auth" class="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex"><div class="h-16 flex items-center px-6 font-bold text-xl text-indigo-600 border-b border-gray-100"><i class="fas fa-cube mr-2"></i> Lock&Go</div><nav class="flex-1 p-4 space-y-1 overflow-y-auto"><a v-for="item in menu" :key="item.id" @click="page = item.id" :class="{'active': page === item.id}" class="sidebar-link flex items-center px-4 py-3 rounded-lg text-gray-600 cursor-pointer transition font-medium"><i :class="item.icon" class="w-6"></i> {{ item.label }}</a></nav><div class="p-4 border-t border-gray-100"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">DP</div><div><div class="text-sm font-bold text-gray-900">Danila Ptitsyn</div><div class="text-xs text-gray-500">Super Admin</div></div></div></div></aside>
  <main v-if="auth" class="flex-1 flex flex-col overflow-hidden relative">
    <header class="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 md:hidden shrink-0"><div class="font-bold text-indigo-600"><i class="fas fa-cube"></i> Lock&Go</div><button @click="showMobileMenu = !showMobileMenu"><i class="fas fa-bars text-gray-600 text-xl"></i></button></header>
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="page === 'dashboard'">
         <h1 class="text-2xl font-bold text-gray-900 mb-6">Обзор системы</h1>
         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Выручка</div><div class="text-3xl font-black text-gray-900">{{ stats.revenue }} ₽</div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Активные</div><div class="text-3xl font-black text-indigo-600">{{ stats.active_rentals }}</div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Инциденты</div><div class="text-3xl font-black" :class="stats.incidents>0?'text-red-600':'text-gray-900'">{{ stats.incidents }}</div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Сегодня</div><div class="text-3xl font-black text-gray-900">{{ stats.bookings_today }}</div></div>
         </div>
         <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 class="font-bold text-lg mb-4">Состояние сети</h3><div class="space-y-4"><div v-for="s in stations" :key="s.id" class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-200 transition cursor-pointer"><div><div class="font-bold text-gray-900 text-sm">{{ s.name }}</div><div class="text-xs text-gray-400 flex items-center gap-2"><span v-if="s.error_msg" class="text-red-500">Ошибка</span><span v-else class="text-green-500">Online</span><span><i class="fas fa-wifi"></i> {{ s.wifi_signal||'?' }}%</span></div></div><div class="text-right"><div class="font-bold text-indigo-600 text-lg">{{ s.free_cells }}</div><div class="text-xs text-gray-400">free</div></div></div></div></div>
      </div>
      <div v-if="page === 'devices'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Оборудование</h1><div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><table class="w-full text-sm text-left"><thead class="text-xs text-gray-400 uppercase bg-gray-50 border-b"><tr><th class="px-6 py-4">Станция</th><th class="px-6 py-4">Статус</th><th class="px-6 py-4">Батарея</th></tr></thead><tbody><tr v-for="s in stations" :key="s.id" class="border-b"><td class="px-6 py-4 font-bold">{{s.name}}</td><td class="px-6 py-4">{{s.error_msg?'Error':'Online'}}</td><td class="px-6 py-4">{{s.battery_level||0}}%</td></tr></tbody></table></div></div>
      <div v-if="page === 'users'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Пользователи</h1><div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><table class="w-full text-sm text-left"><thead class="text-xs text-gray-400 uppercase bg-gray-50 border-b"><tr><th class="px-6 py-4">Телефон</th><th class="px-6 py-4">LTV</th></tr></thead><tbody><tr v-for="u in users" :key="u.id" class="border-b"><td class="px-6 py-4 font-bold">{{u.phone}}</td><td class="px-6 py-4">{{u.ltv}} ₽</td></tr></tbody></table></div></div>
    </div>
  </main>
</div>
<script>const {createApp,ref}=Vue;createApp({setup(){const auth=ref(false);const loginPass=ref('');const page=ref('dashboard');const stats=ref({});const stations=ref([]);const users=ref([]);const menu=[{id:'dashboard',label:'Главная',icon:'fas fa-home'},{id:'devices',label:'Устройства',icon:'fas fa-server'},{id:'users',label:'Сотрудники',icon:'fas fa-users'}];const doLogin=()=>{if(loginPass.value==='12345'){auth.value=true;fetchData()}};const fetchData=async()=>{const [s,st,u]=await Promise.all([fetch('/api/admin/dashboard'),fetch('/api/admin/stations'),fetch('/api/admin/users')]);stats.value=await s.json();stations.value=await st.json();users.value=await u.json()};setInterval(()=>{if(auth.value)fetchData()},5000);return{auth,loginPass,doLogin,page,menu,stats,stations,users}}}).mount('#app');</script>
</body></html>\`

const userHtml = \`<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"><title>Lock&Go</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');body{font-family:'Inter',sans-serif;}.brand-gradient{background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);}</style></head>
<body class="bg-gray-50 h-screen flex flex-col overflow-hidden text-gray-900">
<div id="app" class="flex-1 flex flex-col h-full relative"></div>
<script>
const state={view:'home',data:{},activePromo:null,userPhone:''};
const HomeView=()=>\`<div class="flex flex-col h-full"><div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10"><div class="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tighter"><i class="fas fa-cube"></i> Lock&Go</div><button onclick="window.location.href='/admin'" class="text-gray-300 hover:text-indigo-600"><i class="fas fa-cog"></i></button></div><div class="p-4 space-y-4 overflow-y-auto flex-1 pb-20"><div class="brand-gradient rounded-2xl p-6 text-white shadow-lg cursor-pointer" onclick="alert('Scan QR code on locker')"><h2 class="font-bold text-2xl mb-1">Свободные руки</h2><p class="opacity-90 text-sm mb-4">Инфраструктура вашей свободы</p><button class="bg-white text-indigo-700 px-4 py-2 rounded-lg text-xs font-bold shadow-md uppercase">Как это работает?</button></div><div id="stations-list" class="space-y-3">Loading...</div></div></div>\`;
const BookingView=(station)=>\`<div class="flex flex-col h-full bg-white"><div class="px-4 py-4 border-b flex items-center sticky top-0 bg-white z-10"><button onclick="navigate('home')" class="mr-4 text-gray-600"><i class="fas fa-arrow-left"></i></button><h1 class="font-bold text-lg">\${station.name}</h1></div><div class="flex-1 overflow-y-auto p-5"><div class="mb-4 text-gray-600 text-sm"><i class="fas fa-map-pin text-indigo-500"></i> \${station.address}</div><div class="bg-indigo-50 p-4 rounded-xl mb-6" onclick="askPhone()"><div class="text-xs text-indigo-400 font-bold">Вход</div><div class="font-bold text-indigo-900">\${state.userPhone||'Нажмите для входа'}</div></div><h3 class="font-bold mb-3">Размер</h3><div id="tariffs-list" class="space-y-3 mb-6"></div><button onclick="processBooking(\${station.id})" class="w-full brand-gradient text-white font-bold py-4 rounded-xl shadow-lg">Оплатить</button></div></div>\`;
const SuccessView=(data)=>\`<div class="flex flex-col h-full brand-gradient text-white p-8 items-center justify-center text-center"><div class="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-4xl mb-8"><i class="fas fa-unlock-alt"></i></div><h1 class="text-3xl font-bold mb-2">Открыто!</h1><div class="bg-white text-gray-900 rounded-2xl p-6 w-full shadow-2xl mb-4"><div class="text-6xl font-black text-indigo-600">\${data.cellNumber}</div><div class="text-gray-400 text-xs uppercase font-bold">Код: \${data.accessCode}</div></div><button onclick="navigate('home')" class="mt-auto w-full py-4 text-white/70">Главная</button></div>\`;
async function navigate(view,params=null){state.view=view;const app=document.getElementById('app');if(view==='home'){app.innerHTML=HomeView();loadStations()}else if(view==='booking'){app.innerHTML=BookingView(params);loadTariffs(params.id)}else if(view==='success'){app.innerHTML=SuccessView(params)}}
async function loadStations(){const res=await fetch('/api/locations');const data=await res.json();document.getElementById('stations-list').innerHTML=data.map(s=>\`<div onclick='openBooking(\${s.id})' class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 cursor-pointer"><div class="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-2xl"><i class="fas fa-box"></i></div><div><h3 class="font-bold text-gray-900">\${s.name}</h3><p class="text-xs text-gray-500">\${s.address}</p></div></div>\`).join('')}
async function openBooking(id){const res=await fetch('/api/location/'+id);state.activeStationData=await res.json();navigate('booking',state.activeStationData.station)}
async function loadTariffs(sid){const{tariffs}=state.activeStationData;document.getElementById('tariffs-list').innerHTML=tariffs.map(t=>\`<label class="block relative group"><input type="radio" name="tariff" value="\${t.size}" class="peer sr-only"><div class="p-4 rounded-xl border-2 border-gray-100 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 transition flex justify-between items-center"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700">\${t.size}</div><div>\${t.description}</div></div><div class="font-bold">\${t.price_initial} ₽</div></div></label>\`).join('')}
function askPhone(){const p=prompt('Номер телефона:','+79990000000');if(p)state.userPhone=p;navigate('booking',state.activeStationData.station)}
async function processBooking(stationId){if(!state.userPhone){askPhone();return}const sizeInput=document.querySelector('input[name="tariff"]:checked');if(!sizeInput)return alert('Выберите размер');const res=await fetch('/api/book',{method:'POST',body:JSON.stringify({stationId,size:sizeInput.value,phone:state.userPhone})});const result=await res.json();if(result.success)navigate('success',result);else alert(result.error)}
navigate('home');
</script></body></html>\`

app.get('/admin', (c) => c.html(adminHtml))
app.get('/', (c) => c.html(userHtml))

export default app
