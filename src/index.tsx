import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'

// --- Types & DB Interfaces ---
interface Env {
  DB: D1Database
}

// --- App Setup ---
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// --- API Backend ---

// 1. Public API
app.get('/api/locations', async (c) => {
  // В реале тут был бы сложный запрос с геолокацией
  const { results } = await c.env.DB.prepare('SELECT * FROM stations').all()
  return c.json(results)
})

app.get('/api/location/:id', async (c) => {
  const id = c.req.param('id')
  const station: any = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first()
  const cells = await c.env.DB.prepare('SELECT * FROM cells WHERE station_id = ?').bind(id).all()
  const tariffs = await c.env.DB.prepare('SELECT * FROM tariffs WHERE station_id = ?').bind(id).all()
  
  // Группировка статистики
  const available = {
    S: cells.results.filter((cell: any) => cell.size === 'S' && cell.status === 'free').length,
    M: cells.results.filter((cell: any) => cell.size === 'M' && cell.status === 'free').length,
    L: cells.results.filter((cell: any) => cell.size === 'L' && cell.status === 'free').length
  }

  return c.json({ station, available, tariffs: tariffs.results })
})

app.post('/api/book', async (c) => {
  const { stationId, size, userType, promoCode } = await c.req.json()
  
  // Логика проверки MICE/Театра
  // Если MICE и нет кода -> ошибка
  // Если Театр и билет не валиден -> ошибка (эмуляция)
  
  const cell: any = await c.env.DB.prepare(
    "SELECT * FROM cells WHERE station_id = ? AND size = ? AND status = 'free' LIMIT 1"
  ).bind(stationId, size).first()

  if (!cell) return c.json({ error: 'Нет свободных ячеек выбранного размера' }, 400)

  // Бронируем
  await c.env.DB.prepare("UPDATE cells SET status = 'booked' WHERE id = ?").bind(cell.id).run()

  // Логируем событие
  const logDetail = `Booking: ${size} | Type: ${userType || 'Standard'} | Code: ${promoCode || 'None'}`
  await c.env.DB.prepare(
    "INSERT INTO logs (station_id, action, details) VALUES (?, 'booking', ?)"
  ).bind(stationId, logDetail).run()

  return c.json({ 
    success: true, 
    cellNumber: cell.cell_number, 
    accessCode: Math.floor(100000 + Math.random() * 900000),
    validUntil: new Date(Date.now() + 24*60*60*1000).toISOString()
  })
})

// 2. Admin API (Secure)
app.get('/api/admin/dashboard', async (c) => {
  const stats = {
    revenue: 142500, // Заглушка, нужна таблица payments
    stations_online: await c.env.DB.prepare('SELECT count(*) as c FROM stations').first('c'),
    cells_occupied: await c.env.DB.prepare("SELECT count(*) as c FROM cells WHERE status != 'free'").first('c'),
    incidents: 2 // Пример
  }
  return c.json(stats)
})

app.get('/api/admin/cells_live', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT c.id, c.cell_number, c.size, c.status, c.door_open, s.name as station_name 
    FROM cells c 
    JOIN stations s ON c.station_id = s.id 
    ORDER BY s.name, c.cell_number
  `).all()
  return c.json(results)
})

app.post('/api/admin/command', async (c) => {
  const { cellId, cmd } = await c.req.json()
  // Тут отправка MQTT команды на контроллер
  if (cmd === 'open') {
    await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(cellId).run()
    await c.env.DB.prepare("INSERT INTO logs (action, details) VALUES ('admin_cmd', ?)").bind(`Force OPEN cell ${cellId}`).run()
  }
  return c.json({ success: true })
})

app.get('/api/admin/logs', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100').all()
  return c.json(results)
})


// --- Frontend Application (SPA) ---
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
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
        .brand-gradient { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-gray-50 h-screen flex flex-col overflow-hidden text-gray-900">

    <div id="app" class="flex-1 flex flex-col h-full relative"></div>

    <script>
        // --- State ---
        const state = { view: 'home', data: {}, user: { phone: null } };

        // --- Components ---

        // 1. Главный экран (Список)
        const HomeView = () => \`
            <div class="flex flex-col h-full">
                <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
                    <div class="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tighter">
                        <i class="fas fa-cube"></i> Lock&Go
                    </div>
                    <button onclick="navigate('admin_login')" class="text-gray-300 hover:text-indigo-600 transition"><i class="fas fa-cog"></i></button>
                </div>
                
                <div class="p-4 space-y-4 overflow-y-auto flex-1 pb-20">
                    <!-- Promo Banner -->
                    <div class="brand-gradient rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div class="absolute top-0 right-0 opacity-10 text-9xl transform translate-x-8 -translate-y-4"><i class="fas fa-layer-group"></i></div>
                        <h2 class="font-bold text-2xl mb-1">Свободные руки</h2>
                        <p class="opacity-90 text-sm mb-4">Инфраструктура вашей свободы</p>
                        <button class="bg-white text-indigo-700 px-4 py-2 rounded-lg text-xs font-bold shadow-md uppercase tracking-wide">Как это работает?</button>
                    </div>

                    <!-- Filters -->
                    <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                        <span class="px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-bold whitespace-nowrap">Все</span>
                        <span class="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold whitespace-nowrap">Торговые центры</span>
                        <span class="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold whitespace-nowrap">Театры</span>
                        <span class="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold whitespace-nowrap">MICE</span>
                    </div>

                    <!-- List Container -->
                    <div id="stations-list" class="space-y-3">
                        <div class="text-center py-8 text-gray-400"><i class="fas fa-circle-notch fa-spin"></i> Загрузка...</div>
                    </div>
                </div>

                <!-- Tab Bar -->
                <div class="bg-white border-t px-6 py-3 flex justify-between items-center text-xs text-gray-400 sticky bottom-0">
                    <button class="flex flex-col items-center text-indigo-600 font-bold"><i class="fas fa-map-marker-alt text-lg mb-1"></i>Карта</button>
                    <button class="flex flex-col items-center hover:text-gray-800"><i class="fas fa-qrcode text-lg mb-1"></i>Сканер</button>
                    <button class="flex flex-col items-center hover:text-gray-800"><i class="fas fa-ticket-alt text-lg mb-1"></i>Аренды</button>
                    <button class="flex flex-col items-center hover:text-gray-800"><i class="fas fa-user text-lg mb-1"></i>Профиль</button>
                </div>
            </div>
        \`;

        // 2. Экран бронирования (Адаптивный под тип локации)
        const BookingView = (station) => {
            const isTheatre = station.type === 'theatre';
            const isMice = station.type === 'mice';
            const isMall = station.type === 'mall';

            return \`
            <div class="flex flex-col h-full bg-white">
                <div class="px-4 py-4 border-b flex items-center sticky top-0 bg-white z-10">
                    <button onclick="navigate('home')" class="mr-4 text-gray-600"><i class="fas fa-arrow-left"></i></button>
                    <h1 class="font-bold text-lg truncate">\${station.name}</h1>
                </div>

                <div class="flex-1 overflow-y-auto p-5">
                    <div class="mb-6">
                        <div class="flex items-start gap-3 text-gray-600 mb-4">
                            <i class="fas fa-map-pin mt-1 text-indigo-500"></i>
                            <span class="text-sm">\${station.address}</span>
                        </div>
                        
                        <!-- Context Badge -->
                        \${isTheatre ? '<div class="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium"><i class="fas fa-theater-masks mr-2"></i>Режим театра: Бесплатно по билету</div>' : ''}
                        \${isMice ? '<div class="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium"><i class="fas fa-id-badge mr-2"></i>Режим MICE: Для участников форума</div>' : ''}
                    </div>

                    <h3 class="font-bold mb-3">Выберите размер</h3>
                    <div id="tariffs-list" class="space-y-3 mb-6">Loading...</div>

                    <!-- Special Inputs -->
                    \${isMice ? \`
                        <div class="mb-6">
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Код участника / Бейдж</label>
                            <input type="text" placeholder="Введите ID с бейджа" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none font-mono">
                        </div>
                    \` : ''}

                    \${isTheatre ? \`
                         <button class="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 mb-6 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-400">
                            <i class="fas fa-camera"></i> Сканировать билет
                         </button>
                    \` : ''}

                </div>

                <div class="p-4 border-t">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-gray-500 text-sm">Итого к оплате:</span>
                        <span class="text-xl font-black text-gray-900" id="total-price">--</span>
                    </div>
                    <button onclick="processBooking(\${station.id})" class="w-full brand-gradient text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 flex justify-between px-6">
                        <span>\${isTheatre || isMice ? 'Получить доступ' : 'Оплатить карту'}</span>
                        <i class="fas fa-chevron-right mt-1"></i>
                    </button>
                    \${isMall ? '<div class="text-center text-xs text-gray-400 mt-2"><i class="fab fa-apple"></i> Pay & Google Pay доступны</div>' : ''}
                </div>
            </div>
            \`;
        };

        // 3. Экран успеха
        const SuccessView = (data) => \`
            <div class="flex flex-col h-full brand-gradient text-white p-8 items-center justify-center text-center relative">
                <div class="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                    <i class="fas fa-lock absolute -top-10 -left-10 text-9xl"></i>
                    <i class="fas fa-check absolute bottom-10 right-10 text-9xl"></i>
                </div>

                <div class="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white text-4xl mb-8 shadow-2xl border border-white/30">
                    <i class="fas fa-unlock-alt"></i>
                </div>
                
                <h1 class="text-3xl font-bold mb-2">Ячейка открыта</h1>
                <p class="text-indigo-100 mb-8 opacity-80">Не забудьте закрыть дверцу после использования</p>

                <div class="bg-white text-gray-900 rounded-2xl p-6 w-full shadow-2xl">
                    <div class="text-gray-400 text-xs uppercase font-bold mb-1">Номер ячейки</div>
                    <div class="text-6xl font-black text-indigo-600 mb-6">\${data.cellNumber}</div>
                    
                    <div class="h-px bg-gray-100 w-full mb-6"></div>

                    <div class="flex justify-between text-left">
                        <div>
                            <div class="text-gray-400 text-xs uppercase font-bold">Пин-код</div>
                            <div class="text-2xl font-mono font-bold">\${data.accessCode}</div>
                        </div>
                        <div class="text-right">
                             <div class="text-gray-400 text-xs uppercase font-bold">Действует до</div>
                             <div class="text-sm font-medium">\${new Date(data.validUntil).toLocaleTimeString().slice(0,5)}</div>
                        </div>
                    </div>
                </div>

                <button onclick="navigate('home')" class="mt-auto w-full py-4 text-white/70 hover:text-white font-medium transition">
                    На главную
                </button>
            </div>
        \`;

        // 4. Admin Dashboard (Enterprise Style)
        const AdminView = () => \`
            <div class="flex h-full bg-gray-100 font-sans">
                <!-- Sidebar -->
                <div class="w-64 bg-gray-900 text-gray-400 hidden md:flex flex-col">
                    <div class="p-6 text-white font-bold text-xl tracking-wider border-b border-gray-800">LOCK&GO <span class="text-xs text-indigo-500 block">ENTERPRISE</span></div>
                    <nav class="flex-1 p-4 space-y-1">
                        <a href="#" onclick="renderAdminTab('dash')" class="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-lg"><i class="fas fa-chart-pie"></i> Дашборд</a>
                        <a href="#" onclick="renderAdminTab('cells')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-th-large"></i> Управление</a>
                        <a href="#" onclick="renderAdminTab('logs')" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-clipboard-list"></i> События</a>
                        <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-users"></i> Клиенты</a>
                    </nav>
                    <div class="p-4 border-t border-gray-800">
                        <button onclick="navigate('home')" class="text-sm hover:text-white"><i class="fas fa-sign-out-alt"></i> Выход</button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex-1 flex flex-col overflow-hidden">
                    <!-- Header -->
                    <header class="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
                        <h2 class="font-bold text-gray-800 text-lg" id="admin-title">Обзор системы</h2>
                        <div class="flex items-center gap-4">
                            <span class="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full"><i class="fas fa-circle text-[8px]"></i> SYSTEM ONLINE</span>
                        </div>
                    </header>

                    <!-- Content Area -->
                    <div class="flex-1 overflow-y-auto p-6" id="admin-content">
                        <!-- Loading -->
                        <div class="flex justify-center mt-10"><i class="fas fa-circle-notch fa-spin text-indigo-600 text-2xl"></i></div>
                    </div>
                </div>
            </div>
        \`;

        // --- Logic ---

        async function navigate(view, params = null) {
            state.view = view;
            const app = document.getElementById('app');
            
            if (view === 'home') {
                app.innerHTML = HomeView();
                loadStations();
            } else if (view === 'booking') {
                app.innerHTML = BookingView(params); // params is station object
                loadTariffs(params.id);
            } else if (view === 'success') {
                app.innerHTML = SuccessView(params);
            } else if (view === 'admin_login') {
                const pass = prompt("Введите пароль администратора:");
                if (pass === '12345') navigate('admin');
                else navigate('home');
            } else if (view === 'admin') {
                app.innerHTML = AdminView();
                renderAdminTab('dash');
            }
        }

        // Data Fetchers
        async function loadStations() {
            try {
                const res = await fetch('/api/locations');
                const data = await res.json();
                const list = document.getElementById('stations-list');
                
                if(data.length === 0) {
                     list.innerHTML = '<div class="p-4 text-center text-gray-400">Нет доступных локаций</div>';
                     return;
                }

                list.innerHTML = data.map(s => {
                    let icon = 'fa-shopping-bag';
                    if(s.type === 'theatre') icon = 'fa-theater-masks';
                    if(s.type === 'mice') icon = 'fa-id-badge';

                    return \`
                    <div onclick='navigate("booking", \${JSON.stringify(s)})' class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition">
                        <div class="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-2xl">
                            <i class="fas \${icon}"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <h3 class="font-bold text-gray-900">\${s.name}</h3>
                                <span class="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded uppercase">\${s.type}</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-1 line-clamp-1">\${s.address}</p>
                            <div class="mt-2 flex items-center gap-2 text-xs text-green-600 font-medium">
                                <i class="fas fa-check-circle"></i> Свободно
                            </div>
                        </div>
                    </div>
                    \`;
                }).join('');
            } catch(e) { console.error(e); }
        }

        async function loadTariffs(stationId) {
            try {
                const res = await fetch('/api/location/' + stationId);
                const { tariffs, available } = await res.json();
                const container = document.getElementById('tariffs-list');
                
                container.innerHTML = tariffs.map(t => {
                    const count = available[t.size] || 0;
                    const isFree = t.price_initial === 0;
                    return \`
                    <label class="block relative group">
                        <input type="radio" name="tariff" value="\${t.size}" class="peer sr-only" \${count === 0 ? 'disabled' : ''} onchange="updateTotal('\${isFree ? 'Бесплатно' : t.price_initial + ' ₽'}')">
                        <div class="p-4 rounded-xl border-2 border-gray-100 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 transition flex justify-between items-center \${count === 0 ? 'opacity-50' : ''}">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700">\${t.size}</div>
                                <div>
                                    <div class="text-sm font-bold text-gray-900">\${t.description}</div>
                                    <div class="text-xs \${count > 0 ? 'text-green-600' : 'text-red-500'}">\${count > 0 ? \`Доступно: \${count}\` : 'Занято'}</div>
                                </div>
                            </div>
                            <div class="font-bold \${isFree ? 'text-green-600' : 'text-gray-900'}">
                                \${isFree ? 'Бесплатно' : t.price_initial + ' ₽'}
                            </div>
                        </div>
                    </label>
                    \`;
                }).join('');
            } catch(e) {}
        }

        function updateTotal(price) {
            document.getElementById('total-price').innerText = price;
        }

        async function processBooking(stationId) {
            const sizeInput = document.querySelector('input[name="tariff"]:checked');
            if(!sizeInput) return alert('Выберите размер ячейки');

            // Симуляция задержки оплаты
            const btn = document.querySelector('button[onclick^="processBooking"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Обработка...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/book', {
                    method: 'POST',
                    body: JSON.stringify({ stationId, size: sizeInput.value })
                });
                const result = await res.json();
                
                setTimeout(() => {
                    if(result.success) navigate('success', result);
                    else {
                        alert(result.error);
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                    }
                }, 1500); // Имитация процессинга
            } catch(e) {
                alert('Network Error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        // Admin Logic
        async function renderAdminTab(tab) {
            const content = document.getElementById('admin-content');
            
            if (tab === 'dash') {
                const res = await fetch('/api/admin/dashboard');
                const stats = await res.json();
                content.innerHTML = \`
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-600">
                            <div class="text-gray-400 text-xs font-bold uppercase">Выручка (День)</div>
                            <div class="text-2xl font-black text-gray-900">\${stats.revenue.toLocaleString()} ₽</div>
                        </div>
                        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                            <div class="text-gray-400 text-xs font-bold uppercase">Активные аренды</div>
                            <div class="text-2xl font-black text-gray-900">\${stats.cells_occupied}</div>
                        </div>
                         <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                            <div class="text-gray-400 text-xs font-bold uppercase">Станции в сети</div>
                            <div class="text-2xl font-black text-gray-900">\${stats.stations_online}</div>
                        </div>
                        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                            <div class="text-gray-400 text-xs font-bold uppercase">Инциденты</div>
                            <div class="text-2xl font-black text-gray-900">\${stats.incidents}</div>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <h3 class="font-bold mb-4">График загрузки сети</h3>
                        <div class="h-64 bg-gray-50 rounded flex items-center justify-center text-gray-400">[Chart.js Placeholder]</div>
                    </div>
                \`;
            } else if (tab === 'cells') {
                const res = await fetch('/api/admin/cells_live');
                const cells = await res.json();
                content.innerHTML = \`
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-gray-50 text-gray-500 font-bold border-b">
                                <tr><th class="p-4">Станция</th><th class="p-4">Ячейка</th><th class="p-4">Статус</th><th class="p-4">Управление</th></tr>
                            </thead>
                            <tbody class="divide-y">
                                \${cells.map(c => \`
                                <tr>
                                    <td class="p-4">\${c.station_name}</td>
                                    <td class="p-4 font-mono font-bold">\${c.cell_number} (\${c.size})</td>
                                    <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-bold \${c.status==='free'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">\${c.status}</span></td>
                                    <td class="p-4">
                                        <button onclick="adminCmd(\${c.id}, 'open')" class="text-indigo-600 font-bold hover:underline">Открыть</button>
                                    </td>
                                </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    </div>
                \`;
            } else if (tab === 'logs') {
                const res = await fetch('/api/admin/logs');
                const logs = await res.json();
                 content.innerHTML = \`
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-gray-50 text-gray-500 font-bold border-b">
                                <tr><th class="p-4">Время</th><th class="p-4">Действие</th><th class="p-4">Детали</th></tr>
                            </thead>
                            <tbody class="divide-y">
                                \${logs.map(l => \`
                                <tr>
                                    <td class="p-4 text-gray-500">\${new Date(l.created_at).toLocaleString()}</td>
                                    <td class="p-4 font-bold">\${l.action}</td>
                                    <td class="p-4 text-gray-700">\${l.details}</td>
                                </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    </div>
                \`;
            }
        }

        async function adminCmd(cellId, cmd) {
            if(!confirm('Выполнить действие?')) return;
            await fetch('/api/admin/command', {
                method: 'POST',
                body: JSON.stringify({ cellId, cmd })
            });
            renderAdminTab('cells');
        }

        // Init
        navigate('home');

    </script>
</body>
</html>
  `)
})

export default app
