import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

// Anonim oturum (Firestore erişimi için)
signInAnonymously(auth).catch(err => console.error("Auth hatası:", err));

// KVKK onay kontrolü — auth hazır olunca
onAuthStateChanged(auth, (user) => {
    if (user) checkKvkkConsent();
});

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
        await setDoc(doc(db, 'consents', getDeviceId()), {
            accepted: true,
            consentVersion: '1.0',
            timestamp: new Date().toISOString(),
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
        operations: ['addition', 'subtraction', 'multiplication', 'division'],
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

    // Kurum şifresini Firebase'den doğrula
    try {
        const settingsRef = doc(db, 'settings', 'master');
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            // İlk kurulum: master şifre henüz yok, varsayılanı oluştur
            await setDoc(settingsRef, { registrationPin: 'ogretmen2025' });
            if (masterPin !== 'ogretmen2025') {
                return alert("Kurum kayıt şifresi hatalı.");
            }
        } else {
            const storedPin = settingsSnap.data().registrationPin;
            if (masterPin !== storedPin) {
                return alert("Kurum kayıt şifresi hatalı.");
            }
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
        const docRef = doc(db, 'teachers', code);
        const snap = await getDoc(docRef);
        exists = snap.exists();
    }

    try {
        await setDoc(doc(db, 'teachers', code), {
            name: name,
            grades: grades,
            pin: pin,
            createdAt: new Date().toISOString()
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
        const docRef = doc(db, 'teachers', code);
        const snap = await getDoc(docRef);

        if (!snap.exists()) return alert("Bu kodla kayıtlı öğretmen bulunamadı.");

        const data = snap.data();
        if (data.pin !== pin) return alert("Hatalı şifre!");

        state.teacherCode = code;
        state.teacherName = data.name;
        state.teacherGrades = (data.grades || [data.grade || 1]).sort((a, b) => a - b);

        document.getElementById('teacher-panel-title').textContent = `${data.name} - Öğretmen Paneli 👨‍🏫`;
        document.getElementById('panel-code-badge').textContent = `KOD: ${formatCode(code)}`;

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
        await updateDoc(doc(db, 'teachers', state.teacherCode), { pin: newVal });
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
        await updateDoc(doc(db, 'teachers', state.teacherCode), { grades: newGrades });
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
        const docRef = doc(db, 'teachers', code);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return alert("Bu öğretmen kodu bulunamadı. Kodunu kontrol et.");

        const data = snap.data();
        const grades = (data.grades || [data.grade || 1]).sort((a, b) => a - b);

        state.teacherCode = code;
        state.teacherName = data.name;
        state.teacherGrades = grades;

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
        `📚 <strong>${gc.label}</strong> — Öğretmen: ${state.teacherName}`;

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
    const studentRef = doc(db, 'teachers', state.teacherCode, 'students', normalizedName);
    const pinSection = document.getElementById('student-pin-section');
    const pinInput = document.getElementById('student-pin');
    const pinConfirmWrap = document.getElementById('student-pin-confirm-wrap');

    // İlk tıklama: PIN alanını göster
    if (pinSection.style.display === 'none') {
        try {
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
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
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.data().pin !== pin) {
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
            await setDoc(studentRef, {
                pin: pin,
                displayName: name,
                deviceId: getDeviceId(),
                createdAt: new Date().toISOString()
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

    let title = `${GRADE_CONFIG[state.grade].label} \u2014 ${OP_MAP[state.operation].label}`;
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
        const m = String(Math.floor(state.quiz.seconds / 60)).padStart(2, '0');
        const s = String(state.quiz.seconds % 60).padStart(2, '0');
        const timerEl = document.getElementById('student-timer');
        if (timerEl) timerEl.innerText = `${m}:${s}`;
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
// Test Bitirme — Sonuç Firebase'e Kaydedilir
// ================================================================
window.confirmFinish = async () => {
    if (Object.keys(state.quiz.answers).length < state.totalQs && !confirm("Boş sorularınız var. Bitirilsin mi?")) return;
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
        mistakes,
        deviceId: getDeviceId()
    };

    try {
        const historyRef = collection(db, 'teachers', state.teacherCode, 'history');
        await addDoc(historyRef, result);
    } catch (err) {
        console.error("Sonuç kaydedilemedi:", err);
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
    switchView('view-result');
}

window.filterResults = (filter) => {
    document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

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

async function loadTeacherHistory() {
    const list = document.getElementById('teacher-history');
    list.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const historyRef = collection(db, 'teachers', state.teacherCode, 'history');
        const snap = await getDocs(historyRef);
        cachedHistory = [];
        snap.forEach(d => cachedHistory.push(d.data()));
        cachedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        historyFilterGrade = 'all';
        renderHistoryFilter();
        renderHistory();
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
    allBtn.onclick = () => { historyFilterGrade = 'all'; renderHistoryFilter(); renderHistory(); };
    container.appendChild(allBtn);

    state.teacherGrades.forEach(g => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${historyFilterGrade === g ? 'active' : ''}`;
        btn.textContent = `${g}. Sınıf`;
        btn.onclick = () => { historyFilterGrade = g; renderHistoryFilter(); renderHistory(); };
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
    list.innerHTML = "";

    const filtered = historyFilterGrade === 'all'
        ? cachedHistory
        : cachedHistory.filter(d => d.grade === historyFilterGrade);

    if (filtered.length === 0) {
        list.innerHTML = historyFilterGrade === 'all'
            ? "<p>Hen\u00fcz \u00f6\u011frenci sonucu bulunmuyor. \u00d6\u011frencilerinize kodunuzu verin!</p>"
            : "<p>Bu s\u0131n\u0131f i\u00e7in hen\u00fcz sonu\u00e7 bulunmuyor.</p>";
        return;
    }

    const anomalies = detectAnomalies(cachedHistory);

    filtered.forEach(d => {
        const op = OP_MAP[d.operation];
        const item = document.createElement('div');
        item.className = 'history-item';
        const gradeBadge = d.grade ? `<span class="badge badge-grade">${d.grade}. S\u0131n\u0131f</span>` : '';

        let anomalyBadges = '';
        if (anomalies.sharedDevices[d.studentName]) {
            anomalyBadges += `<span class="badge badge-warning" title="Ortak cihaz">\u26a0\ufe0f Ortak Cihaz</span>`;
        }
        if (anomalies.scoreAnomalies[d.studentName]) {
            const a = anomalies.scoreAnomalies[d.studentName];
            anomalyBadges += `<span class="badge badge-anomaly" title="Ort: %${a.avg} \u2192 Son: %${a.latest}">\ud83d\udcc8 +${a.jump}</span>`;
        }

        item.innerHTML = `
            <div>
                <strong>\ud83d\udc64 ${d.studentName}</strong> ${gradeBadge} <span class="badge ${op.badge}">${op.label}</span> ${anomalyBadges}<br>
                <small>${new Date(d.date).toLocaleString('tr-TR')}</small>
            </div>
            <div style="text-align:right">
                <span style="color:green; font-weight:bold;">\u2705 ${d.correct}</span> |
                <span style="color:red; font-weight:bold;">\u274c ${d.wrong}</span> |
                <span style="color:gray;">\u2b1c ${d.empty}</span>
            </div>`;
        item.onclick = () => {
            let deviceAlert = '';
            if (anomalies.sharedDevices[d.studentName]) {
                const others = anomalies.sharedDevices[d.studentName].join(', ');
                deviceAlert += `<p style="color:#e74c3c; font-weight:bold;">\u26a0\ufe0f Ortak Cihaz: ${others} ile ayn\u0131 cihaz\u0131 kullan\u0131yor</p>`;
            }
            if (anomalies.scoreAnomalies[d.studentName]) {
                const a = anomalies.scoreAnomalies[d.studentName];
                deviceAlert += `<p style="color:#e67e22; font-weight:bold;">\ud83d\udcc8 Performans anomalisi: Ortalama %${a.avg} \u2192 Son s\u0131nav %${a.latest} (+${a.jump})</p>`;
            }
            if (d.deviceId) {
                deviceAlert += `<p style="color:#888; font-size:0.8rem;">\ud83d\udcf1 Cihaz: ${d.deviceId.substring(0, 8)}...</p>`;
            }

            document.getElementById('modal-body').innerHTML = `
                ${deviceAlert}
                <p><strong>\u00d6\u011frenci:</strong> ${d.studentName}</p>
                <p><strong>S\u00fcre:</strong> ${d.timeTaken}</p>
                <p><strong>Sonu\u00e7:</strong> ${d.correct} Do\u011fru, ${d.wrong} Yanl\u0131\u015f, ${d.empty} Bo\u015f</p>
                <hr>
                <h4>Hatal\u0131 Sorular:</h4>
                ${d.mistakes && d.mistakes.length > 0 ? d.mistakes.map(m => `
                    <div style="padding:10px; border-bottom:1px solid #eee;">
                        <b>${m.q}</b> → Doğru: ${m.r}, Seçilen: <span style="color:red">${m.y}</span>
                    </div>
                `).join('') : "<p>Hata yok! 🎉</p>"}`;
            document.getElementById('modal-detail').style.display = 'flex';
        };
        list.appendChild(item);
    });
}

// ================================================================
// Öğrenci PIN Yönetimi
// ================================================================
async function loadStudentPinList() {
    const container = document.getElementById('student-pin-list');
    if (!container) return;
    container.innerHTML = '<p style="color:#aaa;">Yükleniyor...</p>';

    try {
        const studentsRef = collection(db, 'teachers', state.teacherCode, 'students');
        const snap = await getDocs(studentsRef);

        if (snap.empty) {
            container.innerHTML = '<p style="color:#aaa;">Henüz kayıtlı öğrenci yok.</p>';
            return;
        }

        container.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            const safeName = (data.displayName || d.id).replace(/'/g, "\\'");
            const row = document.createElement('div');
            row.className = 'student-pin-row';
            row.innerHTML = `
                <div class="student-pin-info">
                    <strong>👤 ${data.displayName || d.id}</strong>
                    <small>Kayıt: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString('tr-TR') : '—'}</small>
                </div>
                <button class="btn btn-danger btn-sm" onclick="resetStudentPin('${d.id}', '${safeName}')">🔄 PIN Sıfırla</button>`;
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
        const studentRef = doc(db, 'teachers', state.teacherCode, 'students', studentId);
        await deleteDoc(studentRef);
        alert(`✅ ${displayName} için PIN sıfırlandı.`);
        await loadStudentPinList();
    } catch (err) {
        console.error('PIN sıfırlama hatası:', err);
        alert('PIN sıfırlanamadı: ' + err.message);
    }
};
