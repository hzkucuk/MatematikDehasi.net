-- Öğretmenler
CREATE TABLE IF NOT EXISTS teachers (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    grades TEXT NOT NULL DEFAULT '[]',
    time_limit INTEGER NOT NULL DEFAULT 0,
    previous_code TEXT,
    renewed_at TEXT,
    created_at TEXT NOT NULL
);

-- Öğrenci PIN kayıtları
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_code TEXT NOT NULL,
    student_name TEXT NOT NULL,
    pin TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(teacher_code, student_name),
    FOREIGN KEY (teacher_code) REFERENCES teachers(code)
);

-- Sınav sonuçları
CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_code TEXT NOT NULL,
    student_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    grade INTEGER NOT NULL,
    correct INTEGER NOT NULL DEFAULT 0,
    wrong INTEGER NOT NULL DEFAULT 0,
    empty INTEGER NOT NULL DEFAULT 0,
    time_taken TEXT,
    time_limit INTEGER DEFAULT 0,
    mistakes TEXT DEFAULT '[]',
    device_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (teacher_code) REFERENCES teachers(code)
);

-- Performans için indeksler
CREATE INDEX IF NOT EXISTS idx_history_teacher ON history(teacher_code);
CREATE INDEX IF NOT EXISTS idx_history_student ON history(teacher_code, student_name);
CREATE INDEX IF NOT EXISTS idx_history_date ON history(teacher_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_grade ON history(teacher_code, grade);

-- KVKK onayları
CREATE TABLE IF NOT EXISTS consents (
    device_id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    accepted_at TEXT NOT NULL,
    device_info TEXT DEFAULT '{}'
);

-- Kurum ayarları
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('registrationPin', 'ogretmen2025');
