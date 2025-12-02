import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'
import { cors } from 'hono/cors'

// --- Types ---
interface Env {
  DB: D1Database
}

type Station = { id: number; name: string; type: string; address: string; hardware_key: string }
type Cell = { id: number; station_id: number; cell_number: number; size: string; status: 'free' | 'booked' | 'occupied'; door_open: number }
type Tariff = { id: number; station_id: number; size: string; price_initial: number; description: string }

// --- App Setup ---
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// --- API Backend ---

// 1. Client API
app.get('/api/locations', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM stations').all()
  return c.json(results)
})

app.get('/api/location/:id', async (c) => {
  const id = c.req.param('id')
  const station = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first()
  const cells = await c.env.DB.prepare('SELECT * FROM cells WHERE station_id = ?').bind(id).all()
  const tariffs = await c.env.DB.prepare('SELECT * FROM tariffs WHERE station_id = ?').bind(id).all()
  
  // Count available by size
  const available = {
    S: cells.results.filter((cell: any) => cell.size === 'S' && cell.status === 'free').length,
    M: cells.results.filter((cell: any) => cell.size === 'M' && cell.status === 'free').length,
    L: cells.results.filter((cell: any) => cell.size === 'L' && cell.status === 'free').length,
    XL: cells.results.filter((cell: any) => cell.size === 'XL' && cell.status === 'free').length,
  }

  return c.json({ station, available, tariffs: tariffs.results })
})

app.post('/api/book', async (c) => {
  const { stationId, size } = await c.req.json()
  
  // Find free cell
  const cell: any = await c.env.DB.prepare(
    "SELECT * FROM cells WHERE station_id = ? AND size = ? AND status = 'free' LIMIT 1"
  ).bind(stationId, size).first()

  if (!cell) return c.json({ error: 'Нет свободных ячеек' }, 400)

  // Update status
  await c.env.DB.prepare(
    "UPDATE cells SET status = 'booked' WHERE id = ?"
  ).bind(cell.id).run()

  // Log
  await c.env.DB.prepare(
    "INSERT INTO logs (station_id, action, details) VALUES (?, 'booking', ?)"
  ).bind(stationId, `Booking created for cell ${cell.cell_number} (${size})`).run()

  return c.json({ 
    success: true, 
    cellNumber: cell.cell_number, 
    accessCode: Math.floor(100000 + Math.random() * 900000) 
  })
})

// 2. Admin API
app.get('/api/admin/stats', async (c) => {
  // Mock stats for dashboard
  const totalStations = await c.env.DB.prepare('SELECT count(*) as c FROM stations').first('c')
  const totalCells = await c.env.DB.prepare('SELECT count(*) as c FROM cells').first('c')
  const activeBookings = await c.env.DB.prepare("SELECT count(*) as c FROM cells WHERE status != 'free'").first('c')
  const revenue = 125000 // Mock revenue for demo
  
  return c.json({ totalStations, totalCells, activeBookings, revenue })
})

app.get('/api/admin/cells', async (c) => {
  const cells = await c.env.DB.prepare(`
    SELECT c.*, s.name as station_name 
    FROM cells c 
    JOIN stations s ON c.station_id = s.id
    ORDER BY s.name, c.cell_number
  `).all()
  return c.json(cells.results)
})

app.post('/api/admin/open', async (c) => {
  const { cellId } = await c.req.json()
  await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(cellId).run()
  await c.env.DB.prepare("INSERT INTO logs (action, details) VALUES ('admin_open', ?)").bind(`Force open cell ID ${cellId}`).run()
  return c.json({ success: true })
})

app.get('/api/admin/logs', async (c) => {
  const logs = await c.env.DB.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 50').all()
  return c.json(logs.results)
})

// 3. Hardware API
app.post('/api/hardware/sync', async (c) => {
  // Hardware logic here
  return c.json({ command: 'sync_ok' })
})


// --- Frontend Application (Embedded) ---
app.get('*', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Lock&Go Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-gray-50 h-screen flex flex-col overflow-hidden">

    <!-- App Container -->
    <div id="app" class="flex-1 flex flex-col h-full relative"></div>

    <script>
        // --- State Management ---
        const state = {
            view: 'home', // home, booking, success, admin, admin_login
            activeStation: null,
            activeStationData: null,
            bookingResult: null,
            isAdmin: false
        };

        // --- Views Components ---

        function AdminLoginView() {
            return \`
                <div class="flex items-center justify-center h-full bg-gray-900">
                    <div class="bg-white p-8 rounded-lg shadow-xl w-80">
                        <div class="text-center mb-6">
                            <div class="text-4xl text-indigo-600 mb-2"><i class="fas fa-user-shield"></i></div>
                            <h2 class="text-xl font-bold">Вход в систему</h2>
                            <p class="text-gray-500 text-sm">Lock&Go Enterprise</p>
                        </div>
                        <input type="password" id="adminPass" placeholder="Пароль администратора" class="w-full p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <button onclick="checkAdmin()" class="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700 transition">Войти</button>
                        <button onclick="navigate('home')" class="w-full mt-2 text-gray-400 text-sm hover:text-gray-600">Вернуться на сайт</button>
                    </div>
                </div>
            \`;
        }

        function AdminDashboardView() {
            setTimeout(loadAdminStats, 100);
            return \`
                <div class="flex h-full bg-gray-100">
                    <!-- Sidebar -->
                    <div class="w-64 bg-gray-900 text-white flex flex-col hidden md:flex">
                        <div class="p-6 border-b border-gray-800">
                            <h1 class="text-2xl font-bold text-indigo-400"><i class="fas fa-cubes mr-2"></i>Lock&Go</h1>
                            <p class="text-xs text-gray-500 mt-1">Enterprise Panel</p>
                        </div>
                        <nav class="flex-1 p-4 space-y-2">
                            <a href="#" onclick="renderAdminTab('dashboard')" class="block p-3 rounded bg-gray-800 text-white"><i class="fas fa-chart-line w-6"></i> Обзор</a>
                            <a href="#" onclick="renderAdminTab('cells')" class="block p-3 rounded hover:bg-gray-800 text-gray-300"><i class="fas fa-th w-6"></i> Управление ячейками</a>
                            <a href="#" onclick="renderAdminTab('tariffs')" class="block p-3 rounded hover:bg-gray-800 text-gray-300"><i class="fas fa-tags w-6"></i> Тарифы</a>
                            <a href="#" onclick="renderAdminTab('logs')" class="block p-3 rounded hover:bg-gray-800 text-gray-300"><i class="fas fa-list w-6"></i> Журнал событий</a>
                        </nav>
                        <div class="p-4 border-t border-gray-800">
                             <button onclick="logoutAdmin()" class="flex items-center text-gray-400 hover:text-white"><i class="fas fa-sign-out-alt mr-2"></i> Выйти</button>
                        </div>
                    </div>

                    <!-- Mobile Header -->
                    <div class="md:hidden absolute top-0 left-0 w-full bg-gray-900 text-white p-4 flex justify-between items-center z-50">
                        <div class="font-bold">Lock&Go Admin</div>
                        <button onclick="logoutAdmin()"><i class="fas fa-sign-out-alt"></i></button>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-auto p-4 md:p-8 mt-12 md:mt-0" id="adminContent">
                        <!-- Dashboard Tab Default -->
                        <h2 class="text-2xl font-bold mb-6">Обзор системы</h2>
                        
                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                                <div class="text-gray-500 text-sm">Выручка (сегодня)</div>
                                <div class="text-2xl font-bold" id="statRevenue">Loading...</div>
                            </div>
                            <div class="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                                <div class="text-gray-500 text-sm">Активные аренды</div>
                                <div class="text-2xl font-bold" id="statActive">Loading...</div>
                            </div>
                            <div class="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                                <div class="text-gray-500 text-sm">Всего станций</div>
                                <div class="text-2xl font-bold" id="statStations">Loading...</div>
                            </div>
                             <div class="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                                <div class="text-gray-500 text-sm">Инциденты</div>
                                <div class="text-2xl font-bold">0</div>
                            </div>
                        </div>

                        <!-- Charts Area -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-white p-6 rounded-lg shadow">
                                <h3 class="font-bold mb-4">Загрузка по часам</h3>
                                <div class="h-64 bg-gray-50 flex items-center justify-center text-gray-400">
                                    [График загрузки]
                                </div>
                            </div>
                             <div class="bg-white p-6 rounded-lg shadow">
                                <h3 class="font-bold mb-4">Популярные локации</h3>
                                <div id="locationsList" class="space-y-3">
                                    Loading...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }

        // --- Client Views (As before) ---
        function HomeView() {
            return \`
                <!-- Header -->
                <div class="bg-white shadow-sm sticky top-0 z-10">
                    <div class="px-4 py-3 flex justify-between items-center">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-2"><i class="fas fa-box"></i></div>
                            <span class="font-bold text-lg text-gray-800">Lock&Go</span>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="navigate('admin_login')" class="text-gray-400 hover:text-indigo-600"><i class="fas fa-cog"></i></button>
                            <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500"><i class="fas fa-user"></i></div>
                        </div>
                    </div>
                    
                    <!-- Categories -->
                    <div class="px-4 pb-2 flex gap-2 overflow-x-auto hide-scrollbar">
                        <button class="px-4 py-1.5 bg-gray-900 text-white rounded-full text-sm whitespace-nowrap">Все</button>
                        <button class="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-sm whitespace-nowrap">Торговые центры</button>
                        <button class="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-sm whitespace-nowrap">Вокзалы</button>
                        <button class="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-sm whitespace-nowrap">Театры</button>
                    </div>
                </div>

                <!-- Promo Banner -->
                <div class="p-4">
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                        <h2 class="text-xl font-bold mb-1">Свободные руки —</h2>
                        <h2 class="text-xl font-bold mb-2">успешные сделки</h2>
                        <p class="text-indigo-100 text-sm mb-4">Оставь вещи в безопасном месте</p>
                        <button class="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold shadow">Найти локер рядом</button>
                    </div>
                </div>

                <!-- Locations List -->
                <div class="flex-1 overflow-y-auto px-4 pb-20 space-y-4" id="locations-container">
                    <div class="text-center py-10 text-gray-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i><br>Загрузка локаций...</div>
                </div>

                <!-- Bottom Nav -->
                <div class="bg-white border-t border-gray-200 fixed bottom-0 w-full px-6 py-3 flex justify-between items-center text-xs text-gray-400 z-20">
                    <button class="flex flex-col items-center text-indigo-600 font-medium">
                        <i class="fas fa-map-marker-alt text-lg mb-1"></i>
                        Карта
                    </button>
                    <button class="flex flex-col items-center hover:text-gray-600">
                        <i class="fas fa-ticket-alt text-lg mb-1"></i>
                        Аренды
                    </button>
                    <button class="flex flex-col items-center hover:text-gray-600">
                        <i class="fas fa-wallet text-lg mb-1"></i>
                        Кошелек
                    </button>
                    <button class="flex flex-col items-center hover:text-gray-600">
                        <i class="fas fa-ellipsis-h text-lg mb-1"></i>
                        Ещё
                    </button>
                </div>
            \`;
        }

        function BookingView() {
            if (!state.activeStationData) return 'Loading...';
            const s = state.activeStationData.station;
            const t = state.activeStationData.tariffs;
            const a = state.activeStationData.available;

            return \`
                <div class="flex flex-col h-full bg-white">
                    <!-- Header -->
                    <div class="px-4 py-4 border-b flex items-center sticky top-0 bg-white z-10">
                        <button onclick="navigate('home')" class="mr-4 text-gray-600"><i class="fas fa-arrow-left text-lg"></i></button>
                        <h1 class="font-bold text-lg truncate">\${s.name}</h1>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4">
                        <div class="bg-gray-50 rounded-xl p-4 mb-6 flex items-start gap-3">
                            <i class="fas fa-map-pin text-indigo-600 mt-1"></i>
                            <div>
                                <div class="font-medium text-gray-900">\${s.address}</div>
                                <div class="text-sm text-gray-500 mt-1">Открыто 24/7</div>
                            </div>
                        </div>

                        <h3 class="font-bold text-gray-900 mb-3">Выберите размер ячейки</h3>
                        <div class="space-y-3">
                            \${['S', 'M', 'L'].map(size => {
                                const tariff = t.find(x => x.size === size);
                                const price = tariff ? tariff.price_initial : '?';
                                const count = a[size] || 0;
                                const disabled = count === 0;
                                const dims = size === 'S' ? '30x40x50' : (size === 'M' ? '45x40x50' : '60x40x50');
                                
                                return \`
                                    <label class="block relative">
                                        <input type="radio" name="size" value="\${size}" class="peer sr-only" \${disabled ? 'disabled' : ''}>
                                        <div class="p-4 rounded-xl border-2 border-gray-100 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 transition flex justify-between items-center \${disabled ? 'opacity-50 grayscale' : 'cursor-pointer'}">
                                            <div class="flex items-center gap-4">
                                                <div class="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-500 font-bold">\${size}</div>
                                                <div>
                                                    <div class="font-medium">\${dims} см</div>
                                                    <div class="text-xs \${count > 0 ? 'text-green-600' : 'text-red-500'}">\${count > 0 ? \`Свободно: \${count}\` : 'Нет мест'}</div>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-bold text-indigo-600 text-lg">\${price} ₽</div>
                                                <div class="text-xs text-gray-400">за час</div>
                                            </div>
                                        </div>
                                    </label>
                                \`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="p-4 border-t bg-white">
                        <button onclick="bookLocker()" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition flex justify-between px-6">
                            <span>Оплатить и открыть</span>
                            <i class="fas fa-chevron-right mt-1"></i>
                        </button>
                    </div>
                </div>
            \`;
        }

        function SuccessView() {
             const r = state.bookingResult;
             return \`
                <div class="flex flex-col h-full bg-indigo-600 text-white p-6 items-center justify-center text-center relative">
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center text-indigo-600 text-4xl mb-6 shadow-xl animate-bounce">
                        <i class="fas fa-check"></i>
                    </div>
                    <h1 class="text-3xl font-bold mb-2">Ячейка открыта!</h1>
                    <p class="text-indigo-100 mb-8">Ваши вещи в безопасности</p>

                    <div class="bg-white/10 backdrop-blur rounded-xl p-6 w-full max-w-xs border border-white/20">
                        <div class="text-indigo-200 text-sm mb-1">Номер ячейки</div>
                        <div class="text-5xl font-bold mb-6 tracking-tighter">\${r.cellNumber}</div>
                        
                        <div class="h-px bg-white/20 w-full mb-6"></div>

                        <div class="text-indigo-200 text-sm mb-1">Код доступа</div>
                        <div class="text-2xl font-mono font-bold tracking-widest">\${r.accessCode}</div>
                    </div>

                    <button onclick="navigate('home')" class="mt-12 text-white/80 hover:text-white font-medium">
                        <i class="fas fa-arrow-left mr-2"></i> Вернуться на главную
                    </button>
                </div>
            \`;
        }

        // --- Logic ---

        function render() {
            const app = document.getElementById('app');
            if (state.view === 'home') {
                app.innerHTML = HomeView();
                loadLocations();
            } else if (state.view === 'booking') {
                app.innerHTML = BookingView();
            } else if (state.view === 'success') {
                app.innerHTML = SuccessView();
            } else if (state.view === 'admin_login') {
                app.innerHTML = AdminLoginView();
            } else if (state.view === 'admin') {
                app.innerHTML = AdminDashboardView();
            }
        }

        function navigate(view, data = null) {
            state.view = view;
            if (data) state.activeStation = data;
            render();
        }

        async function loadLocations() {
            try {
                const res = await fetch('/api/locations');
                const stations = await res.json();
                const container = document.getElementById('locations-container');
                
                if (stations.length === 0) {
                    container.innerHTML = '<div class="p-4 text-center text-gray-500">Нет доступных станций</div>';
                    return;
                }

                container.innerHTML = stations.map(s => \`
                    <div onclick="openBooking(\${s.id})" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer active:scale-95 transition">
                        <div class="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 bg-cover bg-center" style="background-image: url('https://via.placeholder.com/150?text=Locker');"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <h3 class="font-bold text-gray-800">\${s.name}</h3>
                                <span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Free</span>
                            </div>
                            <p class="text-sm text-gray-500 mt-1 mb-2">\${s.address}</p>
                            <div class="flex gap-2">
                                <span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">S</span>
                                <span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">M</span>
                                <span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">L</span>
                            </div>
                        </div>
                    </div>
                \`).join('');
            } catch (e) {
                console.error(e);
                document.getElementById('locations-container').innerHTML = '<div class="text-center text-red-500 py-4">Ошибка загрузки</div>';
            }
        }

        async function openBooking(id) {
            navigate('booking', id);
            const res = await fetch('/api/location/' + id);
            state.activeStationData = await res.json();
            render();
        }

        async function bookLocker() {
            const sizeInput = document.querySelector('input[name="size"]:checked');
            if (!sizeInput) {
                alert('Выберите размер ячейки');
                return;
            }
            
            try {
                const res = await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        stationId: state.activeStation,
                        size: sizeInput.value
                    })
                });
                
                const result = await res.json();
                if (result.success) {
                    state.bookingResult = result;
                    navigate('success');
                } else {
                    alert(result.error || 'Ошибка бронирования');
                }
            } catch (e) {
                alert('Ошибка соединения');
            }
        }

        // --- Admin Logic ---
        function checkAdmin() {
            const pass = document.getElementById('adminPass').value;
            if (pass === '12345') {
                state.isAdmin = true;
                navigate('admin');
            } else {
                alert('Неверный пароль');
            }
        }

        function logoutAdmin() {
            state.isAdmin = false;
            navigate('home');
        }

        async function loadAdminStats() {
            if (!document.getElementById('statRevenue')) return;
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            
            document.getElementById('statRevenue').innerText = data.revenue.toLocaleString() + ' ₽';
            document.getElementById('statActive').innerText = data.activeBookings;
            document.getElementById('statStations').innerText = data.totalStations;
        }
        
        async function renderAdminTab(tab) {
            const content = document.getElementById('adminContent');
            if (tab === 'dashboard') {
                 navigate('admin'); // reload
                 return;
            }
            
            if (tab === 'cells') {
                const res = await fetch('/api/admin/cells');
                const cells = await res.json();
                content.innerHTML = \`
                    <h2 class="text-2xl font-bold mb-6">Управление ячейками</h2>
                    <div class="bg-white rounded-lg shadow overflow-hidden">
                        <table class="w-full">
                            <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th class="p-4">Станция</th>
                                    <th class="p-4">Ячейка</th>
                                    <th class="p-4">Размер</th>
                                    <th class="p-4">Статус</th>
                                    <th class="p-4">Дверь</th>
                                    <th class="p-4">Действия</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                \${cells.map(c => \`
                                    <tr>
                                        <td class="p-4 text-sm text-gray-900">\${c.station_name}</td>
                                        <td class="p-4 text-sm font-bold">\${c.cell_number}</td>
                                        <td class="p-4 text-sm"><span class="px-2 py-1 rounded bg-gray-100">\${c.size}</span></td>
                                        <td class="p-4 text-sm">
                                            <span class="px-2 py-1 rounded-full text-xs font-medium \${c.status === 'free' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                \${c.status}
                                            </span>
                                        </td>
                                        <td class="p-4 text-sm text-gray-500">\${c.door_open ? 'OPEN' : 'Closed'}</td>
                                        <td class="p-4 text-sm">
                                            <button onclick="adminForceOpen(\${c.id})" class="text-red-600 hover:text-red-900 font-medium">Открыть принудительно</button>
                                        </td>
                                    </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    </div>
                \`;
            }

            if (tab === 'logs') {
                const res = await fetch('/api/admin/logs');
                const logs = await res.json();
                content.innerHTML = \`
                    <h2 class="text-2xl font-bold mb-6">Журнал событий</h2>
                    <div class="bg-white rounded-lg shadow overflow-hidden">
                         <table class="w-full">
                            <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th class="p-4">Время</th>
                                    <th class="p-4">Действие</th>
                                    <th class="p-4">Детали</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                 \${logs.map(l => \`
                                    <tr>
                                        <td class="p-4 text-sm text-gray-500">\${new Date(l.created_at).toLocaleString()}</td>
                                        <td class="p-4 text-sm font-bold">\${l.action}</td>
                                        <td class="p-4 text-sm text-gray-700">\${l.details}</td>
                                    </tr>
                                 \`).join('')}
                            </tbody>
                        </table>
                    </div>
                \`;
            }
        }

        async function adminForceOpen(id) {
            if(!confirm('Вы уверены, что хотите открыть ячейку?')) return;
            await fetch('/api/admin/open', {
                method: 'POST',
                body: JSON.stringify({ cellId: id })
            });
            alert('Команда на открытие отправлена');
            renderAdminTab('cells');
        }

        // Initial render
        render();
    </script>
</body>
</html>
  `)
})

export default app
