import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { DB: D1Database; ASSETS: Fetcher }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/*', cors())

const api = new Hono<{ Bindings: Bindings }>()

// --- API ---
api.get('/locations', async (c) => {
  try { return c.json((await c.env.DB.prepare('SELECT * FROM stations').all()).results) } 
  catch (e) { return c.json({ error: e.message }, 500) }
})

api.get('/location/:id', async (c) => {
  const id = c.req.param('id')
  const station = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first()
  if(!station) return c.json({error: 'Not found'}, 404)
  const tariffs = (await c.env.DB.prepare('SELECT * FROM tariffs WHERE station_id = ?').bind(id).all()).results
  const { results: cells } = await c.env.DB.prepare('SELECT * FROM cells WHERE station_id = ? ORDER BY cell_number').bind(id).all()
  
  // Агрегация для клиента
  const availability = []
  const sizes = ['S', 'M', 'L', 'XL']
  sizes.forEach(sz => {
    const total = cells.filter(c => c.size === sz).length
    if(total > 0) {
      const free = cells.filter(c => c.size === sz && c.status === 'free').length
      availability.push({ size: sz, total, free })
    }
  })

  return c.json({ station, tariffs, availability, cells_debug: cells })
})

api.post('/book', async (c) => {
  const { station_id, size } = await c.req.json()
  const cell = await c.env.DB.prepare(`SELECT id, cell_number FROM cells WHERE station_id = ? AND size = ? AND status = 'free' LIMIT 1`).bind(station_id, size).first()
  if (!cell) return c.json({ success: false, message: 'Нет ячеек' }, 400)
  const tariff = await c.env.DB.prepare(`SELECT * FROM tariffs WHERE station_id = ? AND size = ?`).bind(station_id, size).first()
  const price = tariff ? tariff.price_initial : 0
  const currency = tariff ? tariff.currency : 'RUB'
  await c.env.DB.prepare("UPDATE cells SET status = 'booked' WHERE id = ?").bind(cell.id).run()
  await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, ?, ?)").bind(station_id, 'booking', `Booked Cell #${cell.cell_number} (${size}). Price: ${price} ${currency}`).run()
  return c.json({ success: true, booking: { id: Date.now(), cell_number: cell.cell_number, code: Math.floor(1000 + Math.random() * 9000), price_info: `${price} ${currency}`, station_id } })
})

// Админские функции
api.post('/admin/open', async (c) => {
  const { cell_id, station_id } = await c.req.json()
  await c.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(cell_id).run()
  await c.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, ?, ?)").bind(station_id, 'admin_open', `Remote open cell #${cell_id}`).run()
  return c.json({ success: true })
})

api.post('/admin/reset', async (c) => {
    const { cell_id } = await c.req.json()
    await c.env.DB.prepare("UPDATE cells SET status = 'free', door_open = 0 WHERE id = ?").bind(cell_id).run()
    return c.json({ success: true })
})

api.post('/hardware/sync', async (c) => c.json({ command: 'ok', timestamp: Date.now() }))
app.route('/api', api)


// --- HTML (Client + Admin) ---
const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Lock&Go</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');body{font-family:'Inter',sans-serif}.hide-scrollbar::-webkit-scrollbar{display:none}</style></head>
<body class="bg-gray-50 h-screen flex flex-col overflow-hidden">
    
    <!-- CLIENT APP -->
    <div id="app-client" class="flex-1 flex flex-col relative">
        <header class="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
            <div class="flex items-center gap-2 font-bold text-xl"><div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><i class="fas fa-cube"></i></div>Lock<span class="text-blue-600">&</span>Go</div>
            <div onclick="openAdminAuth()" class="text-gray-300 hover:text-gray-600 cursor-pointer on-hold"><i class="fas fa-cog"></i></div>
        </header>

        <!-- TABS -->
        <div id="tab-home" class="tab-content flex-1 overflow-y-auto pb-20 hide-scrollbar">
            <div class="mx-4 mt-4 p-6 bg-gradient-to-r from-gray-900 to-blue-900 rounded-2xl text-white shadow-lg relative overflow-hidden mb-6">
                <div class="relative z-10"><h2 class="text-xl font-bold">Свободные руки</h2><h3 class="text-lg font-light opacity-90 mb-4">успешные сделки</h3><button onclick="document.getElementById('locations-list').scrollIntoView({behavior:'smooth'})" class="bg-white text-blue-900 px-4 py-2 rounded-full text-sm font-bold shadow-md">Найти локер</button></div>
                <i class="fas fa-shopping-bag absolute -bottom-4 -right-4 text-8xl opacity-10 transform rotate-12"></i>
            </div>
            <div class="px-4 pb-4 space-y-4" id="locations-list"><div class="text-center py-10 text-gray-400">Загрузка...</div></div>
        </div>

        <div id="tab-my" class="tab-content hidden flex-1 overflow-y-auto pb-20 p-4">
            <h2 class="text-2xl font-bold mb-4">Мои аренды</h2>
            <div id="my-bookings-list" class="space-y-3">
                <div class="text-gray-400 text-center py-10">У вас нет активных аренд</div>
            </div>
        </div>

        <!-- MODALS -->
        <div id="modal-booking" class="hidden fixed inset-0 bg-white z-50 flex flex-col">
            <div class="p-4 border-b flex gap-4 items-center"><button onclick="closeModal()" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><i class="fas fa-arrow-left"></i></button><h2 class="font-bold text-lg" id="bk-name">...</h2></div>
            <div class="flex-1 overflow-y-auto p-6"><h3 class="font-bold mb-4">Выберите размер</h3><div id="bk-list" class="space-y-3"></div></div>
            <div class="p-6 border-t"><button id="bk-btn" onclick="doBook()" class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg" disabled>Выберите размер</button></div>
        </div>

        <div id="modal-success" class="hidden fixed inset-0 bg-blue-600 text-white z-50 flex flex-col items-center justify-center p-8 text-center">
            <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 animate-bounce"><i class="fas fa-check text-4xl text-blue-600"></i></div>
            <h2 class="text-3xl font-bold mb-2">Готово!</h2>
            <div class="bg-white/10 backdrop-blur rounded-xl p-6 w-full max-w-sm mb-8 border border-white/20">
                <div class="text-sm opacity-70">Ячейка №</div><div class="text-5xl font-mono font-bold mb-4" id="sc-num">--</div>
                <div class="text-sm opacity-70">Код</div><div class="text-2xl font-mono font-bold tracking-widest" id="sc-code">----</div>
            </div>
            <button onclick="finishBook()" class="bg-white text-blue-600 px-8 py-3 rounded-full font-bold">OK</button>
        </div>

        <!-- NAV -->
        <nav class="fixed bottom-0 w-full bg-white border-t flex justify-around py-3 pb-safe z-40">
            <button onclick="switchTab('home')" class="nav-btn active text-blue-600 flex flex-col items-center text-xs px-4"><i class="fas fa-map-marked-alt text-xl"></i>Карта</button>
            <button onclick="switchTab('my')" class="nav-btn text-gray-400 flex flex-col items-center text-xs px-4"><i class="fas fa-ticket-alt text-xl"></i>Аренды</button>
        </nav>
    </div>

    <!-- ADMIN APP -->
    <div id="app-admin" class="hidden flex-1 flex flex-col bg-gray-100">
        <header class="bg-gray-800 text-white px-6 py-4 shadow flex justify-between items-center">
            <div class="font-bold"><i class="fas fa-user-shield mr-2"></i>Инженерное меню</div>
            <button onclick="closeAdmin()" class="text-gray-400">Выход</button>
        </header>
        <div class="flex-1 overflow-y-auto p-4">
            <div class="mb-4"><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Выбор станции</label><select id="admin-station-select" onchange="loadAdminStation()" class="w-full p-3 rounded shadow bg-white"></select></div>
            <div id="admin-cells-grid" class="grid grid-cols-2 gap-4"></div>
        </div>
    </div>

    <script>
        // --- LOGIC ---
        let currentStation=null, selSize=null, selTariff=null;
        const API='/api';

        // Init
        if(window.location.pathname === '/admin') openAdmin();
        else loadLocations();
        loadMyBookings();

        // --- CLIENT ---
        async function loadLocations(){
            const r=await fetch(API+'/locations');
            const d=await r.json();
            const c=document.getElementById('locations-list');
            const s=document.getElementById('admin-station-select');
            c.innerHTML=''; s.innerHTML='';
            d.forEach(x=>{
                // Client Card
                let i='fa-shopping-bag',t='ТЦ';
                if(x.type==='theatre'){i='fa-theater-masks';t='Театр'}
                if(x.type==='mice'){i='fa-briefcase';t='MICE'}
                c.innerHTML+=\`<div onclick="openBookModal(\${x.id}, '\${x.name}')" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 active:scale-[0.99] transition cursor-pointer"><div class="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-2xl shrink-0"><i class="fas \${i}"></i></div><div class="flex-1"><div class="flex justify-between"><h3 class="font-bold">\${x.name}</h3><span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">\${t}</span></div><p class="text-xs text-gray-500 mt-1">\${x.address}</p></div></div>\`;
                // Admin Option
                s.innerHTML+=\`<option value="\${x.id}">\${x.name}</option>\`;
            });
            if(d.length>0) loadAdminStation(d[0].id);
        }

        async function openBookModal(id, name){
            currentStation=id;
            document.getElementById('bk-name').textContent=name;
            document.getElementById('modal-booking').classList.remove('hidden');
            const c=document.getElementById('bk-list');
            c.innerHTML='Loading...';
            const r=await fetch(API+\`/location/\${id}\`);
            const d=await r.json();
            c.innerHTML='';
            
            const sizes={S:'Small',M:'Medium',L:'Large',XL:'X-Large'};
            if(d.tariffs.length===0) c.innerHTML='Нет тарифов';
            
            d.tariffs.forEach(t=>{
                const sz=t.size;
                const av=d.availability.find(a=>a.size===sz)||{free:0};
                const ok=av.free>0;
                const el=document.createElement('div');
                el.className=\`border rounded-xl p-4 flex justify-between items-center \${ok?'bg-white':'bg-gray-50 opacity-50'}\`;
                el.onclick=()=>{
                    if(!ok) return;
                    selSize=sz; selTariff=t;
                    document.querySelectorAll('#bk-list > div').forEach(x=>x.classList.remove('border-blue-600','ring-2'));
                    el.classList.add('border-blue-600','ring-2');
                    document.getElementById('bk-btn').disabled=false;
                    document.getElementById('bk-btn').textContent=t.price_initial===0?'Бесплатно':\`Opalтить \${t.price_initial}₽\`;
                };
                el.innerHTML=\`<div><div class="font-bold">\${sizes[sz]||sz}</div><div class="text-xs text-gray-500">\${t.description}</div></div><div class="font-bold \${ok?'text-blue-600':'text-red-500'}">\${ok?av.free+' free':'Full'}</div>\`;
                c.appendChild(el);
            });
        }

        async function doBook(){
            const btn=document.getElementById('bk-btn');
            btn.disabled=true; btn.innerText='Processing...';
            try{
                const r=await fetch(API+'/book',{method:'POST',body:JSON.stringify({station_id:currentStation,size:selSize})});
                const d=await r.json();
                if(d.success){
                    // Save to local storage
                    const booking={...d.booking, stationName: document.getElementById('bk-name').textContent, date: new Date().toLocaleString()};
                    const list=JSON.parse(localStorage.getItem('bookings')||'[]');
                    list.unshift(booking);
                    localStorage.setItem('bookings', JSON.stringify(list));
                    loadMyBookings();
                    
                    // Show success
                    document.getElementById('sc-num').textContent=d.booking.cell_number;
                    document.getElementById('sc-code').textContent=d.booking.code;
                    document.getElementById('modal-booking').classList.add('hidden');
                    document.getElementById('modal-success').classList.remove('hidden');
                } else { alert(d.message); }
            } catch(e){ alert('Error'); }
            btn.disabled=false;
        }

        function finishBook(){
            document.getElementById('modal-success').classList.add('hidden');
            switchTab('my');
        }

        function closeModal(){ document.getElementById('modal-booking').classList.add('hidden'); }

        function switchTab(t){
            document.querySelectorAll('.tab-content').forEach(x=>x.classList.add('hidden'));
            document.getElementById('tab-'+t).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(x=>x.classList.replace('text-blue-600','text-gray-400'));
            // Simple active state logic
            event.currentTarget.classList.replace('text-gray-400','text-blue-600');
        }

        function loadMyBookings(){
            const l=JSON.parse(localStorage.getItem('bookings')||'[]');
            const c=document.getElementById('my-bookings-list');
            if(l.length===0) return;
            c.innerHTML='';
            l.forEach(b=>{
                c.innerHTML+=\`<div class="bg-white p-4 rounded-xl shadow border-l-4 border-blue-600">
                    <div class="flex justify-between font-bold"><span>\${b.stationName}</span><span>#\${b.cell_number}</span></div>
                    <div class="text-xs text-gray-500 mt-1">Код: <span class="font-mono text-lg text-black ml-2">\${b.code}</span></div>
                    <div class="text-xs text-gray-400 mt-2">\${b.date}</div>
                </div>\`;
            });
        }

        // --- ADMIN ---
        function openAdminAuth(){
            if(prompt('Пароль инженера:')==='12345') openAdmin();
        }
        function openAdmin(){
            document.getElementById('app-client').classList.add('hidden');
            document.getElementById('app-admin').classList.remove('hidden');
            loadAdminStation(document.getElementById('admin-station-select').value || 1);
        }
        function closeAdmin(){
            document.getElementById('app-admin').classList.add('hidden');
            document.getElementById('app-client').classList.remove('hidden');
        }
        async function loadAdminStation(id){
            if(!id) id = document.getElementById('admin-station-select').value;
            const c=document.getElementById('admin-cells-grid');
            c.innerHTML='Loading...';
            const r=await fetch(API+\`/location/\${id}\`);
            const d=await r.json();
            c.innerHTML='';
            d.cells_debug.forEach(cell=>{
                const col=cell.status==='free'?'bg-green-100 text-green-800':(cell.status==='occupied'?'bg-red-100 text-red-800':'bg-yellow-100');
                const door=cell.door_open?'border-red-500 border-2':'border-transparent border';
                c.innerHTML+=\`<div class="p-4 rounded shadow \${col} \${door}">
                    <div class="font-bold text-xl flex justify-between">#\${cell.cell_number} <span class="text-xs opacity-50">\${cell.size}</span></div>
                    <div class="text-xs uppercase font-bold mt-1">\${cell.status}</div>
                    <div class="text-xs mt-1">\${cell.door_open?'DOOR OPEN':'DOOR CLOSED'}</div>
                    <div class="mt-3 flex gap-2">
                        <button onclick="adminAction('open', \${cell.id}, \${id})" class="bg-white/50 px-2 py-1 rounded text-xs font-bold border">OPEN</button>
                        <button onclick="adminAction('reset', \${cell.id}, \${id})" class="bg-white/50 px-2 py-1 rounded text-xs font-bold border">RESET</button>
                    </div>
                </div>\`;
            });
        }
        async function adminAction(act, cid, sid){
            if(!confirm('Sure?')) return;
            await fetch(API+\`/admin/\${act}\`,{method:'POST',body:JSON.stringify({cell_id:cid, station_id:sid})});
            loadAdminStation(sid);
        }
    </script>
</body></html>`;

app.get('/*', (c) => c.html(html))
export default app
