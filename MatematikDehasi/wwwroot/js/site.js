import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ================================================================
// Firebase Yapılandırması
// ================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDrHg2Pvklv9frtiKeztADKkOOkDpl8v-k",
    authDomain: "matematikdehasi-e0da6.firebaseapp.com",
    projectId: "matematikdehasi-e0da6",
    storageBucket: "matematikdehasi-e0da6.firebasestorage.app",
    messagingSenderId: "80229605673",
    appId: "1:80229605673:web:27624b153e4d40e40c1738",
    measurementId: "G-8JZ6GH38VZ"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

// Anonim oturum (Firestore erişimi için)
signInAnonymously(auth).catch(err => console.error("Auth hatası:", err));

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
// Uygulama Durumu
// ================================================================
let state = {
    teacherCode: "",
    teacherName: "",
    studentName: "",
    operation: "addition",
    isIntegerMode: false,
    quiz: { questions: [], answers: {}, page: 0, seconds: 0, timer: null }
};

const TOTAL_QS = 40;
const PAGE_SIZE = 10;

const OP_MAP = {
    addition: { symbol: '+', label: 'Toplama', badge: 'badge-plus' },
    subtraction: { symbol: '-', label: 'Çıkarma', badge: 'badge-minus' },
    multiplication: { symbol: '×', label: 'Çarpma', badge: 'badge-times' },
    division: { symbol: '÷', label: 'Bölme', badge: 'badge-divide' },
    mixed_equations: { symbol: '?', label: 'Denklem Çözme', badge: 'badge-mixed' }
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
    const pin = document.getElementById('reg-pin').value;
    const pin2 = document.getElementById('reg-pin2').value;

    if (!masterPin) return alert("Kurum kayıt şifresini girin.");
    if (!name) return alert("Lütfen adınızı girin.");
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
            pin: pin,
            createdAt: new Date().toISOString()
        });

        document.getElementById('display-code').textContent = formatCode(code);
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

        document.getElementById('teacher-panel-title').textContent = `${data.name} - Öğretmen Paneli 👨‍🏫`;
        document.getElementById('panel-code-badge').textContent = `KOD: ${formatCode(code)}`;

        switchView('view-teacher-panel');
        await loadTeacherHistory();
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
// ÖĞRENCİ GİRİŞ
// ================================================================
window.studentLogin = async () => {
    const rawCode = document.getElementById('student-code-input').value;
    const code = cleanCode(rawCode);
    const name = document.getElementById('student-name-input').value.trim();

    if (code.length !== 6) return alert("Geçersiz öğretmen kodu. 6 karakterli kodu girin.");
    if (!name) return alert("Lütfen ismini gir.");

    // Öğretmen kodunu doğrula
    try {
        const docRef = doc(db, 'teachers', code);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return alert("Bu öğretmen kodu bulunamadı. Kodunu kontrol et.");
    } catch (err) {
        console.error("Kod doğrulama hatası:", err);
        return alert("Bağlantı hatası. Lütfen tekrar dene.");
    }

    // İsim hafızasını güncelle
    let studentList = JSON.parse(localStorage.getItem('studentHafizasi') || '[]');
    if (!studentList.includes(name)) {
        studentList.push(name);
        if (studentList.length > 10) studentList.shift();
        localStorage.setItem('studentHafizasi', JSON.stringify(studentList));
    }

    state.teacherCode = code;
    state.studentName = name;
    state.operation = document.getElementById('operation-select').value;
    state.isIntegerMode = document.getElementById('integer-mode-check').checked;

    let title = OP_MAP[state.operation].label;
    if (state.isIntegerMode) title += " (Tam Sayılar)";
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
    const mode = state.isIntegerMode;
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    while (state.quiz.questions.length < TOTAL_QS) {
        let n1, n2, result;
        let currentOp = state.operation;

        if (state.operation === 'mixed_equations') {
            const ops = ['addition', 'subtraction', 'multiplication', 'division'];
            currentOp = ops[rand(0, 3)];
        }

        switch (currentOp) {
            case 'addition':
                n1 = mode ? rand(-50, 50) : rand(10, 99);
                n2 = mode ? rand(-50, 50) : rand(10, 99);
                result = n1 + n2;
                break;
            case 'subtraction':
                n1 = mode ? rand(-50, 50) : rand(10, 99);
                n2 = mode ? rand(-50, 50) : rand(10, n1);
                result = n1 - n2;
                break;
            case 'multiplication':
                n1 = mode ? rand(-12, 12) : rand(2, 20);
                n2 = mode ? rand(-12, 12) : rand(2, 20);
                result = n1 * n2;
                break;
            case 'division':
                n2 = mode ? (Math.random() > 0.5 ? rand(2, 12) : rand(-12, -2)) : rand(2, 15);
                let q = mode ? rand(-12, 12) : rand(2, 20);
                n1 = n2 * q;
                result = q;
                break;
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

            const opts = new Set([correctVal]);
            while (opts.size < 4) {
                let fake = correctVal + rand(-10, 10);
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
    const max = TOTAL_QS / PAGE_SIZE;
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
    if (prog) prog.style.width = (count / TOTAL_QS * 100) + "%";
}

// ================================================================
// Test Bitirme — Sonuç Firebase'e Kaydedilir
// ================================================================
window.confirmFinish = async () => {
    if (Object.keys(state.quiz.answers).length < TOTAL_QS && !confirm("Boş sorularınız var. Bitirilsin mi?")) return;
    clearInterval(state.quiz.timer);

    let c = 0, w = 0, mistakes = [];
    state.quiz.questions.forEach((q, i) => {
        const a = state.quiz.answers[i];
        if (a === q.correct) c++;
        else if (a !== undefined) {
            w++;
            const n1D = q.unknownType === "n1" ? "?" : q.n1;
            const n2D = q.unknownType === "n2" ? "?" : (q.n2 < 0 ? `(${q.n2})` : q.n2);
            mistakes.push({
                q: `${n1D} ${OP_MAP[q.op].symbol} ${n2D} = ${q.result}`,
                r: q.correct,
                y: a
            });
        }
    });

    const result = {
        studentName: state.studentName,
        operation: state.operation,
        isIntegerMode: state.isIntegerMode,
        date: new Date().toISOString(),
        correct: c,
        wrong: w,
        empty: TOTAL_QS - (c + w),
        timeTaken: document.getElementById('student-timer').innerText,
        mistakes
    };

    try {
        const historyRef = collection(db, 'teachers', state.teacherCode, 'history');
        await addDoc(historyRef, result);
        alert("Test tamamlandı ve kaydedildi! ✅");
        location.reload();
    } catch (err) {
        console.error("Sonuç kaydedilemedi:", err);
        alert("Sonuç kaydedilemedi: " + err.message);
    }
};

// ================================================================
// Öğretmen Paneli — Geçmiş Yükleme
// ================================================================
async function loadTeacherHistory() {
    const list = document.getElementById('teacher-history');
    list.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const historyRef = collection(db, 'teachers', state.teacherCode, 'history');
        const snap = await getDocs(historyRef);
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        docs.sort((a, b) => new Date(b.date) - new Date(a.date));

        list.innerHTML = "";

        if (docs.length === 0) {
            list.innerHTML = "<p>Henüz öğrenci sonucu bulunmuyor. Öğrencilerinize kodunuzu verin!</p>";
            return;
        }

        docs.forEach(d => {
            const op = OP_MAP[d.operation];
            const item = document.createElement('div');
            item.className = 'history-item';
            const intBadge = d.isIntegerMode ? '<span class="badge badge-integer">Tam Sayı</span>' : '';
            item.innerHTML = `
                <div>
                    <strong>👤 ${d.studentName}</strong> <span class="badge ${op.badge}">${op.label}</span> ${intBadge}<br>
                    <small>${new Date(d.date).toLocaleString('tr-TR')}</small>
                </div>
                <div style="text-align:right">
                    <span style="color:green; font-weight:bold;">✅ ${d.correct}</span> |
                    <span style="color:red; font-weight:bold;">❌ ${d.wrong}</span> |
                    <span style="color:gray;">⬜ ${d.empty}</span>
                </div>`;
            item.onclick = () => {
                document.getElementById('modal-body').innerHTML = `
                    <p><strong>Öğrenci:</strong> ${d.studentName}</p>
                    <p><strong>Süre:</strong> ${d.timeTaken}</p>
                    <p><strong>Sonuç:</strong> ${d.correct} Doğru, ${d.wrong} Yanlış, ${d.empty} Boş</p>
                    <hr>
                    <h4>Hatalı Sorular:</h4>
                    ${d.mistakes && d.mistakes.length > 0 ? d.mistakes.map(m => `
                        <div style="padding:10px; border-bottom:1px solid #eee;">
                            <b>${m.q}</b> → Doğru: ${m.r}, Seçilen: <span style="color:red">${m.y}</span>
                        </div>
                    `).join('') : "<p>Hata yok! 🎉</p>"}`;
                document.getElementById('modal-detail').style.display = 'flex';
            };
            list.appendChild(item);
        });
    } catch (err) {
        list.innerHTML = "<p>Geçmiş yüklenirken hata oluştu.</p>";
        console.error(err);
    }
}
