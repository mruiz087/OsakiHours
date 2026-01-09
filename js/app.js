const OFFICIAL_HOLIDAYS = ["01-01", "01-06", "04-02", "04-03", "04-06", "05-01", "07-25", "08-15", "10-12", "11-01", "12-06", "12-08", "12-25"];
const DEFAULT_SETTINGS = { 
    work: 1592, vacation: 168, ap: 40, 
    workDay: 7.17, workNight: 11.17,
    apVacDay: 7, apVacNight: 10
};

const translations = {
    es: {
        balance: "Balance Exceso / Defecto", vacation: "Vacaciones", ap: "Horas AP",
        startContract: "Inicio Contrato", endContract: "Fin Contrato", settings: "Ajustes",
        lang: "Idioma / Hizkuntza", holidays: "Festivos Locales", add: "Añadir",
        annualBag: "Bolsa Anual (Horas)", shiftValue: "Valores Turnos TRABAJO (Dec)",
        apVacValue: "Valores AP / VACACIONES (Dec)",
        dataTitle: "Datos y Backup", pdf: "Descargar PDF", export: "Exportar Copia JSON",
        import: "Restaurar Copia", reset: "Borrar datos de contrato y turnos",
        work: "Laboral", vacs: "Vacas", delete: "Borrar", save: "Guardar",
        overlap: "Solape (Minutos)", cal: "Calendario", dat: "Datos",
        vDay: "Diurna", vNight: "Nocturna"
    },
    eu: {
        balance: "Oreka Gehiegizkoa / Gutxiegizkoa", vacation: "Oporrak", ap: "AP Orduak",
        startContract: "Kontratu Hasiera", endContract: "Kontratu Amaiera", settings: "Ezarpenak",
        lang: "Hizkuntza / Idioma", holidays: "Herriko Jaiak", add: "Gehitu",
        annualBag: "Urteko Poltsa (Orduak)", shiftValue: "LAN Txanden Balioak (Dec)",
        apVacValue: "AP / OPOR Txanden Balioak (Dec)",
        dataTitle: "Datuak eta Backup", pdf: "PDFa Deskargatu", export: "JSON Kopia Esportatu",
        import: "Kopia Berreskuratu", reset: "Kontratu eta txanda datuak ezabatu",
        work: "Lanekoa", vacs: "Oporrak", delete: "Ezabatu", save: "Gorde",
        overlap: "Solapea (Minutuak)", cal: "Egutegia", dat: "Datuak",
        vDay: "Egunekoa", vNight: "Gauekoa"
    }
};

let state = {
    history: JSON.parse(localStorage.getItem('osaki_history')) || [],
    contract: JSON.parse(localStorage.getItem('osaki_contract')) || { start: '', end: '' },
    settings: JSON.parse(localStorage.getItem('osaki_settings')) || DEFAULT_SETTINGS,
    localHolidays: JSON.parse(localStorage.getItem('osaki_local_holidays')) || [],
    lang: localStorage.getItem('osaki_lang') || 'es'
};

let viewDate = new Date();
let selectedShiftHours = 0;
let currentType = 'work';
let lastSelectedBtnLabel = '';

function formatHours(decimal) {
    const isNegative = decimal < 0;
    const absVal = Math.abs(decimal);
    const h = Math.floor(absVal);
    const m = Math.round((absVal - h) * 60);
    return `${isNegative ? '-' : ''}${h}h ${String(m).padStart(2, '0')}m`;
}

document.addEventListener('DOMContentLoaded', () => {
    syncInputs();
    renderLocalHolidays();
    recalculateEverything();
    renderCalendar();
    applyLanguage();
});

function applyLanguage() {
    const l = translations[state.lang];
    const map = {
        'label-balance': l.balance, 'label-vac-top': l.vacation, 'label-ap-top': l.ap,
        'label-start': l.startContract, 'label-end': l.endContract, 'title-settings': l.settings,
        'label-lang': l.lang, 'label-holidays': l.holidays, 'btn-add-holiday': l.add,
        'label-bag': l.annualBag, 'label-set-vac': l.vacation.substring(0,5).toUpperCase(),
        'label-shift-val': l.shiftValue, 'label-shift-apvac': l.apVacValue,
        'title-data': l.dataTitle, 'btn-pdf': l.pdf, 'btn-export': l.export, 'btn-import': l.import, 
        'btn-reset': l.reset, 'type-work': l.work, 'type-vacation': l.vacs, 'btn-delete': l.delete,
        'btn-save': l.save, 'label-overlap': l.overlap, 'nav-label-cal': l.cal,
        'nav-label-set': l.settings, 'nav-label-dat': l.dat,
        'label-vac-day': l.vDay, 'label-vac-night': l.vNight
    };
    for (let id in map) {
        const el = document.getElementById(id);
        if (el) el.innerText = map[id];
    }
    document.getElementById('lang-es').className = `flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${state.lang === 'es' ? 'osaki-blue text-white border-transparent' : 'bg-white text-slate-400 border-slate-100'}`;
    document.getElementById('lang-eu').className = `flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${state.lang === 'eu' ? 'osaki-blue text-white border-transparent' : 'bg-white text-slate-400 border-slate-100'}`;
}

function syncInputs() {
    const s = state.settings;
    document.getElementById('set-work').value = s.work;
    document.getElementById('set-vac').value = s.vacation;
    document.getElementById('set-ap').value = s.ap;
    document.getElementById('set-work-day').value = s.workDay;
    document.getElementById('set-work-night').value = s.workNight;
    document.getElementById('set-apvac-day').value = s.apVacDay;
    document.getElementById('set-apvac-night').value = s.apVacNight;
    if(state.contract.start) document.getElementById('start-date').value = state.contract.start;
    if(state.contract.end) document.getElementById('end-date').value = state.contract.end;
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    document.getElementById('current-month-year').innerText = new Intl.DateTimeFormat(state.lang === 'eu' ? 'eu-ES' : 'es-ES', { month: 'long', year: 'numeric' }).format(viewDate);
    
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    let startOffset = (firstDay === 0) ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) grid.innerHTML += `<div class="bg-slate-50 h-16 opacity-50"></div>`;

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const shift = state.history.find(e => e.date === dateStr);
        const holiday = isHoliday(dateStr);
        const inContract = state.contract.start && state.contract.end && 
                           new Date(dateStr) >= new Date(state.contract.start) && 
                           new Date(dateStr) <= new Date(state.contract.end);

        let cssClass = inContract ? 'bg-white' : 'day-off-contract';
        if (shift) {
            if (shift.type === 'vacation') cssClass = 'day-vacation';
            else if (shift.type === 'ap') cssClass = 'day-ap';
            else if (holiday) cssClass = 'day-holiday';
            else cssClass = 'day-work';
        } else if (holiday && inContract) cssClass = 'day-holiday';

        let icons = '';
        if (holiday) icons += '<span class="absolute top-1 right-1 text-[8px] text-red-500 font-black">★</span>';
        
        // Iconos específicos para Vacaciones (Sol/Luna) sin texto
        if (shift && shift.type === 'vacation') {
            const isNightV = shift.btnLabel === 'V-N';
            icons += `<span class="absolute top-1 left-1 text-[8px] text-orange-500 font-black"><i class="fas fa-${isNightV ? 'moon' : 'sun'}"></i></span>`;
        }

        grid.innerHTML += `
            <div onclick="attemptOpenDay('${dateStr}', ${inContract})" class="${cssClass} h-16 border-r border-b border-slate-100 flex flex-col items-center justify-center relative cursor-pointer active:scale-95 transition-transform">
                ${icons}
                <span class="text-xs font-bold ${holiday ? 'text-red-600' : ''}">${day}</span>
                ${shift && shift.btnLabel && shift.type !== 'vacation' ? `<span class="text-[10px] mt-1 badge-${shift.btnLabel}">${shift.btnLabel}</span>` : ''}
            </div>`;
    }
}

function openDay(date) {
    document.getElementById('input-date').value = date;
    document.getElementById('modal-date-title').innerText = new Date(date).toLocaleDateString(state.lang === 'eu' ? 'eu-ES' : 'es-ES', { day:'numeric', month:'long'});
    const existing = state.history.find(e => e.date === date);
    if (existing) {
        selectMainType(existing.type);
        document.getElementById('input-overlap').value = existing.overlap || 0;
        if(existing.btnLabel) setShift(existing.btnLabel, document.getElementById(`btn-${existing.btnLabel}`));
        document.getElementById('btn-delete').classList.remove('hidden');
    } else { 
        selectMainType('work'); document.getElementById('btn-delete').classList.add('hidden'); 
    }
    document.getElementById('shift-modal').classList.remove('hidden');
}

function selectMainType(type) {
    currentType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-600'));
    document.getElementById(`type-${type}`).classList.add('border-blue-500', 'bg-blue-50', 'text-blue-600');
    document.getElementById('shifts-work-ap').classList.toggle('hidden', type === 'vacation');
    document.getElementById('shifts-vacation').classList.toggle('hidden', type !== 'vacation');
    document.getElementById('overlap-container').classList.toggle('hidden', type !== 'work');
}

function setShift(type, btn) {
    document.querySelectorAll('.shift-btn').forEach(b => b.classList.remove('shift-selected-M', 'shift-selected-T', 'shift-selected-N', 'shift-selected-V-D', 'shift-selected-V-N'));
    btn.classList.add(`shift-selected-${type}`);
    lastSelectedBtnLabel = type;
    
    // Lógica de valores por tipo
    if (currentType === 'work') {
        selectedShiftHours = (type === 'N') ? state.settings.workNight : state.settings.workDay;
    } else {
        selectedShiftHours = (type === 'N' || type === 'V-N') ? state.settings.apVacNight : state.settings.apVacDay;
    }
}

function saveShift() {
    const date = document.getElementById('input-date').value;
    const overlap = currentType === 'work' ? (parseFloat(document.getElementById('input-overlap').value) || 0) : 0;
    state.history = state.history.filter(e => e.date !== date);
    state.history.push({ date, type: currentType, real: selectedShiftHours + (overlap / 60), overlap, btnLabel: lastSelectedBtnLabel });
    localStorage.setItem('osaki_history', JSON.stringify(state.history));
    recalculateEverything(); renderCalendar(); closeModal();
}

function updateSettings() {
    state.settings = {
        work: parseFloat(document.getElementById('set-work').value),
        vacation: parseFloat(document.getElementById('set-vac').value),
        ap: parseFloat(document.getElementById('set-ap').value),
        workDay: parseFloat(document.getElementById('set-work-day').value),
        workNight: parseFloat(document.getElementById('set-work-night').value),
        apVacDay: parseFloat(document.getElementById('set-apvac-day').value),
        apVacNight: parseFloat(document.getElementById('set-apvac-night').value)
    };
    localStorage.setItem('osaki_settings', JSON.stringify(state.settings));
    recalculateEverything();
}

// Funciones Auxiliares
function isHoliday(dateStr) { return OFFICIAL_HOLIDAYS.includes(dateStr.substring(5)) || state.localHolidays.includes(dateStr); }
function changeLanguage(l) { state.lang = l; localStorage.setItem('osaki_lang', l); applyLanguage(); renderCalendar(); }
function closeModal() { document.getElementById('shift-modal').classList.add('hidden'); }
function changeMonth(o) { viewDate.setMonth(viewDate.getMonth() + o); renderCalendar(); }
function attemptOpenDay(d, inC) { if (!state.contract.start || !state.contract.end) { alert(state.lang === 'eu' ? "Kontratuaren datak ezarri" : "Configura fechas contrato"); return; } if (inC) openDay(d); }

function recalculateEverything() {
    let ratios = { work: 0, vac: 0, ap: 0 };
    if (state.contract.start && state.contract.end) {
        const diff = Math.ceil(Math.abs(new Date(state.contract.end) - new Date(state.contract.start)) / 86400000) + 1;
        const r = Math.min(diff / 365, 1);
        ratios.work = state.settings.work * r;
        ratios.vac = state.settings.vacation * r;
        ratios.ap = state.settings.ap * r;
    }
    let worked = 0, uVac = 0, uAP = 0;
    state.history.forEach(e => {
        if (e.type === 'work') worked += e.real;
        else if (e.type === 'vacation') uVac += e.real;
        else if (e.type === 'ap') uAP += e.real;
    });
    const balance = worked - ratios.work;
    const balanceEl = document.getElementById('total-balance');
    balanceEl.innerText = formatHours(balance);
    balanceEl.classList.remove('balance-positive', 'balance-negative');
    if (balance > 0) balanceEl.classList.add('balance-positive');
    else if (balance < 0) balanceEl.classList.add('balance-negative');
    document.getElementById('remaining-vac').innerText = formatHours(ratios.vac - uVac);
    document.getElementById('remaining-ap').innerText = formatHours(ratios.ap - uAP);
}

function addLocalHoliday() {
    const v = document.getElementById('local-holiday-input').value;
    if(v && !state.localHolidays.includes(v)) {
        state.localHolidays.push(v);
        localStorage.setItem('osaki_local_holidays', JSON.stringify(state.localHolidays));
        renderLocalHolidays(); renderCalendar();
    }
}
function removeLocalHoliday(d) {
    state.localHolidays = state.localHolidays.filter(x => x !== d);
    localStorage.setItem('osaki_local_holidays', JSON.stringify(state.localHolidays));
    renderLocalHolidays(); renderCalendar();
}
function renderLocalHolidays() {
    const list = document.getElementById('local-holidays-list');
    list.innerHTML = '';
    state.localHolidays.forEach(d => {
        list.innerHTML += `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">${d.split('-').reverse().slice(0,2).join('/')} <i class="fas fa-times cursor-pointer" onclick="removeLocalHoliday('${d}')"></i></span>`;
    });
}
function updateContract() {
    state.contract = { start: document.getElementById('start-date').value, end: document.getElementById('end-date').value };
    localStorage.setItem('osaki_contract', JSON.stringify(state.contract));
    recalculateEverything(); renderCalendar();
}
function exportBackup() {
    const blob = new Blob([JSON.stringify(state)], {type: "application/json"});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "osaki_backup.json"; a.click();
}
function importBackup(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        state = JSON.parse(e.target.result);
        localStorage.setItem('osaki_history', JSON.stringify(state.history));
        localStorage.setItem('osaki_settings', JSON.stringify(state.settings));
        localStorage.setItem('osaki_contract', JSON.stringify(state.contract));
        localStorage.setItem('osaki_local_holidays', JSON.stringify(state.localHolidays || []));
        localStorage.setItem('osaki_lang', state.lang || 'es');
        location.reload();
    };
    reader.readAsText(file);
}
function showTab(t) {
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(x => { x.classList.add('text-slate-400'); x.classList.remove('active'); });
    document.getElementById(`tab-${t}`).classList.add('active');
    document.getElementById(`nav-${t}`).classList.add('active');
    document.getElementById(`nav-${t}`).classList.remove('text-slate-400');
}
async function exportToPDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.text(`Osakidetza - Report`, 14, 20);
    const rows = state.history.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e => [new Date(e.date).toLocaleDateString(), e.type.toUpperCase(), e.btnLabel || '-', formatHours(e.real)]);
    doc.autoTable({ head: [['Data', 'Tipo', 'Txanda', 'H:min']], body: rows, startY: 30 });
    doc.save("Cuadrante.pdf");
}
function deleteCurrentDay() {
    state.history = state.history.filter(e => e.date !== document.getElementById('input-date').value);
    localStorage.setItem('osaki_history', JSON.stringify(state.history));
    recalculateEverything(); renderCalendar(); closeModal();
}

function resetAllData() { if(confirm("¿Borrar?")) { localStorage.clear(); location.reload(); } }

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW no registrado", err));
}

