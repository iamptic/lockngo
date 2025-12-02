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
const adminHtml = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Lock&Go Panel</title><script src="https://unpkg.com/vue@3/dist/vue.global.js"></script><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body { font-family: 'Inter', sans-serif; background: #F3F4F6; } .sidebar-link.active { background: #4F46E5; color: white; } .sidebar-link:hover:not(.active) { background: #E5E7EB; } #map-admin { height: 600px; width: 100%; border-radius: 12px; }</style></head><body><div id="app" class="h-screen flex overflow-hidden"><div v-if="!auth" class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50"><div class="bg-white p-8 rounded-2xl shadow-2xl w-96"><div class="flex justify-center mb-6 text-indigo-600 text-5xl"><i class="fas fa-cube"></i></div><h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Lock&Go Admin</h2><input v-model="loginPass" type="password" placeholder="Password (12345)" class="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" @keyup.enter="doLogin"><button @click="doLogin" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition">Войти</button></div></div><aside v-if="auth" class="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex"><div class="h-16 flex items-center px-6 font-bold text-xl text-indigo-600 border-b border-gray-100"><i class="fas fa-cube mr-2"></i> Lock&Go</div><nav class="flex-1 p-4 space-y-1 overflow-y-auto"><a v-for="item in menu" :key="item.id" @click="setPage(item.id)" :class="{'active': page === item.id}" class="sidebar-link flex items-center px-4 py-3 rounded-lg text-gray-600 cursor-pointer transition font-medium"><i :class="item.icon" class="w-6"></i> {{ item.label }}</a></nav><div class="p-4 border-t border-gray-100"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">DP</div><div><div class="text-sm font-bold text-gray-900">Danila Ptitsyn</div><div class="text-xs text-gray-500">Super Admin</div></div></div></div></aside><main v-if="auth" class="flex-1 flex flex-col overflow-hidden relative"><header class="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 md:hidden shrink-0"><div class="font-bold text-indigo-600"><i class="fas fa-cube"></i> Lock&Go</div><button @click="showMobileMenu = !showMobileMenu"><i class="fas fa-bars text-gray-600 text-xl"></i></button></header><div class="flex-1 overflow-y-auto p-6"><div v-if="page === 'dashboard'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Обзор системы</h1><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Выручка</div><div class="text-3xl font-black text-gray-900">{{ stats.revenue }} ₽</div></div><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Активные</div><div class="text-3xl font-black text-indigo-600">{{ stats.active_rentals }}</div></div><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Инциденты</div><div class="text-3xl font-black" :class="stats.incidents>0?'text-red-600':'text-gray-900'">{{ stats.incidents }}</div></div><div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div class="text-gray-400 text-sm font-medium mb-1">Сегодня</div><div class="text-3xl font-black text-gray-900">{{ stats.bookings_today }}</div></div></div></div><div v-show="page === 'map'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Карта сети</h1><div id="map-admin" class="shadow-sm border border-gray-200"></div></div><div v-if="page === 'devices'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Оборудование</h1><div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><table class="w-full text-sm text-left"><thead class="text-xs text-gray-400 uppercase bg-gray-50 border-b"><tr><th class="px-6 py-4">Станция</th><th class="px-6 py-4">Статус</th><th class="px-6 py-4">Батарея</th></tr></thead><tbody><tr v-for="s in stations" :key="s.id" class="border-b"><td class="px-6 py-4 font-bold">{{s.name}}</td><td class="px-6 py-4">{{s.error_msg?'Error':'Online'}}</td><td class="px-6 py-4">{{s.battery_level||0}}%</td></tr></tbody></table></div></div><div v-if="page === 'users'"><h1 class="text-2xl font-bold text-gray-900 mb-6">Пользователи</h1><div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><table class="w-full text-sm text-left"><thead class="text-xs text-gray-400 uppercase bg-gray-50 border-b"><tr><th class="px-6 py-4">Телефон</th><th class="px-6 py-4">LTV</th></tr></thead><tbody><tr v-for="u in users" :key="u.id" class="border-b"><td class="px-6 py-4 font-bold">{{u.phone}}</td><td class="px-6 py-4">{{u.ltv}} ₽</td></tr></tbody></table></div></div></div></main></div><script>const {createApp,ref,onMounted,watch,nextTick}=Vue;createApp({setup(){const auth=ref(false);const loginPass=ref('');const page=ref('dashboard');const stats=ref({});const stations=ref([]);const users=ref([]);const map=ref(null);const menu=[{id:'dashboard',label:'Главная',icon:'fas fa-home'},{id:'map',label:'Карта',icon:'fas fa-map'},{id:'devices',label:'Устройства',icon:'fas fa-server'},{id:'users',label:'Сотрудники',icon:'fas fa-users'}];const doLogin=()=>{if(loginPass.value==='12345'){auth.value=true;fetchData();}};const fetchData=async()=>{try{const [s,st,u]=await Promise.all([fetch('/api/admin/dashboard'),fetch('/api/admin/stations'),fetch('/api/admin/users')]);if(s.ok)stats.value=await s.json();if(st.ok){stations.value=await st.json();updateMap();}if(u.ok)users.value=await u.json();}catch(e){console.error('Fetch error',e)}};const setPage=(p)=>{page.value=p;if(p==='map'){nextTick(()=>initMap())}};const initMap=()=>{if(map.value)return;const el=document.getElementById('map-admin');if(!el)return;map.value=L.map('map-admin').setView([59.9343, 30.3351], 11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map.value);updateMap();};const updateMap=()=>{if(!map.value || !stations.value.length)return;stations.value.forEach(s=>{if(s.lat && s.lng){L.marker([s.lat, s.lng]).addTo(map.value).bindPopup('<b>'+s.name+'</b><br>'+s.address)}})};setInterval(()=>{if(auth.value)fetchData()},5000);return{auth,loginPass,doLogin,page,menu,stats,stations,users,setPage}}}).mount('#app');</script></body></html>`

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
        const state={view:'home',data:{},activePromo:null,userPhone:'',stations:[]};
        
        const HomeView=()=>\`
            <div class="flex flex-col h-full">
                <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
                    <div class="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tighter"><i class="fas fa-cube"></i> Lock&Go</div>
                    <button onclick="window.location.href='/admin'" class="text-gray-300 hover:text-indigo-600"><i class="fas fa-cog"></i></button>
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

        const SuccessView=(data)=>\`
            <div class="flex flex-col h-full brand-gradient text-white p-8 items-center justify-center text-center">
                <div class="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-4xl mb-8 animate-bounce"><i class="fas fa-unlock-alt"></i></div>
                <h1 class="text-3xl font-bold mb-2">Ячейка открыта!</h1>
                <div class="bg-white text-gray-900 rounded-2xl p-8 w-full shadow-2xl mb-8"><div class="text-gray-400 text-xs uppercase font-bold mb-1">Номер ячейки</div><div class="text-7xl font-black text-indigo-600 mb-4">\${data.cellNumber}</div><div class="h-px bg-gray-100 w-full my-4"></div><div class="text-gray-400 text-xs uppercase font-bold mb-1">Код доступа</div><div class="text-2xl font-mono font-bold text-gray-800 tracking-widest">\${data.accessCode}</div></div>
                <button onclick="navigate('home')" class="mt-auto w-full py-4 text-white/80 hover:text-white font-bold">Вернуться на главную</button>
            </div>\`;

        let mapInstance = null;

        async function navigate(view,params=null){
            state.view=view;
            const app=document.getElementById('app');
            if(view==='home'){ app.innerHTML=HomeView(); loadStations(); }
            else if(view==='booking'){ app.innerHTML=BookingView(params); loadTariffs(params.id); if(!state.userPhone) setTimeout(openAuth, 500); }
            else if(view==='success'){ app.innerHTML=SuccessView(params); }
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
        function loginWith(provider) { state.userPhone = '+7 (999) 000-00-01'; closeAuth(); if(state.view === 'booking') navigate('booking', state.activeStationData.station); }
        function toggleRules(show) { const m = document.getElementById('rules-modal'); if(show) { m.classList.remove('hidden'); m.classList.add('flex'); } else { m.classList.add('hidden'); m.classList.remove('flex'); } }
        async function processBooking(stationId){
            if(!state.userPhone){ openAuth(); return; }
            const sizeInput=document.querySelector('input[name="tariff"]:checked');
            if(!sizeInput) return alert('Пожалуйста, выберите размер ячейки');
            const res=await fetch('/api/book',{method:'POST',body:JSON.stringify({stationId,size:sizeInput.value,phone:state.userPhone})});
            const result=await res.json();
            if(result.success) navigate('success',result);
            else alert(result.error);
        }

        navigate('home');
    </script>
</body>
</html>`

app.get('/admin', (c) => c.html(adminHtml))
app.get('/', (c) => c.html(userHtml))

export default app
