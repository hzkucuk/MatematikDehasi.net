// ================================================================
// Cloudflare D1 REST API
// ================================================================
const API_BASE = 'https://matematik-api.matematikdehasi.workers.dev/api';

async function api(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `API hatası: ${res.status}`);
    }
    return res.json();
}

// KVKK onay kontrolü — sayfa yüklenince
checkKvkkConsent();

// ================================================================
// Modern Onay Modalı (confirm yerine)
// ================================================================
function customConfirm({ title = 'Emin misiniz?', message = '', icon = '⚠️', okText = 'Tamam', cancelText = 'İptal', okClass = 'btn-primary' } = {}) {
    return new Promise(resolve => {
        const modal = document.getElementById('custom-confirm-modal');
        document.getElementById('confirm-icon').textContent = icon;
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        okBtn.textContent = okText;
        cancelBtn.textContent = cancelText;
        okBtn.className = `btn ${okClass}`;
        modal.style.display = 'flex';

        function cleanup(result) {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            resolve(result);
        }
        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

// ================================================================
// Öğretmen Kodu Üretici
// ================================================================
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += SAFE_CHARS.charAt(Math.floor(Math.random() * SAFE_CHARS.length));
    }
    return code;
}

function formatCode(raw) {
    const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length <= 3) return clean;
    return clean.slice(0, 3) + '-' + clean.slice(3, 6);
}

function cleanCode(input) {
    return input.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

// ================================================================
// Cihaz Parmak İzi ve KVKK
// ================================================================
function getDeviceId() {
    let id = localStorage.getItem('md_device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('md_device_id', id);
    }
    return id;
}

async function collectDeviceInfo() {
    const info = {
        deviceId: getDeviceId(),
        userAgent: navigator.userAgent,
        platform: navigator.platform || 'N/A',
        language: navigator.language || 'N/A',
        cpuCores: navigator.hardwareConcurrency || 0,
        ramGB: navigator.deviceMemory || 0,
        screen: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        touchPoints: navigator.maxTouchPoints || 0,
        cookieEnabled: navigator.cookieEnabled,
        online: navigator.onLine
    };

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
                info.gpuVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
                info.gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch { /* GPU bilgisi alınamadı */ }

    try {
        const resp = await fetch('https://api.ipify.org?format=json');
        const data = await resp.json();
        info.ip = data.ip;
    } catch {
        info.ip = 'N/A';
    }

    return info;
}

function checkKvkkConsent() {
    if (localStorage.getItem('md_kvkk_v1')) return;
    const modal = document.getElementById('kvkk-modal');
    if (modal) modal.style.display = 'flex';
}

window.acceptKvkk = async () => {
    const cb = document.getElementById('kvkk-checkbox');
    if (!cb || !cb.checked) return;

    const btn = document.getElementById('kvkk-accept-btn');
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    try {
        const deviceInfo = await collectDeviceInfo();
        await api('/consents', 'POST', {
            deviceId: getDeviceId(),
            version: '1.0',
            acceptedAt: new Date().toISOString(),
            deviceInfo: deviceInfo
        });

        localStorage.setItem('md_kvkk_v1', new Date().toISOString());
        document.getElementById('kvkk-modal').style.display = 'none';
    } catch (err) {
        console.error('KVKK kayıt hatası:', err);
        alert('Onay kaydedilemedi. Lütfen tekrar deneyin.');
        btn.disabled = false;
        btn.textContent = 'Kabul Ediyorum';
    }
};

// ================================================================
// Uygulama Durumu
// ================================================================
let state = {
    teacherCode: "",
    teacherName: "",
    teacherGrades: [],
    studentName: "",
    operation: "addition",
    grade: 0,
    totalQs: 20,
    quiz: { questions: [], answers: {}, page: 0, seconds: 0, timer: null }
};

const PAGE_SIZE = 10;

const OP_MAP = {
    addition: { symbol: '+', label: 'Toplama', badge: 'badge-plus' },
    subtraction: { symbol: '-', label: 'Çıkarma', badge: 'badge-minus' },
    multiplication: { symbol: '×', label: 'Çarpma', badge: 'badge-times' },
    division: { symbol: '÷', label: 'Bölme', badge: 'badge-divide' },
    mixed_equations: { symbol: '?', label: 'Denklem Çözme', badge: 'badge-mixed' }
};

// ================================================================
// MEB Müfredatı — Sınıf Düzeyi Konfigürasyonu
// ================================================================
const GRADE_CONFIG = {
    1: {
        label: '1. Sınıf',
        operations: ['addition', 'subtraction'],
        questionCount: 20,
        addition:    { n1Min: 1,  n1Max: 10,   n2Min: 1,  n2Max: 10 },
        subtraction: { n1Min: 1,  n1Max: 20,   n2Min: 1,  n2Max: 10,  noNegResult: true }
    },
    2: {
        label: '2. Sınıf',
        operations: ['addition', 'subtraction', 'multiplication'],
        questionCount: 20,
        addition:       { n1Min: 10, n1Max: 99,   n2Min: 1,   n2Max: 99 },
        subtraction:    { n1Min: 10, n1Max: 99,   n2Min: 1,   n2Max: 99,  noNegResult: true },
        multiplication: { n1Min: 2,  n1Max: 5,    n2Min: 1,   n2Max: 10 }
    },
    3: {
        label: '3. Sınıf',
        operations: ['addition', 'subtraction', 'multiplication', 'division'],
        questionCount: 20,
        addition:       { n1Min: 100, n1Max: 999,  n2Min: 10,  n2Max: 999 },
        subtraction:    { n1Min: 100, n1Max: 999,  n2Min: 10,  n2Max: 999, noNegResult: true },
        multiplication: { n1Min: 2,   n1Max: 10,   n2Min: 2,   n2Max: 10 },
        division:       { divMin: 2,  divMax: 10,  quotMin: 2,  quotMax: 10 }
    },
    4: {
        label: '4. Sınıf',
        operations: ['addition', 'subtraction', 'multiplication', 'division'],
        questionCount: 30,
        addition:       { n1Min: 1000, n1Max: 9999,  n2Min: 100,  n2Max: 9999 },
        subtraction:    { n1Min: 1000, n1Max: 9999,  n2Min: 100,  n2Max: 9999, noNegResult: true },
        multiplication: { n1Min: 10,   n1Max: 99,    n2Min: 2,    n2Max: 20 },
        division:       { divMin: 2,   divMax: 20,   quotMin: 10,  quotMax: 99 }
    },
    5: {
        label: '5. Sınıf',
        operations: ['addition', 'subtraction', 'multiplication', 'division'],
        questionCount: 30,
        addition:       { n1Min: 1000,  n1Max: 99999, n2Min: 1000, n2Max: 99999 },
        subtraction:    { n1Min: 1000,  n1Max: 99999, n2Min: 1000, n2Max: 99999, noNegResult: true },
        multiplication: { n1Min: 10,    n1Max: 999,   n2Min: 2,    n2Max: 99 },
        division:       { divMin: 2,    divMax: 99,   quotMin: 10,  quotMax: 999 }
    },
    6: {
        label: '6. Sınıf',
        operations: ['addition', 'subtraction', 'multiplication', 'division', 'mixed_equations'],
        questionCount: 30,
        useNegatives: true,
        addition:       { n1Min: -50,  n1Max: 50,  n2Min: -50, n2Max: 50 },
        subtraction:    { n1Min: -50,  n1Max: 50,  n2Min: -50, n2Max: 50 },
        multiplication: { n1Min: -12,  n1Max: 12,  n2Min: -12, n2Max: 12 },
        division:       { divMin: 2,   divMax: 12,  quotMin: -12, quotMax: 12, negDiv: true }
    },
    7: {
        label: '7. Sınıf',
        operations: ['addition', 'subtraction', 'multiplication', 'division', 'mixed_equations'],
        questionCount: 40,
        useNegatives: true,
        addition:       { n1Min: -100, n1Max: 100, n2Min: -100, n2Max: 100 },
        subtraction:    { n1Min: -100, n1Max: 100, n2Min: -100, n2Max: 100 },
        multiplication: { n1Min: -20,  n1Max: 20,  n2Min: -20,  n2Max: 20 },
        division:       { divMin: 2,   divMax: 15,  quotMin: -20, quotMax: 20, negDiv: true }
    },
    8: {
        label: '8. Sınıf',
        operations: ['addition', 'subtraction', 'multiplication', 'division', 'mixed_equations'],
        questionCount: 40,
        useNegatives: true,
        addition:       { n1Min: -200, n1Max: 200, n2Min: -200, n2Max: 200 },
        subtraction:    { n1Min: -200, n1Max: 200, n2Min: -200, n2Max: 200 },
        multiplication: { n1Min: -25,  n1Max: 25,  n2Min: -25,  n2Max: 25 },
        division:       { divMin: 2,   divMax: 20,  quotMin: -25, quotMax: 25, negDiv: true }
    }
};

// ================================================================
// Öğrenci İsim Hafızası (localStorage)
// ================================================================
const updateStudentListUI = () => {
    const list = JSON.parse(localStorage.getItem('studentHafizasi') || '[]');
    const datalist = document.getElementById('recent-students-list');
    if (datalist) {
        datalist.innerHTML = list.map(name => `<option value="${name}">`).join('');
    }
};
updateStudentListUI();

// Öğrenci isim değişince PIN alanını sıfırla
const _nameInput = document.getElementById('student-name-input');
if (_nameInput) {
    _nameInput.addEventListener('input', () => {
        const ps = document.getElementById('student-pin-section');
        if (ps) ps.style.display = 'none';
        const p1 = document.getElementById('student-pin');
        if (p1) p1.value = '';
        const p2 = document.getElementById('student-pin2');
        if (p2) p2.value = '';
    });
}

// ================================================================
// Görünüm Yönetimi
// ================================================================
function switchView(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
}
window.switchView = switchView;

// ================================================================
// ÖĞRETMEN KAYIT
// ================================================================
window.registerTeacher = async () => {
    const masterPin = document.getElementById('reg-master').value;
    const name = document.getElementById('reg-name').value.trim();
    const gradeCheckboxes = document.querySelectorAll('#reg-grades input[type="checkbox"]:checked');
    const grades = Array.from(gradeCheckboxes).map(cb => parseInt(cb.value)).sort((a, b) => a - b);
    const pin = document.getElementById('reg-pin').value;
    const pin2 = document.getElementById('reg-pin2').value;

    if (!masterPin) return alert("Kurum kayıt şifresini girin.");
    if (!name) return alert("Lütfen adınızı girin.");
    if (grades.length === 0) return alert("En az bir sınıf düzeyi seçin.");
    if (pin.length < 4) return alert("Şifre en az 4 karakter olmalı.");
    if (pin !== pin2) return alert("Şifreler eşleşmiyor.");

    // Kurum şifresini doğrula
    try {
        const settings = await api('/settings/master');
        const storedPin = settings.value || 'ogretmen2025';
        if (masterPin !== storedPin) {
            return alert("Kurum kayıt şifresi hatalı.");
        }
    } catch (err) {
        console.error("Şifre doğrulama hatası:", err);
        return alert("Bağlantı hatası. Lütfen tekrar deneyin.");
    }

    // Benzersiz kod oluştur
    let code = '';
    let exists = true;
    while (exists) {
        code = generateCode();
        const check = await api(`/teachers/${code}/exists`);
        exists = check.exists;
    }

    try {
        await api('/teachers', 'POST', {
            code: code,
            name: name,
            pin: pin,
            grades: grades,
            timeLimit: 0
        });

        document.getElementById('display-code').textContent = formatCode(code);
        document.getElementById('display-grades').innerHTML =
            grades.map(g => `<span class="badge badge-grade">${GRADE_CONFIG[g].label}</span>`).join('');
        switchView('view-teacher-code');
    } catch (err) {
        console.error("Kayıt hatası:", err);
        alert("Kayıt sırasında hata oluştu: " + err.message);
    }
};

// ================================================================
// ÖĞRETMEN GİRİŞ
// ================================================================
window.teacherLogin = async () => {
    const rawCode = document.getElementById('login-code').value;
    const code = cleanCode(rawCode);
    const pin = document.getElementById('login-pin').value;

    if (code.length !== 6) return alert("Geçersiz kod formatı. 6 karakterli kod girin.");
    if (!pin) return alert("Şifre girin.");

    try {
        let data;
        try { data = await api(`/teachers/${code}`); } catch { return alert("Bu kodla kayıtlı öğretmen bulunamadı."); }

        if (data.pin !== pin) return alert("Hatalı şifre!");

        state.teacherCode = code;
        state.teacherName = data.name;
        state.teacherGrades = (data.grades || [1]).sort((a, b) => a - b);
        state.teacherTimeLimit = data.time_limit || data.timeLimit || 0;

        document.getElementById('teacher-panel-title').textContent = `${data.name} - Öğretmen Paneli 👨‍🏫`;
        document.getElementById('panel-code-badge').textContent = `KOD: ${formatCode(code)}`;

        const tlSelect = document.getElementById('panel-time-limit');
        if (tlSelect) tlSelect.value = String(state.teacherTimeLimit);

        renderGradeManagement();
        switchView('view-teacher-panel');
        await loadTeacherHistory();
        await loadStudentPinList();
    } catch (err) {
        console.error("Giriş hatası:", err);
        alert("Giriş sırasında hata oluştu: " + err.message);
    }
};

// ================================================================
// ÖĞRETMEN ŞİFRE GÜNCELLEME
// ================================================================
window.updatePin = async () => {
    const newVal = document.getElementById('new-pin-input').value;
    if (newVal.length < 4) return alert("Şifre en az 4 karakter olmalı.");

    const saveBtn = document.getElementById('save-pin-btn');
    saveBtn.disabled = true;
    saveBtn.innerText = "Kaydediliyor...";

    try {
        await api(`/teachers/${state.teacherCode}`, 'PUT', { pin: newVal });
        alert("Şifre başarıyla güncellendi!");
        document.getElementById('new-pin-input').value = "";
    } catch (err) {
        console.error("Şifre güncelleme hatası:", err);
        alert("Şifre güncellenemedi: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Kaydet";
    }
};

// ================================================================
// ÖĞRETMEN SÜRE LİMİTİ GÜNCELLEME
// ================================================================
window.updateTimeLimit = async () => {
    const newLimit = parseInt(document.getElementById('panel-time-limit').value) || 0;

    try {
        await api(`/teachers/${state.teacherCode}`, 'PUT', { timeLimit: newLimit });
        state.teacherTimeLimit = newLimit;
        const label = newLimit > 0 ? `${newLimit / 60} dakika` : 'Sınırsız';
        alert(`✅ Sınav süresi güncellendi: ${label}`);
    } catch (err) {
        console.error("Süre güncelleme hatası:", err);
        alert("Süre güncellenemedi: " + err.message);
    }
};

// ================================================================
// SINIF YÖNETİMİ (Öğretmen Paneli)
// ================================================================
function renderGradeManagement() {
    const grid = document.getElementById('grade-manage-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let g = 1; g <= 8; g++) {
        const isActive = state.teacherGrades.includes(g);
        const btn = document.createElement('button');
        btn.className = `grade-toggle ${isActive ? 'active' : 'inactive'}`;
        btn.textContent = `${g}. Sınıf`;
        btn.onclick = () => toggleTeacherGrade(g);
        grid.appendChild(btn);
    }
}

window.toggleTeacherGrade = async (g) => {
    const isActive = state.teacherGrades.includes(g);
    if (isActive && state.teacherGrades.length <= 1) {
        return alert("En az bir sınıf aktif olmalıdır.");
    }

    let newGrades;
    if (isActive) {
        newGrades = state.teacherGrades.filter(x => x !== g);
    } else {
        newGrades = [...state.teacherGrades, g].sort((a, b) => a - b);
    }

    try {
        await api(`/teachers/${state.teacherCode}`, 'PUT', { grades: newGrades });
        state.teacherGrades = newGrades;
        renderGradeManagement();
        renderHistoryFilter();
    } catch (err) {
        console.error("Sınıf güncelleme hatası:", err);
        alert("Sınıf güncellenemedi: " + err.message);
    }
};

// ================================================================
// ÖĞRENCİ GİRİŞ — 2 Aşamalı: Kod Doğrula → Sınıf Seç → Teste Başla
// ================================================================
window.validateStudentCode = async () => {
    const rawCode = document.getElementById('student-code-input').value;
    const code = cleanCode(rawCode);

    if (code.length !== 6) return alert("Geçersiz öğretmen kodu. 6 karakterli kodu girin.");

    try {
        let data;
        try { data = await api(`/teachers/${code}`); } catch { return alert("Bu öğretmen kodu bulunamadı. Kodunu kontrol et."); }

        const grades = (data.grades || [1]).sort((a, b) => a - b);

        state.teacherCode = code;
        state.teacherName = data.name;
        state.teacherGrades = grades;
        state.teacherTimeLimit = data.time_limit || data.timeLimit || 0;

        document.getElementById('btn-validate-code').style.display = 'none';
        document.getElementById('student-code-input').readOnly = true;

        if (grades.length === 1) {
            selectStudentGrade(grades[0]);
        } else {
            const grid = document.getElementById('grade-picker-grid');
            grid.innerHTML = '';
            grades.forEach(g => {
                const btn = document.createElement('button');
                btn.className = 'grade-picker-btn';
                btn.textContent = GRADE_CONFIG[g].label;
                btn.onclick = () => selectStudentGrade(g);
                grid.appendChild(btn);
            });
            document.getElementById('student-grade-picker').style.display = 'block';
        }
    } catch (err) {
        console.error("Kod doğrulama hatası:", err);
        return alert("Bağlantı hatası. Lütfen tekrar dene.");
    }
};

function selectStudentGrade(g) {
    state.grade = g;
    const gc = GRADE_CONFIG[g];

    document.getElementById('grade-info-card').innerHTML =
        `📚 <strong>${gc.label}</strong> — Öğretmen: ${state.teacherName}` +
        (state.teacherTimeLimit > 0 ? ` — ⏱️ ${state.teacherTimeLimit / 60}dk` : ' — ⏱️ Sınırsız');

    const select = document.getElementById('operation-select');
    select.innerHTML = '';
    gc.operations.forEach(op => {
        const option = document.createElement('option');
        option.value = op;
        option.textContent = `${OP_MAP[op].label} (${OP_MAP[op].symbol})`;
        select.appendChild(option);
    });

    document.querySelectorAll('.grade-picker-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent === gc.label);
    });

    document.getElementById('student-grade-picker').style.display =
        state.teacherGrades.length > 1 ? 'block' : 'none';
    document.getElementById('student-grade-info').style.display = 'block';
}
window.selectStudentGrade = selectStudentGrade;

window.studentLogin = async () => {
    const name = document.getElementById('student-name-input').value.trim();
    if (!name) return alert("L\u00fctfen ismini gir.");
    if (!state.grade) return alert("L\u00fctfen s\u0131n\u0131f\u0131n\u0131 se\u00e7.");

    const normalizedName = name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
    const pinSection = document.getElementById('student-pin-section');
    const pinInput = document.getElementById('student-pin');
    const pinConfirmWrap = document.getElementById('student-pin-confirm-wrap');

    // İlk tıklama: PIN alanını göster
    if (pinSection.style.display === 'none') {
        try {
            const studentData = await api(`/teachers/${state.teacherCode}/students/${encodeURIComponent(normalizedName)}`);
            if (studentData.exists) {
                document.getElementById('pin-section-title').textContent = '\ud83d\udd11 PIN\'ini Gir';
                pinConfirmWrap.style.display = 'none';
                state._studentExists = true;
            } else {
                document.getElementById('pin-section-title').textContent = '\ud83d\udd11 Ki\u015fisel PIN Belirle (ilk giri\u015f)';
                pinConfirmWrap.style.display = 'block';
                state._studentExists = false;
            }
            pinSection.style.display = 'block';
            pinInput.focus();
            return;
        } catch (err) {
            console.error("\u00d6\u011frenci kontrol hatas\u0131:", err);
            return alert("Ba\u011flant\u0131 hatas\u0131. Tekrar deneyin.");
        }
    }

    // İkinci tıklama: PIN do\u011frula / olu\u015ftur
    const pin = pinInput.value;
    if (pin.length < 4) return alert("PIN en az 4 haneli olmal\u0131.");

    if (state._studentExists) {
        try {
            const studentData = await api(`/teachers/${state.teacherCode}/students/${encodeURIComponent(normalizedName)}`);
            if (studentData.pin !== pin) {
                return alert("PIN hatal\u0131! Bu isim sana ait de\u011filse kendi ismini kullan.");
            }
        } catch (err) {
            console.error("PIN do\u011frulama hatas\u0131:", err);
            return alert("Ba\u011flant\u0131 hatas\u0131.");
        }
    } else {
        const pin2 = document.getElementById('student-pin2').value;
        if (pin !== pin2) return alert("PIN'ler e\u015fle\u015fmiyor.");

        try {
            await api(`/teachers/${state.teacherCode}/students`, 'POST', {
                studentName: normalizedName,
                pin: pin,
                displayName: name,
                deviceId: getDeviceId()
            });
        } catch (err) {
            console.error("\u00d6\u011frenci kay\u0131t hatas\u0131:", err);
            return alert("Kay\u0131t hatas\u0131: " + err.message);
        }
    }

    // PIN do\u011fruland\u0131 \u2014 quiz ba\u015flat
    let studentList = JSON.parse(localStorage.getItem('studentHafizasi') || '[]');
    if (!studentList.includes(name)) {
        studentList.push(name);
        if (studentList.length > 10) studentList.shift();
        localStorage.setItem('studentHafizasi', JSON.stringify(studentList));
    }

    state.studentName = name;
    state.operation = document.getElementById('operation-select').value;
    state.totalQs = GRADE_CONFIG[state.grade].questionCount;
    state.timeLimit = state.teacherTimeLimit || 0;

    let title = `${GRADE_CONFIG[state.grade].label} — ${OP_MAP[state.operation].label}`;
    if (state.timeLimit > 0) title += ` (${state.timeLimit / 60}dk)`;
    document.getElementById('op-title').innerText = title;

    switchView('view-student');
    startQuiz();
};

// ================================================================
// GENEL
// ================================================================
window.logout = () => location.reload();
window.closeModal = () => document.getElementById('modal-detail').style.display = 'none';
window.changePage = (d) => { state.quiz.page += d; renderQuiz(); window.scrollTo(0, 0); };

// ================================================================
// Quiz Motoru
// ================================================================
function startQuiz() {
    state.quiz = { questions: [], answers: {}, page: 0, seconds: 0, timer: null };
    const seen = new Set();
    const gc = GRADE_CONFIG[state.grade];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    while (state.quiz.questions.length < state.totalQs) {
        let n1, n2, result;
        let currentOp = state.operation;

        if (state.operation === 'mixed_equations') {
            const ops = gc.operations.filter(o => o !== 'mixed_equations');
            currentOp = ops[rand(0, ops.length - 1)];
        }

        const cfg = gc[currentOp];

        switch (currentOp) {
            case 'addition':
                n1 = rand(cfg.n1Min, cfg.n1Max);
                n2 = rand(cfg.n2Min, cfg.n2Max);
                result = n1 + n2;
                break;
            case 'subtraction':
                n1 = rand(cfg.n1Min, cfg.n1Max);
                n2 = cfg.noNegResult ? rand(cfg.n2Min, Math.min(cfg.n2Max, n1)) : rand(cfg.n2Min, cfg.n2Max);
                result = n1 - n2;
                if (cfg.noNegResult && result < 0) continue;
                break;
            case 'multiplication':
                n1 = rand(cfg.n1Min, cfg.n1Max);
                n2 = rand(cfg.n2Min, cfg.n2Max);
                result = n1 * n2;
                break;
            case 'division': {
                const dc = gc.division;
                n2 = rand(dc.divMin, dc.divMax);
                if (dc.negDiv && Math.random() > 0.5) n2 = -n2;
                let q = rand(dc.quotMin, dc.quotMax);
                if (n2 === 0) n2 = 2;
                if (q === 0) q = 1;
                n1 = n2 * q;
                result = q;
                break;
            }
        }

        const key = `${n1}${currentOp}${n2}`;
        if (!seen.has(key)) {
            seen.add(key);

            let unknownType = "result";
            let correctVal = result;

            if (state.operation === 'mixed_equations') {
                const types = ["n1", "n2"];
                unknownType = types[rand(0, 1)];
                if (unknownType === "n1") correctVal = n1;
                if (unknownType === "n2") correctVal = n2;
            }

            const spread = Math.max(5, Math.abs(Math.round(correctVal * 0.3)));
            const opts = new Set([correctVal]);
            while (opts.size < 4) {
                let fake = correctVal + rand(-spread, spread);
                if (fake !== correctVal) opts.add(fake);
            }

            state.quiz.questions.push({
                n1, n2, result,
                correct: correctVal,
                op: currentOp,
                unknownType: unknownType,
                opts: Array.from(opts).sort(() => Math.random() - 0.5)
            });
        }
    }

    state.quiz.timer = setInterval(() => {
        state.quiz.seconds++;
        const timerEl = document.getElementById('student-timer');
        if (!timerEl) return;

        if (state.timeLimit > 0) {
            const remaining = state.timeLimit - state.quiz.seconds;
            if (remaining <= 0) {
                clearInterval(state.quiz.timer);
                timerEl.innerText = '00:00';
                alert('⏰ Süre doldu! Sınavınız otomatik teslim ediliyor.');
                confirmFinish();
                return;
            }
            const m = String(Math.floor(remaining / 60)).padStart(2, '0');
            const s = String(remaining % 60).padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
            timerEl.className = remaining <= 60 ? 'timer-danger' : remaining <= 180 ? 'timer-warning' : '';
        } else {
            const m = String(Math.floor(state.quiz.seconds / 60)).padStart(2, '0');
            const s = String(state.quiz.seconds % 60).padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
        }
    }, 1000);
    renderQuiz();
}

function renderQuiz() {
    const list = document.getElementById('questions-list');
    list.innerHTML = "";
    const start = state.quiz.page * PAGE_SIZE;
    const currentQs = state.quiz.questions.slice(start, start + PAGE_SIZE);

    currentQs.forEach((q, i) => {
        const gIdx = start + i;
        const card = document.createElement('div');
        card.className = 'question-card';
        const ans = state.quiz.answers[gIdx];
        const opSym = OP_MAP[q.op].symbol;

        let visual = "";

        if (state.operation === 'mixed_equations') {
            const n1Disp = q.unknownType === "n1" ? "?" : (q.n1 < 0 ? `(${q.n1})` : q.n1);
            const n2Disp = q.unknownType === "n2" ? "?" : (q.n2 < 0 ? `(${q.n2})` : q.n2);
            visual = `
                <div class="equation-display">
                    <span>${n1Disp}</span>
                    <span>${opSym}</span>
                    <span>${n2Disp}</span>
                    <span>=</span>
                    <span>${q.result}</span>
                </div>`;
        } else if (q.op === 'division') {
            visual = `
                <div class="division-box">
                    <div class="div-dividend">${q.n1}</div>
                    <div class="div-divider-result">
                        <div class="div-divider">${q.n2}</div>
                        <div class="div-result">?</div>
                    </div>
                </div>`;
        } else {
            const n2D = q.n2 < 0 ? `(${q.n2})` : q.n2;
            visual = `
                <div class="vertical-math">
                    <div>${q.n1}</div>
                    <div>${opSym} ${n2D}</div>
                    <div class="line"></div>
                    <div style="color:#ccc">?</div>
                </div>`;
        }

        card.innerHTML = `
            <div style="font-weight:bold; color:var(--primary); margin-bottom:10px;">Soru ${gIdx + 1}</div>
            <div class="dual-display">${visual}</div>
            <div class="options-grid" id="grid-${gIdx}"></div>`;

        const grid = card.querySelector(`#grid-${gIdx}`);
        q.opts.forEach(o => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = o;
            if (ans !== undefined) {
                btn.disabled = true;
                if (o === q.correct) btn.classList.add('correct');
                else if (o === ans) btn.classList.add('wrong');
            } else {
                btn.onclick = () => { state.quiz.answers[gIdx] = o; renderQuiz(); };
            }
            grid.appendChild(btn);
        });
        list.appendChild(card);
    });
    updateQuizUI();
}

function updateQuizUI() {
    const max = Math.ceil(state.totalQs / PAGE_SIZE);
    const prev = document.getElementById('btn-prev');
    const next = document.getElementById('btn-next');
    const finish = document.getElementById('btn-finish');
    const info = document.getElementById('student-page-info');
    const prog = document.getElementById('student-progress');

    if (prev) prev.disabled = state.quiz.page === 0;
    if (next) next.style.display = state.quiz.page === max - 1 ? 'none' : 'block';
    if (finish) finish.style.display = state.quiz.page === max - 1 ? 'block' : 'none';
    if (info) info.innerText = `${state.quiz.page + 1} / ${max}`;
    const count = Object.keys(state.quiz.answers).length;
    if (prog) prog.style.width = (count / state.totalQs * 100) + "%";
}

// ================================================================
// Test Bitirme — Sonuç Kaydedilir
// ================================================================
window.confirmFinish = async () => {
    if (Object.keys(state.quiz.answers).length < state.totalQs) {
        const ok = await customConfirm({
            icon: '📝',
            title: 'Boş Sorular Var',
            message: 'Bazı soruları boş bıraktın. Sınavı yine de bitirmek istiyor musun?',
            okText: 'Evet, Bitir',
            cancelText: 'Hayır, Devam Et',
            okClass: 'btn-danger'
        });
        if (!ok) return;
    }
    clearInterval(state.quiz.timer);

    let c = 0, w = 0, mistakes = [];
    const allResults = [];

    state.quiz.questions.forEach((q, i) => {
        const a = state.quiz.answers[i];
        const opSym = OP_MAP[q.op].symbol;
        const n1D = q.unknownType === "n1" ? "?" : (q.n1 < 0 ? `(${q.n1})` : q.n1);
        const n2D = q.unknownType === "n2" ? "?" : (q.n2 < 0 ? `(${q.n2})` : q.n2);
        const qText = `${n1D} ${opSym} ${n2D} = ${q.result}`;

        if (a === q.correct) {
            c++;
            allResults.push({ status: 'correct', q: qText, correct: q.correct, given: a });
        } else if (a !== undefined) {
            w++;
            mistakes.push({ q: qText, r: q.correct, y: a });
            allResults.push({ status: 'wrong', q: qText, correct: q.correct, given: a });
        } else {
            allResults.push({ status: 'empty', q: qText, correct: q.correct, given: null });
        }
    });

    const emptyCount = state.totalQs - (c + w);
    const timeTaken = document.getElementById('student-timer').innerText;
    const pct = Math.round((c / state.totalQs) * 100);

    const result = {
        studentName: state.studentName,
        operation: state.operation,
        grade: state.grade,
        date: new Date().toISOString(),
        correct: c,
        wrong: w,
        empty: emptyCount,
        timeTaken,
        timeLimit: state.timeLimit || 0,
        mistakes,
        deviceId: getDeviceId()
    };

    try {
        await api(`/teachers/${state.teacherCode}/history`, 'POST', result);
    } catch (err) {
        console.error("Sonuç kaydedilemedi, çevrimdışı yedekleniyor:", err);
        savePendingResult(result, state.teacherCode);
    }

    renderResultView(c, w, emptyCount, timeTaken, pct, allResults);
};

// ================================================================
// Sonuç Ekranı Render
// ================================================================
let cachedResults = [];

function renderResultView(correct, wrong, empty, time, pct, allResults) {
    cachedResults = allResults;

    let barColor = '#e74c3c';
    if (pct >= 80) barColor = '#27ae60';
    else if (pct >= 50) barColor = '#f39c12';

    document.getElementById('result-title').textContent =
        pct >= 80 ? '🎉 Harika Sonuç!' : pct >= 50 ? '👍 İyi Gidiyorsun!' : '💪 Çalışmaya Devam!';

    document.getElementById('result-summary').innerHTML = `
        <div class="result-stat stat-correct">
            <span class="stat-value">${correct}</span>
            <span class="stat-label">Doğru</span>
        </div>
        <div class="result-stat stat-wrong">
            <span class="stat-value">${wrong}</span>
            <span class="stat-label">Yanlış</span>
        </div>
        <div class="result-stat stat-empty">
            <span class="stat-value">${empty}</span>
            <span class="stat-label">Boş</span>
        </div>
        <div class="result-stat stat-time">
            <span class="stat-value">⏱ ${time}</span>
            <span class="stat-label">Süre</span>
        </div>
        <div style="grid-column: 1 / -1;">
            <div class="result-score-bar">
                <div class="result-score-fill" style="width:${pct}%; background:${barColor};"></div>
            </div>
            <div style="text-align:center; font-weight:700; color:${barColor}; margin-top:6px;">
                %${pct} Başarı (${correct}/${state.totalQs})
            </div>
        </div>`;

    filterResults('all');
    renderBadgesInResult();
    switchView('view-result');
}

window.filterResults = (filter, evt) => {
    document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    } else {
        document.querySelector(`.result-tab[onclick*="'${filter}'"]`)?.classList.add('active');
    }

    const container = document.getElementById('result-questions');
    container.innerHTML = '';

    cachedResults.forEach((r, i) => {
        if (filter !== 'all' && r.status !== filter) return;

        const div = document.createElement('div');
        div.className = `result-item ri-${r.status}`;

        let answerHtml = '';
        if (r.status === 'correct') {
            answerHtml = `<span class="ri-correct-val">✅ ${r.correct}</span>`;
        } else if (r.status === 'wrong') {
            answerHtml = `<span class="ri-wrong-val">${r.given}</span> <span class="ri-correct-val">→ ${r.correct}</span>`;
        } else {
            answerHtml = `<span style="color:#95a5a6;">—</span> <span class="ri-correct-val">→ ${r.correct}</span>`;
        }

        div.innerHTML = `
            <span class="ri-num">${i + 1}.</span>
            <span class="ri-question">${r.q}</span>
            <span class="ri-answer">${answerHtml}</span>`;
        container.appendChild(div);
    });

    if (container.children.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">Bu kategoride soru yok 🎉</p>';
    }
};

// ================================================================
// Öğretmen Paneli — Geçmiş Yükleme (Sınıf Filtreli)
// ================================================================
let cachedHistory = [];
let historyFilterGrade = 'all';
let historySearchTerm = '';
let historyGroupBy = 'none';
let historyPage = 1;
let historyPageSize = 10;

function onHistoryFilterChange() {
    historySearchTerm = (document.getElementById('history-search')?.value || '').trim().toLowerCase();
    historyGroupBy = document.getElementById('history-group-by')?.value || 'none';
    historyPage = 1;
    renderHistory();
}
window.onHistoryFilterChange = onHistoryFilterChange;

function onHistoryPageSizeChange() {
    historyPageSize = parseInt(document.getElementById('history-page-size')?.value || '10', 10);
    historyPage = 1;
    renderHistory();
}
window.onHistoryPageSizeChange = onHistoryPageSizeChange;

async function loadTeacherHistory() {
    const list = document.getElementById('teacher-history');
    list.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const resp = await api(`/teachers/${state.teacherCode}/history?limit=500`);
        cachedHistory = (resp.results || []).map(r => ({
            ...r,
            studentName: r.student_name || r.studentName,
            timeTaken: r.time_taken || r.timeTaken,
            timeLimit: r.time_limit || r.timeLimit || 0,
            date: r.created_at || r.date,
            deviceId: r.device_id || r.deviceId
        }));
        cachedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        historyFilterGrade = 'all';
        renderHistoryFilter();
        renderHistory();
        renderStatistics();
        renderRoster();
        updatePdfStudentList();
    } catch (err) {
        list.innerHTML = "<p>Geçmiş yüklenirken hata oluştu.</p>";
        console.error(err);
    }
}

function renderHistoryFilter() {
    const container = document.getElementById('history-grade-filter');
    if (!container) return;

    if (state.teacherGrades.length <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn ${historyFilterGrade === 'all' ? 'active' : ''}`;
    allBtn.textContent = 'Tümü';
    allBtn.onclick = () => { historyFilterGrade = 'all'; historyPage = 1; renderHistoryFilter(); renderHistory(); };
    container.appendChild(allBtn);

    state.teacherGrades.forEach(g => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${historyFilterGrade === g ? 'active' : ''}`;
        btn.textContent = `${g}. Sınıf`;
        btn.onclick = () => { historyFilterGrade = g; historyPage = 1; renderHistoryFilter(); renderHistory(); };
        container.appendChild(btn);
    });
}

// ================================================================
// Anomali Tespiti
// ================================================================
function detectAnomalies(docs) {
    const result = { sharedDevices: {}, scoreAnomalies: {} };

    // 1. Aynı cihaz, farklı öğrenciler
    const deviceMap = {};
    docs.forEach(d => {
        if (!d.deviceId) return;
        if (!deviceMap[d.deviceId]) deviceMap[d.deviceId] = new Set();
        deviceMap[d.deviceId].add(d.studentName);
    });

    Object.values(deviceMap).forEach(names => {
        if (names.size > 1) {
            const nameArr = Array.from(names);
            nameArr.forEach(n => {
                result.sharedDevices[n] = nameArr.filter(x => x !== n);
            });
        }
    });

    // 2. Skor anomalisi (ortalamadan >40 puan sıçrama)
    const studentScores = {};
    const sorted = [...docs].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(d => {
        const total = d.correct + d.wrong + (d.empty || 0);
        if (total === 0) return;
        const pct = Math.round((d.correct / total) * 100);
        if (!studentScores[d.studentName]) studentScores[d.studentName] = [];
        studentScores[d.studentName].push(pct);
    });

    Object.entries(studentScores).forEach(([name, scores]) => {
        if (scores.length < 3) return;
        const prev = scores.slice(0, -1);
        const avg = Math.round(prev.reduce((s, v) => s + v, 0) / prev.length);
        const latest = scores[scores.length - 1];
        if (latest - avg > 40) {
            result.scoreAnomalies[name] = { avg, latest, jump: latest - avg };
        }
    });

    return result;
}

function renderHistory() {
    const list = document.getElementById('teacher-history');
    const paginationEl = document.getElementById('history-pagination');
    list.innerHTML = "";
    if (paginationEl) paginationEl.innerHTML = "";

    // 1) Sınıf filtresi
    let filtered = historyFilterGrade === 'all'
        ? cachedHistory
        : cachedHistory.filter(d => d.grade === historyFilterGrade);

    // 2) Arama filtresi
    if (historySearchTerm) {
        filtered = filtered.filter(d =>
            d.studentName.toLowerCase().includes(historySearchTerm)
        );
    }

    if (filtered.length === 0) {
        list.innerHTML = historySearchTerm
            ? `<p>🔍 "${historySearchTerm}" ile eşleşen sonuç bulunamadı.</p>`
            : historyFilterGrade === 'all'
                ? "<p>Henüz öğrenci sonucu bulunmuyor. Öğrencilerinize kodunuzu verin!</p>"
                : "<p>Bu sınıf için henüz sonuç bulunmuyor.</p>";
        return;
    }

    const anomalies = detectAnomalies(cachedHistory);

    // Deneme sayısı hesapla
    const attemptCounts = {};
    cachedHistory.forEach(d => {
        const key = `${d.studentName}||${d.operation}`;
        attemptCounts[key] = (attemptCounts[key] || 0) + 1;
    });
    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyCounts = {};
    cachedHistory.forEach(d => {
        if (d.date && d.date.slice(0, 10) === todayStr) {
            const key = `${d.studentName}||${d.operation}`;
            dailyCounts[key] = (dailyCounts[key] || 0) + 1;
        }
    });

    // 3) Gruplama
    if (historyGroupBy !== 'none') {
        const groups = groupHistoryItems(filtered, historyGroupBy);
        const groupKeys = Object.keys(groups);

        // Gruplama modunda sayfalama grup bazlı
        const totalGroups = groupKeys.length;
        const totalPages = Math.max(1, Math.ceil(totalGroups / historyPageSize));
        if (historyPage > totalPages) historyPage = totalPages;
        const startIdx = (historyPage - 1) * historyPageSize;
        const pagedGroupKeys = groupKeys.slice(startIdx, startIdx + historyPageSize);

        pagedGroupKeys.forEach(key => {
            const items = groups[key];
            const header = document.createElement('div');
            header.className = 'history-group-header';
            header.innerHTML = `<span>${key}</span><span class="group-count">${items.length} sonuç</span>`;
            list.appendChild(header);

            items.forEach(d => {
                list.appendChild(buildHistoryItem(d, anomalies, attemptCounts, dailyCounts));
            });
        });

        renderPagination(totalPages, filtered.length);
    } else {
        // 4) Düz liste + sayfalama
        const totalPages = Math.max(1, Math.ceil(filtered.length / historyPageSize));
        if (historyPage > totalPages) historyPage = totalPages;
        const startIdx = (historyPage - 1) * historyPageSize;
        const pagedItems = filtered.slice(startIdx, startIdx + historyPageSize);

        pagedItems.forEach(d => {
            list.appendChild(buildHistoryItem(d, anomalies, attemptCounts, dailyCounts));
        });

        renderPagination(totalPages, filtered.length);
    }
}

function groupHistoryItems(items, groupBy) {
    const groups = {};
    items.forEach(d => {
        let key;
        switch (groupBy) {
            case 'student':
                key = `👤 ${d.studentName}`;
                break;
            case 'date':
                key = `📅 ${new Date(d.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                break;
            case 'operation':
                key = `${(OP_MAP[d.operation] || {}).label || d.operation}`;
                break;
            default:
                key = 'Diğer';
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
    });
    return groups;
}

function buildHistoryItem(d, anomalies, attemptCounts, dailyCounts) {
    const op = OP_MAP[d.operation];
    const item = document.createElement('div');
    item.className = 'history-item';
    const gradeBadge = d.grade ? `<span class="badge badge-grade">${d.grade}. Sınıf</span>` : '';
    const attemptKey = `${d.studentName}||${d.operation}`;
    const attemptNum = attemptCounts[attemptKey] || 1;
    const dailyNum = dailyCounts[attemptKey] || 0;
    const attemptBadge = attemptNum > 1 ? `<span class="badge badge-attempt" title="Toplam ${attemptNum} deneme, bugün ${dailyNum}">🔄 ${attemptNum}x</span>` : '';

    let anomalyBadges = '';
    if (anomalies.sharedDevices[d.studentName]) {
        anomalyBadges += `<span class="badge badge-warning" title="Ortak cihaz">⚠️ Ortak Cihaz</span>`;
    }
    if (anomalies.scoreAnomalies[d.studentName]) {
        const a = anomalies.scoreAnomalies[d.studentName];
        anomalyBadges += `<span class="badge badge-anomaly" title="Ort: %${a.avg} → Son: %${a.latest}">📈 +${a.jump}</span>`;
    }

    item.innerHTML = `
        <div>
            <strong>👤 ${d.studentName}</strong> ${gradeBadge} <span class="badge ${op.badge}">${op.label}</span> ${attemptBadge} ${anomalyBadges}<br>
            <small>${new Date(d.date).toLocaleString('tr-TR')}${d.timeLimit ? ` ⏱️${d.timeLimit/60}dk` : ''}</small>
        </div>
        <div style="text-align:right">
            <span style="color:green; font-weight:bold;">✅ ${d.correct}</span> |
            <span style="color:red; font-weight:bold;">❌ ${d.wrong}</span> |
            <span style="color:gray;">⬜ ${d.empty || 0}</span>
        </div>`;
    item.onclick = () => {
        let deviceAlert = '';
        if (anomalies.sharedDevices[d.studentName]) {
            const others = anomalies.sharedDevices[d.studentName].join(', ');
            deviceAlert += `<p style="color:#e74c3c; font-weight:bold;">⚠️ Ortak Cihaz: ${others} ile aynı cihazı kullanıyor</p>`;
        }
        if (anomalies.scoreAnomalies[d.studentName]) {
            const a = anomalies.scoreAnomalies[d.studentName];
            deviceAlert += `<p style="color:#e67e22; font-weight:bold;">📈 Performans anomalisi: Ortalama %${a.avg} → Son sınav %${a.latest} (+${a.jump})</p>`;
        }
        if (d.deviceId) {
            deviceAlert += `<p style="color:#888; font-size:0.8rem;">📱 Cihaz: ${d.deviceId.substring(0, 8)}...</p>`;
        }

        document.getElementById('modal-body').innerHTML = `
            ${deviceAlert}
            <p><strong>Öğrenci:</strong> ${d.studentName}</p>
            <p><strong>Süre:</strong> ${d.timeTaken}</p>
            <p><strong>Sonuç:</strong> ${d.correct} Doğru, ${d.wrong} Yanlış, ${d.empty || 0} Boş</p>
            ${renderBadgesInTeacherPanel(d.studentName)}
            <hr>
            <h4>Hatalı Sorular:</h4>
            ${d.mistakes && d.mistakes.length > 0 ? d.mistakes.map(m => `
                <div style="padding:10px; border-bottom:1px solid #eee;">
                    <b>${m.q}</b> → Doğru: ${m.r}, Seçilen: <span style="color:red">${m.y}</span>
                </div>
            `).join('') : (d.correct === 0 && (d.empty || 0) > 0
                ? '<p style="color:#e67e22; font-weight:bold;">⬜ Tüm sorular boş bırakıldı.</p>'
                : d.correct === 0 && d.wrong === 0
                    ? '<p style="color:#888;">Soru detayı bulunamadı.</p>'
                    : '<p>Hata yok! 🎉</p>')}`;
        document.getElementById('modal-detail').style.display = 'flex';
    };
    return item;
}

function renderPagination(totalPages, totalItems) {
    const container = document.getElementById('history-pagination');
    if (!container || totalPages <= 1) return;

    container.innerHTML = '';

    // Önceki butonu
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.disabled = historyPage <= 1;
    prevBtn.onclick = () => { historyPage--; renderHistory(); };
    container.appendChild(prevBtn);

    // Sayfa numaraları (akıllı aralık)
    const pages = getPageRange(historyPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            const dots = document.createElement('span');
            dots.className = 'page-info';
            dots.textContent = '…';
            container.appendChild(dots);
        } else {
            const btn = document.createElement('button');
            btn.textContent = p;
            btn.className = p === historyPage ? 'active' : '';
            btn.onclick = () => { historyPage = p; renderHistory(); };
            container.appendChild(btn);
        }
    });

    // Sonraki butonu
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.disabled = historyPage >= totalPages;
    nextBtn.onclick = () => { historyPage++; renderHistory(); };
    container.appendChild(nextBtn);

    // Bilgi metni
    const info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = `${totalItems} sonuç`;
    container.appendChild(info);
}

function getPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

// ================================================================
// İstatistik Paneli
// ================================================================
function renderStatistics() {
    const container = document.getElementById('stats-dashboard');
    if (!container) return;

    if (cachedHistory.length === 0) {
        container.innerHTML = '<p style="color:#aaa;">Henüz istatistik için yeterli veri yok.</p>';
        return;
    }

    const totalExams = cachedHistory.length;
    const uniqueStudents = new Set(cachedHistory.map(d => d.studentName)).size;
    const avgScore = Math.round(cachedHistory.reduce((sum, d) => {
        const total = d.correct + d.wrong + (d.empty || 0);
        return sum + (total > 0 ? (d.correct / total) * 100 : 0);
    }, 0) / totalExams);

    // İşlem bazlı hata analizi
    const opStats = {};
    cachedHistory.forEach(d => {
        if (!d.operation) return;
        if (!opStats[d.operation]) opStats[d.operation] = { correct: 0, wrong: 0, empty: 0, count: 0 };
        opStats[d.operation].correct += d.correct;
        opStats[d.operation].wrong += d.wrong;
        opStats[d.operation].empty += (d.empty || 0);
        opStats[d.operation].count++;
    });

    let weakestOp = null, highestErrorRate = 0;
    Object.entries(opStats).forEach(([op, s]) => {
        const total = s.correct + s.wrong + s.empty;
        const rate = total > 0 ? (s.wrong / total) * 100 : 0;
        if (rate > highestErrorRate) { highestErrorRate = rate; weakestOp = op; }
    });

    // Deneme sayısı analizi
    const attemptMap = {};
    cachedHistory.forEach(d => {
        const key = `${d.studentName}||${d.operation}`;
        attemptMap[key] = (attemptMap[key] || 0) + 1;
    });
    const multiAttemptStudents = Object.entries(attemptMap).filter(([, c]) => c > 1).length;

    // Genel özet kartları
    let html = `
        <div class="stats-overview">
            <div class="stat-card sc-blue"><div class="stat-number">${totalExams}</div><div class="stat-desc">Toplam Sınav</div></div>
            <div class="stat-card sc-green"><div class="stat-number">${uniqueStudents}</div><div class="stat-desc">Öğrenci</div></div>
            <div class="stat-card ${avgScore >= 70 ? 'sc-green' : avgScore >= 50 ? 'sc-yellow' : 'sc-red'}"><div class="stat-number">%${avgScore}</div><div class="stat-desc">Genel Ortalama</div></div>
            <div class="stat-card sc-red"><div class="stat-number">${weakestOp ? (OP_MAP[weakestOp]?.label || weakestOp) : '—'}</div><div class="stat-desc">En Zayıf İşlem</div></div>
        </div>`;

    // İşlem bazlı detay
    const opKeys = Object.keys(opStats);
    if (opKeys.length > 0) {
        html += '<div class="stats-op-grid">';
        opKeys.forEach(op => {
            const s = opStats[op];
            const total = s.correct + s.wrong + s.empty;
            const pct = total > 0 ? Math.round((s.correct / total) * 100) : 0;
            const barColor = pct >= 70 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#e74c3c';
            const label = OP_MAP[op]?.label || op;
            html += `
                <div class="stats-op-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${label}</strong><span style="color:${barColor}; font-weight:bold;">%${pct}</span>
                    </div>
                    <div class="stats-bar-bg"><div class="stats-bar-fill" style="width:${pct}%; background:${barColor};"></div></div>
                    <div style="font-size:0.75rem; color:#888; margin-top:4px;">${s.count} sınav · ✅${s.correct} ❌${s.wrong} ⬜${s.empty}</div>
                </div>`;
        });
        html += '</div>';
    }

    // Sınıf bazlı performans
    const gradeStats = {};
    cachedHistory.forEach(d => {
        const g = d.grade || 0;
        if (!g) return;
        if (!gradeStats[g]) gradeStats[g] = { students: new Set(), scores: [], exams: 0, opErrors: {} };
        gradeStats[g].exams++;
        gradeStats[g].students.add(d.studentName);
        const total = d.correct + d.wrong + (d.empty || 0);
        if (total > 0) gradeStats[g].scores.push(Math.round((d.correct / total) * 100));
        if (d.operation) {
            if (!gradeStats[g].opErrors[d.operation]) gradeStats[g].opErrors[d.operation] = { wrong: 0, total: 0 };
            gradeStats[g].opErrors[d.operation].wrong += d.wrong;
            gradeStats[g].opErrors[d.operation].total += total;
        }
    });

    const grades = Object.keys(gradeStats).sort((a, b) => a - b);
    if (grades.length > 0) {
        html += '<h5 style="margin:18px 0 10px; color:var(--primary);">📚 Sınıf Bazlı Performans</h5>';
        html += '<div class="grade-stats-list">';
        grades.forEach(g => {
            const gs = gradeStats[g];
            const avg = gs.scores.length > 0 ? Math.round(gs.scores.reduce((a, b) => a + b, 0) / gs.scores.length) : 0;
            const min = gs.scores.length > 0 ? Math.min(...gs.scores) : 0;
            const max = gs.scores.length > 0 ? Math.max(...gs.scores) : 0;
            const barColor = avg >= 70 ? '#27ae60' : avg >= 50 ? '#f39c12' : '#e74c3c';

            let gradeWeakest = '—';
            let gradeHighErr = 0;
            Object.entries(gs.opErrors).forEach(([op, data]) => {
                const rate = data.total > 0 ? (data.wrong / data.total) * 100 : 0;
                if (rate > gradeHighErr) { gradeHighErr = rate; gradeWeakest = OP_MAP[op]?.label || op; }
            });

            html += `
                <div class="grade-stat-card">
                    <div class="grade-stat-header">
                        <strong>${GRADE_CONFIG[g]?.label || g + '. Sınıf'}</strong>
                        <span style="color:${barColor}; font-weight:bold;">%${avg}</span>
                    </div>
                    <div class="stats-bar-bg"><div class="stats-bar-fill" style="width:${avg}%; background:${barColor};"></div></div>
                    <div class="grade-stat-details">
                        <span>👥 ${gs.students.size}</span>
                        <span>📝 ${gs.exams}</span>
                        <span>📉 %${min}</span>
                        <span>📈 %${max}</span>
                        <span>⚠️ ${gradeWeakest}</span>
                    </div>
                </div>`;
        });
        html += '</div>';
    }

    // Tekrar deneme uyarısı
    if (multiAttemptStudents > 0) {
        html += `<p style="margin-top:12px; color:#e67e22; font-size:0.85rem;">🔄 ${multiAttemptStudents} öğrenci-işlem çifti birden fazla deneme yapmış.</p>`;
    }

    container.innerHTML = html;
}

// ================================================================
// Öğrenci PIN Yönetimi
// ================================================================
async function loadStudentPinList() {
    const container = document.getElementById('student-pin-list');
    if (!container) return;
    container.innerHTML = '<p style="color:#aaa;">Yükleniyor...</p>';

    try {
        const resp = await api(`/teachers/${state.teacherCode}/students`);
        const students = resp.results || [];

        if (students.length === 0) {
            container.innerHTML = '<p style="color:#aaa;">Henüz kayıtlı öğrenci yok.</p>';
            return;
        }

        container.innerHTML = '';
        students.forEach(d => {
            const displayName = d.student_name || d.studentName;
            const safeName = displayName.replace(/'/g, "\\'");
            const row = document.createElement('div');
            row.className = 'student-pin-row';
            row.innerHTML = `
                <div class="student-pin-info">
                    <strong>👤 ${displayName}</strong>
                    <small>Kayıt: ${d.created_at ? new Date(d.created_at).toLocaleDateString('tr-TR') : '—'}</small>
                </div>
                <button class="btn btn-danger btn-sm" onclick="resetStudentPin('${encodeURIComponent(displayName)}', '${safeName}')">🔄 PIN Sıfırla</button>`;
            container.appendChild(row);
        });
    } catch (err) {
        console.error('Öğrenci listesi hatası:', err);
        container.innerHTML = '<p style="color:#e74c3c;">Liste yüklenemedi.</p>';
    }
}

window.resetStudentPin = async (studentId, displayName) => {
    if (!confirm(`"${displayName}" adlı öğrencinin PIN'i silinecek.\nÖğrenci bir sonraki girişte yeni PIN belirleyecek.\n\nDevam edilsin mi?`)) return;

    try {
        await api(`/teachers/${state.teacherCode}/students/${studentId}`, 'DELETE');
        alert(`✅ ${displayName} için PIN sıfırlandı.`);
        await loadStudentPinList();
    } catch (err) {
        console.error('PIN sıfırlama hatası:', err);
        alert('PIN sıfırlanamadı: ' + err.message);
    }
};

// ================================================================
// Öğrenci Yoklama Listesi (Sınıf Listesi)
// ================================================================
function getRoster() {
    const key = `md_roster_${state.teacherCode}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveRoster(list) {
    const key = `md_roster_${state.teacherCode}`;
    localStorage.setItem(key, JSON.stringify(list));
}

window.addToRoster = () => {
    const input = document.getElementById('roster-name-input');
    const name = input.value.trim();
    if (!name) return alert("Öğrenci adı girin.");

    const roster = getRoster();
    if (roster.some(n => n.toLowerCase() === name.toLowerCase())) {
        return alert("Bu öğrenci zaten listede.");
    }
    roster.push(name);
    roster.sort((a, b) => a.localeCompare(b, 'tr'));
    saveRoster(roster);
    input.value = '';
    renderRoster();
};

window.removeFromRoster = (name) => {
    const roster = getRoster().filter(n => n !== name);
    saveRoster(roster);
    renderRoster();
};

function renderRoster() {
    const container = document.getElementById('roster-list');
    const missingContainer = document.getElementById('roster-missing');
    if (!container) return;

    const roster = getRoster();

    if (roster.length === 0) {
        container.innerHTML = '<p style="color:#aaa; font-size:0.85rem;">Henüz öğrenci eklenmedi.</p>';
        if (missingContainer) missingContainer.innerHTML = '';
        return;
    }

    // Kimler test çözmüş?
    const solvedStudents = new Set(cachedHistory.map(d => d.studentName.toLowerCase()));

    container.innerHTML = '';
    roster.forEach(name => {
        const solved = solvedStudents.has(name.toLowerCase());
        const row = document.createElement('div');
        row.className = `roster-row ${solved ? 'roster-solved' : 'roster-missing-row'}`;
        row.innerHTML = `
            <div>
                <span>${solved ? '✅' : '❌'}</span>
                <strong>${name}</strong>
                ${solved ? '<small style="color:#27ae60;"> — Test çözmüş</small>' : '<small style="color:#e74c3c;"> — Henüz çözmedi</small>'}
            </div>
            <button class="btn-icon" onclick="removeFromRoster('${name.replace(/'/g, "\\'")}')" title="Listeden kaldır">🗑️</button>`;
        container.appendChild(row);
    });

    // Çözmeyenler özeti
    const missing = roster.filter(n => !solvedStudents.has(n.toLowerCase()));
    if (missingContainer) {
        if (missing.length > 0) {
            missingContainer.innerHTML = `
                <div class="roster-alert">
                    <strong>⚠️ ${missing.length} öğrenci henüz test çözmedi:</strong>
                    <p>${missing.join(', ')}</p>
                </div>`;
        } else {
            missingContainer.innerHTML = `<p style="color:#27ae60; font-weight:bold;">🎉 Tüm öğrenciler en az bir test çözmüş!</p>`;
        }
    }
}

// ================================================================
// Rozet / Başarı Sistemi
// ================================================================
const BADGE_DEFS = [
    { id: 'first_quiz',    icon: '🎯', title: 'İlk Adım',          desc: 'İlk sınavını tamamladın!',          check: (h) => h.filter(d => d.correct > 0 || d.wrong > 0).length >= 1 },
    { id: 'five_quizzes',  icon: '🏅', title: '5 Sınav Tamam',     desc: '5 sınav çözdün!',                    check: (h) => h.filter(d => d.correct > 0 || d.wrong > 0).length >= 5 },
    { id: 'ten_quizzes',   icon: '🏆', title: '10 Sınav Şampiyonu', desc: '10 sınav çözdün, harikasın!',       check: (h) => h.filter(d => d.correct > 0 || d.wrong > 0).length >= 10 },
    { id: 'perfect',       icon: '💯', title: 'Mükemmel Sınav',     desc: 'Bir sınavda %100 aldın!',           check: (h) => h.some(d => { const t = d.correct + d.wrong + (d.empty||0); return t > 0 && d.correct === t; }) },
    { id: 'streak3',       icon: '🔥', title: '3\'lü Seri',         desc: 'Arka arkaya 3 kez %80+ aldın!',    check: (h) => checkStreak(h, 80, 3) },
    { id: 'streak5',       icon: '🔥🔥', title: '5\'li Seri',       desc: 'Arka arkaya 5 kez %80+ aldın!',    check: (h) => checkStreak(h, 80, 5) },
    { id: 'fast_solver',   icon: '⚡', title: 'Hız Ustası',         desc: 'Bir sınavı 5 dakikadan kısa sürede bitirdin!', check: (h) => h.some(d => parseTime(d.timeTaken) > 0 && parseTime(d.timeTaken) < 300) },
    { id: 'improver',      icon: '📈', title: 'Gelişim Göstergesi', desc: 'Son sınavın öncekinden en az 20 puan daha iyi!', check: (h) => checkImprovement(h.filter(d => d.correct > 0 || d.wrong > 0), 20) },
    { id: 'addition_master',       icon: '➕', title: 'Toplama Ustası',      desc: 'Toplamada %90+ aldın!', check: (h) => checkOpMastery(h, 'addition', 90) },
    { id: 'subtraction_master',    icon: '➖', title: 'Çıkarma Ustası',      desc: 'Çıkarmada %90+ aldın!', check: (h) => checkOpMastery(h, 'subtraction', 90) },
    { id: 'multiplication_master', icon: '✖️', title: 'Çarpma Ustası',       desc: 'Çarpmada %90+ aldın!', check: (h) => checkOpMastery(h, 'multiplication', 90) },
    { id: 'division_master',       icon: '➗', title: 'Bölme Ustası',        desc: 'Bölmede %90+ aldın!', check: (h) => checkOpMastery(h, 'division', 90) },
    { id: 'all_ops',       icon: '🌟', title: 'Dört İşlem Kahramanı', desc: 'Tüm işlem türlerinde sınav çözdün!', check: (h) => { const ops = new Set(h.map(d => d.operation)); return ['addition','subtraction','multiplication','division'].every(o => ops.has(o)); } }
];

function parseTime(str) {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

function checkStreak(history, threshold, count) {
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    let streak = 0;
    for (const d of sorted) {
        const total = d.correct + d.wrong + (d.empty || 0);
        const pct = total > 0 ? (d.correct / total) * 100 : 0;
        streak = pct >= threshold ? streak + 1 : 0;
        if (streak >= count) return true;
    }
    return false;
}

function checkImprovement(history, minJump) {
    if (history.length < 2) return false;
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1], curr = sorted[i];
        const tP = prev.correct + prev.wrong + (prev.empty || 0);
        const tC = curr.correct + curr.wrong + (curr.empty || 0);
        if (tP > 0 && tC > 0) {
            const pctP = (prev.correct / tP) * 100;
            const pctC = (curr.correct / tC) * 100;
            if (pctC - pctP >= minJump) return true;
        }
    }
    return false;
}

function checkOpMastery(history, operation, threshold) {
    return history.some(d => {
        if (d.operation !== operation) return false;
        const total = d.correct + d.wrong + (d.empty || 0);
        return total > 0 && (d.correct / total) * 100 >= threshold;
    });
}

function getEarnedBadges(studentHistory) {
    return BADGE_DEFS.filter(b => b.check(studentHistory));
}

function renderBadgesInResult() {
    const container = document.getElementById('result-badges');
    if (!container) return;

    // Mevcut öğrencinin geçmişini bul (cachedHistory + bu sınav)
    const myHistory = cachedHistory.filter(d => d.studentName === state.studentName);
    // Şu anki sınav sonucunu da ekle
    const currentResult = {
        studentName: state.studentName,
        operation: state.operation,
        grade: state.grade,
        correct: parseInt(document.querySelector('.stat-correct .stat-value')?.textContent || '0'),
        wrong: parseInt(document.querySelector('.stat-wrong .stat-value')?.textContent || '0'),
        empty: parseInt(document.querySelector('.stat-empty .stat-value')?.textContent || '0'),
        timeTaken: document.getElementById('student-timer')?.textContent || '00:00',
        date: new Date().toISOString()
    };
    const fullHistory = [...myHistory, currentResult];

    const earned = getEarnedBadges(fullHistory);
    if (earned.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <h3 style="margin-bottom:10px;">🏆 Kazanılan Rozetler</h3>
        <div class="badges-grid">
            ${earned.map(b => `
                <div class="badge-card" title="${b.desc}">
                    <span class="badge-icon">${b.icon}</span>
                    <span class="badge-title">${b.title}</span>
                </div>
            `).join('')}
        </div>`;
}

function renderBadgesInTeacherPanel(studentName) {
    const myHistory = cachedHistory.filter(d => d.studentName === studentName);
    const earned = getEarnedBadges(myHistory);
    if (earned.length === 0) return '';
    return `<div style="margin-top:8px;">${earned.map(b => `<span class="badge badge-earned" title="${b.desc}">${b.icon} ${b.title}</span>`).join(' ')}</div>`;
}

// ================================================================
// Özellik 6: Kod Yenileme (Geçmiş Taşıma ile)
// ================================================================
window.renewTeacherCode = async () => {
    if (!state.teacherCode) return alert('Önce giriş yapın.');

    const sure = await customConfirm({
        icon: '🔄',
        title: 'Kod Yenileme',
        message: 'Sınıf kodunuz değişecek. Tüm geçmiş ve öğrenci verileri yeni koda taşınacak. Eski kod artık çalışmayacak. Devam etmek istiyor musunuz?',
        okText: 'Evet, Yenile',
        cancelText: 'Vazgeç',
        okClass: 'btn-danger'
    });
    if (!sure) return;

    const statusEl = document.getElementById('renew-status');
    statusEl.textContent = '⏳ Yeni kod üretiliyor...';

    try {
        const oldCode = state.teacherCode;

        // 1. Yeni benzersiz kod üret
        let newCode = '';
        let exists = true;
        while (exists) {
            newCode = generateCode();
            const check = await api(`/teachers/${newCode}/exists`);
            exists = check.exists;
        }

        statusEl.textContent = '⏳ Veriler taşınıyor...';

        // 2. Sunucu tarafında batch taşıma (history + students + teacher)
        await api(`/teachers/${oldCode}/renew`, 'POST', { newCode });

        // 3. Roster'ı localStorage'da taşı
        const oldRoster = localStorage.getItem(`md_roster_${oldCode}`);
        if (oldRoster) {
            localStorage.setItem(`md_roster_${newCode}`, oldRoster);
            localStorage.removeItem(`md_roster_${oldCode}`);
        }

        // 4. State güncelle
        state.teacherCode = newCode;

        // 5. Panel güncelle
        document.getElementById('panel-code-badge').textContent = `KOD: ${formatCode(newCode)}`;
        statusEl.innerHTML = `✅ Tamamlandı! Yeni kod: <strong>${formatCode(newCode)}</strong>`;

        alert(
            `✅ Kod yenileme başarılı!\n\n` +
            `Yeni Kod: ${formatCode(newCode)}\n\n` +
            `⚠️ Bu kodu öğrencilerinize paylaşmayı unutmayın!`
        );

        // 6. Geçmişi yeniden yükle
        await loadTeacherHistory();
        await loadStudentPinList();

    } catch (err) {
        console.error('Kod yenileme hatası:', err);
        statusEl.textContent = '❌ Hata oluştu.';
        alert('Kod yenileme sırasında hata oluştu: ' + err.message);
    }
};

// ================================================================
// Özellik 7: Çevrimdışı Yedekleme (Pending Results)
// ================================================================
const PENDING_KEY = 'md_pending_results';

function getPendingResults() {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    } catch { return []; }
}

function savePendingResult(result, teacherCode) {
    const pending = getPendingResults();
    pending.push({ result, teacherCode, savedAt: new Date().toISOString() });
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    updateOfflineBanner();
}

function clearPendingResults() {
    localStorage.removeItem(PENDING_KEY);
    updateOfflineBanner();
}

function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    const pending = getPendingResults();
    banner.style.display = pending.length > 0 ? 'flex' : 'none';
}

window.retryPendingResults = async () => {
    const pending = getPendingResults();
    if (pending.length === 0) return;

    const banner = document.getElementById('offline-banner');
    if (banner) banner.innerHTML = '⏳ Gönderiliyor...';

    const failed = [];
    for (const item of pending) {
        try {
            await api(`/teachers/${item.teacherCode}/history`, 'POST', item.result);
        } catch {
            failed.push(item);
        }
    }

    if (failed.length > 0) {
        localStorage.setItem(PENDING_KEY, JSON.stringify(failed));
        alert(`${pending.length - failed.length} sonuç gönderildi, ${failed.length} hâlâ bekliyor.`);
    } else {
        clearPendingResults();
        alert('✅ Tüm bekleyen sonuçlar başarıyla gönderildi!');
    }
    updateOfflineBanner();
};

// Sayfa yüklenince bekleyen sonuçları kontrol et ve otomatik gönder
setTimeout(async () => {
    updateOfflineBanner();
    const pending = getPendingResults();
    if (pending.length > 0) {
        const failed = [];
        for (const item of pending) {
            try {
                await api(`/teachers/${item.teacherCode}/history`, 'POST', item.result);
            } catch {
                failed.push(item);
            }
        }
        if (failed.length > 0) {
            localStorage.setItem(PENDING_KEY, JSON.stringify(failed));
        } else {
            clearPendingResults();
        }
        updateOfflineBanner();
    }
}, 3000);

// ================================================================
// Özellik 8: PDF Rapor Oluşturma
// ================================================================
async function ensureJsPDF() {
    if (window.jspdf) return true;
    try {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        return !!window.jspdf;
    } catch {
        return false;
    }
}

function createPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFont('helvetica');
    return pdf;
}

function pdfHeader(pdf, title) {
    pdf.setFontSize(18);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Matematik Dehasi', 105, 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text(new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }), 105, 22, { align: 'center' });
    pdf.setDrawColor(52, 152, 219);
    pdf.setLineWidth(0.5);
    pdf.line(15, 25, 195, 25);
    pdf.setFontSize(14);
    pdf.setTextColor(44, 62, 80);
    pdf.text(title, 105, 33, { align: 'center' });
    return 42;
}

function pdfStudentReport(pdf, studentName, history, startY) {
    let y = startY;
    const studentHistory = history.filter(d => d.studentName === studentName);
    if (studentHistory.length === 0) return y;

    const totalExams = studentHistory.length;
    const avgScore = Math.round(studentHistory.reduce((s, d) => {
        const total = d.correct + d.wrong + (d.empty || 0);
        return s + (total > 0 ? (d.correct / total) * 100 : 0);
    }, 0) / totalExams);

    const ops = {};
    studentHistory.forEach(d => {
        if (!ops[d.operation]) ops[d.operation] = { correct: 0, total: 0 };
        ops[d.operation].correct += d.correct;
        ops[d.operation].total += d.correct + d.wrong + (d.empty || 0);
    });

    // Ogrenci adi
    pdf.setFontSize(12);
    pdf.setTextColor(41, 128, 185);
    pdf.text(`Ogrenci: ${studentName}`, 15, y);
    y += 8;

    // Ozet
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Toplam Sinav: ${totalExams}    |    Ortalama Basari: %${avgScore}`, 15, y);
    y += 8;

    // Islem Bazli tablo
    pdf.setFillColor(236, 240, 241);
    pdf.rect(15, y, 180, 7, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Islem', 18, y + 5);
    pdf.text('Sinav', 80, y + 5);
    pdf.text('Dogru', 110, y + 5);
    pdf.text('Basari', 150, y + 5);
    y += 9;

    const opNames = { addition: 'Toplama', subtraction: 'Cikarma', multiplication: 'Carpma', division: 'Bolme', mixed_equations: 'Denklem' };
    Object.entries(ops).forEach(([op, data]) => {
        const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        pdf.setTextColor(60, 60, 60);
        pdf.text(opNames[op] || op, 18, y + 4);
        const examCount = studentHistory.filter(d => d.operation === op).length;
        pdf.text(String(examCount), 80, y + 4);
        pdf.text(`${data.correct}/${data.total}`, 110, y + 4);

        if (pct >= 80) pdf.setTextColor(39, 174, 96);
        else if (pct >= 50) pdf.setTextColor(243, 156, 18);
        else pdf.setTextColor(231, 76, 60);
        pdf.text(`%${pct}`, 150, y + 4);
        y += 7;
    });

    y += 3;

    // Son 5 sinav
    const recent = studentHistory.slice(0, 5);
    if (recent.length > 0) {
        pdf.setFontSize(10);
        pdf.setTextColor(44, 62, 80);
        pdf.text('Son Sinavlar:', 15, y);
        y += 6;

        pdf.setFillColor(236, 240, 241);
        pdf.rect(15, y, 180, 7, 'F');
        pdf.setFontSize(8);
        pdf.text('Tarih', 18, y + 5);
        pdf.text('Islem', 55, y + 5);
        pdf.text('Dogru', 95, y + 5);
        pdf.text('Yanlis', 120, y + 5);
        pdf.text('Bos', 142, y + 5);
        pdf.text('Sure', 162, y + 5);
        y += 9;

        recent.forEach(d => {
            if (y > 270) { pdf.addPage(); y = 20; }
            const date = new Date(d.date).toLocaleDateString('tr-TR');
            pdf.setTextColor(60, 60, 60);
            pdf.text(date, 18, y + 4);
            pdf.text(opNames[d.operation] || d.operation, 55, y + 4);
            pdf.text(String(d.correct), 95, y + 4);
            pdf.text(String(d.wrong), 120, y + 4);
            pdf.text(String(d.empty || 0), 142, y + 4);
            pdf.text(d.timeTaken || '-', 162, y + 4);
            y += 6;
        });
    }

    y += 5;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, y, 195, y);
    y += 8;

    return y;
}

window.generateStudentPDF = async () => {
    const select = document.getElementById('pdf-student-select');
    if (!select) return;
    const studentName = select.value;
    if (!studentName) return alert('Lutfen bir ogrenci secin.');

    try {
        if (!await ensureJsPDF()) {
            alert('PDF kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.');
            return;
        }

        const pdf = createPDF();
        let y = pdfHeader(pdf, `Ogrenci Performans Raporu`);
        y = pdfStudentReport(pdf, studentName, cachedHistory, y);

        // Alt bilgi
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Bu rapor Matematik Dehasi tarafindan otomatik olusturulmustur.', 105, 285, { align: 'center' });

        pdf.save(`MatematikDehasi_${studentName.replace(/\s+/g, '_')}_Rapor.pdf`);
    } catch (err) {
        console.error('PDF olusturma hatasi:', err);
        alert('PDF oluşturulamadı. Lütfen tekrar deneyin.');
    }
};

window.generateClassPDF = async () => {
    if (cachedHistory.length === 0) return alert('Henuz sinav verisi yok.');

    try {
        if (!await ensureJsPDF()) {
            alert('PDF kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.');
            return;
        }

        const pdf = createPDF();
        let y = pdfHeader(pdf, `Sinif Performans Raporu`);

        // Genel istatistik
        const students = [...new Set(cachedHistory.map(d => d.studentName))];
        const totalExams = cachedHistory.length;
        const avgScore = Math.round(cachedHistory.reduce((s, d) => {
            const total = d.correct + d.wrong + (d.empty || 0);
            return s + (total > 0 ? (d.correct / total) * 100 : 0);
        }, 0) / totalExams);

        pdf.setFontSize(11);
        pdf.setTextColor(44, 62, 80);
        pdf.text(`Ogretmen: ${state.teacherName}    |    Kod: ${formatCode(state.teacherCode)}`, 15, y);
        y += 7;
        pdf.text(`Toplam: ${totalExams} sinav, ${students.length} ogrenci    |    Genel Ortalama: %${avgScore}`, 15, y);
        y += 12;

        // Her öğrenci
        students.sort().forEach(name => {
            if (y > 230) { pdf.addPage(); y = 20; }
            y = pdfStudentReport(pdf, name, cachedHistory, y);
        });

        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Bu rapor Matematik Dehasi tarafindan otomatik olusturulmustur.', 105, 285, { align: 'center' });

        pdf.save(`MatematikDehasi_Sinif_Raporu_${formatCode(state.teacherCode)}.pdf`);
    } catch (err) {
        console.error('PDF olusturma hatasi:', err);
        alert('PDF oluşturulamadı. Lütfen tekrar deneyin.');
    }
};

// Öğrenci sonuç ekranından PDF indirme
window.downloadResultPDF = async () => {
    try {
        if (!await ensureJsPDF()) {
            alert('PDF kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.');
            return;
        }
        if (!cachedResults || cachedResults.length === 0) {
            alert('PDF oluşturmak için sınav sonucu bulunamadı.');
            return;
        }

        const pdf = createPDF();
        let y = pdfHeader(pdf, 'Sinav Sonuc Raporu');

        pdf.setFontSize(11);
        pdf.setTextColor(44, 62, 80);
        pdf.text(`Ogrenci: ${state.studentName}`, 15, y);
        y += 7;

        const pctText = document.querySelector('.result-score-fill')?.parentElement?.nextElementSibling?.textContent || '';
        const time = document.querySelector('.stat-time .stat-value')?.textContent || '';
        pdf.text(`Sonuc: ${pctText.trim()}    |    Sure: ${time}`, 15, y);
        y += 10;

        // Soru detaylari
        pdf.setFillColor(236, 240, 241);
        pdf.rect(15, y, 180, 7, 'F');
        pdf.setFontSize(9);
        pdf.setTextColor(44, 62, 80);
        pdf.text('#', 18, y + 5);
        pdf.text('Soru', 30, y + 5);
        pdf.text('Cevap', 110, y + 5);
        pdf.text('Dogru Cevap', 145, y + 5);
        y += 9;

        cachedResults.forEach((r, i) => {
            if (y > 275) { pdf.addPage(); y = 20; }
            pdf.setTextColor(60, 60, 60);
            pdf.text(`${i + 1}.`, 18, y + 4);
            pdf.text(r.q || '', 30, y + 4);

            if (r.status === 'correct') {
                pdf.setTextColor(39, 174, 96);
                pdf.text(String(r.correct), 110, y + 4);
            } else if (r.status === 'wrong') {
                pdf.setTextColor(231, 76, 60);
                pdf.text(String(r.given), 110, y + 4);
            } else {
                pdf.setTextColor(150, 150, 150);
                pdf.text('-', 110, y + 4);
            }
            pdf.setTextColor(60, 60, 60);
            pdf.text(String(r.correct), 145, y + 4);
            y += 6;
        });

        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Bu rapor Matematik Dehasi tarafindan otomatik olusturulmustur.', 105, 285, { align: 'center' });

        pdf.save(`MatematikDehasi_${state.studentName.replace(/\s+/g, '_')}_Sonuc.pdf`);
    } catch (err) {
        console.error('PDF olusturma hatasi:', err);
        alert('PDF oluşturulamadı. Lütfen tekrar deneyin.');
    }
};

// PDF öğrenci seçim listesini güncelle
function updatePdfStudentList() {
    const select = document.getElementById('pdf-student-select');
    if (!select) return;
    const students = [...new Set(cachedHistory.map(d => d.studentName))].sort();
    select.innerHTML = '<option value="">-- Ogrenci Secin --</option>' +
        students.map(s => `<option value="${s}">${s}</option>`).join('');
}
