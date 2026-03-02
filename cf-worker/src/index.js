export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // ==================== SETTINGS ====================
      if (path === '/api/settings/master' && method === 'GET') {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
          .bind('master').first();
        return json(row || { value: 'ogretmen2025' }, corsHeaders);
      }

      // ==================== TEACHERS ====================
      // Ogretmen kayit
      if (path === '/api/teachers' && method === 'POST') {
        const body = await request.json();
        const { code, name, pin, grades, timeLimit } = body;

        if (!code || !name || !pin) return error('Eksik alan', 400, corsHeaders);

        await env.DB.prepare(
          'INSERT INTO teachers (code, name, pin, grades, time_limit, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(code, name, pin, JSON.stringify(grades || []), timeLimit || 0, new Date().toISOString()).run();

        return json({ success: true }, corsHeaders);
      }

      // Ogretmen getir
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}$/) && method === 'GET') {
        const code = path.split('/')[3];
        const row = await env.DB.prepare('SELECT * FROM teachers WHERE code = ?').bind(code).first();
        if (!row) return error('Bulunamadi', 404, corsHeaders);
        row.grades = JSON.parse(row.grades || '[]');
        return json(row, corsHeaders);
      }

      // Kod mevcut mu kontrol
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/exists$/) && method === 'GET') {
        const code = path.split('/')[3];
        const row = await env.DB.prepare('SELECT code FROM teachers WHERE code = ?').bind(code).first();
        return json({ exists: !!row }, corsHeaders);
      }

      // Ogretmen guncelle (pin, grades, timeLimit)
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}$/) && method === 'PUT') {
        const code = path.split('/')[3];
        const body = await request.json();
        const updates = [];
        const values = [];

        if (body.pin !== undefined) { updates.push('pin = ?'); values.push(body.pin); }
        if (body.grades !== undefined) { updates.push('grades = ?'); values.push(JSON.stringify(body.grades)); }
        if (body.timeLimit !== undefined) { updates.push('time_limit = ?'); values.push(body.timeLimit); }

        if (updates.length === 0) return error('Guncellenecek alan yok', 400, corsHeaders);
        values.push(code);

        await env.DB.prepare(`UPDATE teachers SET ${updates.join(', ')} WHERE code = ?`).bind(...values).run();
        return json({ success: true }, corsHeaders);
      }

      // ==================== HISTORY (SAYFALAMALI) ====================
      // Sonuc kaydet
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/history$/) && method === 'POST') {
        const code = path.split('/')[3];
        const body = await request.json();

        await env.DB.prepare(
          `INSERT INTO history (teacher_code, student_name, operation, grade, correct, wrong, empty, time_taken, time_limit, mistakes, device_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          code, body.studentName, body.operation, body.grade || 1,
          body.correct || 0, body.wrong || 0, body.empty || 0,
          body.timeTaken || '', body.timeLimit || 0,
          JSON.stringify(body.mistakes || []), body.deviceId || '', body.date || new Date().toISOString()
        ).run();

        return json({ success: true }, corsHeaders);
      }

      // Gecmis getir (SAYFALAMALI + FILTRELI)
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/history$/) && method === 'GET') {
        const code = path.split('/')[3];
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const grade = url.searchParams.get('grade');
        const since = url.searchParams.get('since');

        let sql = 'SELECT * FROM history WHERE teacher_code = ?';
        const params = [code];

        if (grade) { sql += ' AND grade = ?'; params.push(parseInt(grade)); }
        if (since) { sql += ' AND created_at > ?'; params.push(since); }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const { results } = await env.DB.prepare(sql).bind(...params).all();

        let countSql = 'SELECT COUNT(*) as total FROM history WHERE teacher_code = ?';
        const countParams = [code];
        if (grade) { countSql += ' AND grade = ?'; countParams.push(parseInt(grade)); }
        const countRow = await env.DB.prepare(countSql).bind(...countParams).first();

        results.forEach(r => { r.mistakes = JSON.parse(r.mistakes || '[]'); });

        return json({ results, total: countRow.total, limit, offset }, corsHeaders);
      }

      // ==================== STUDENTS (PIN) ====================
      // Ogrenci PIN getir
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/students\/.+$/) && method === 'GET'
          && !path.endsWith('/students')) {
        const parts = path.split('/');
        const code = parts[3];
        const name = decodeURIComponent(parts[5]);
        const row = await env.DB.prepare(
          'SELECT * FROM students WHERE teacher_code = ? AND student_name = ?'
        ).bind(code, name).first();
        return json(row ? { exists: true, pin: row.pin } : { exists: false }, corsHeaders);
      }

      // Ogrenci PIN olustur
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/students$/) && method === 'POST') {
        const code = path.split('/')[3];
        const body = await request.json();
        await env.DB.prepare(
          'INSERT INTO students (teacher_code, student_name, pin, created_at) VALUES (?, ?, ?, ?)'
        ).bind(code, body.studentName, body.pin, new Date().toISOString()).run();
        return json({ success: true }, corsHeaders);
      }

      // Tum ogrenciler listele
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/students$/) && method === 'GET') {
        const code = path.split('/')[3];
        const { results } = await env.DB.prepare(
          'SELECT student_name, created_at FROM students WHERE teacher_code = ?'
        ).bind(code).all();
        return json({ results }, corsHeaders);
      }

      // Ogrenci PIN sil (sifirla)
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/students\/.+$/) && method === 'DELETE') {
        const parts = path.split('/');
        const code = parts[3];
        const name = decodeURIComponent(parts[5]);
        await env.DB.prepare(
          'DELETE FROM students WHERE teacher_code = ? AND student_name = ?'
        ).bind(code, name).run();
        return json({ success: true }, corsHeaders);
      }

      // ==================== CONSENTS (KVKK) ====================
      if (path.match(/^\/api\/consents\/.+$/) && method === 'GET') {
        const deviceId = decodeURIComponent(path.split('/')[3]);
        const row = await env.DB.prepare('SELECT * FROM consents WHERE device_id = ?').bind(deviceId).first();
        return json(row ? { exists: true } : { exists: false }, corsHeaders);
      }

      if (path === '/api/consents' && method === 'POST') {
        const body = await request.json();
        await env.DB.prepare(
          'INSERT OR REPLACE INTO consents (device_id, version, accepted_at, device_info) VALUES (?, ?, ?, ?)'
        ).bind(body.deviceId, body.version, body.acceptedAt, JSON.stringify(body.deviceInfo || {})).run();
        return json({ success: true }, corsHeaders);
      }

      // ==================== KOD YENILEME ====================
      if (path.match(/^\/api\/teachers\/[A-Z0-9]{6}\/renew$/) && method === 'POST') {
        const oldCode = path.split('/')[3];
        const body = await request.json();
        const newCode = body.newCode;

        const teacher = await env.DB.prepare('SELECT * FROM teachers WHERE code = ?').bind(oldCode).first();
        if (!teacher) return error('Ogretmen bulunamadi', 404, corsHeaders);

        const batch = [
          env.DB.prepare(
            'INSERT INTO teachers (code, name, pin, grades, time_limit, previous_code, renewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(newCode, teacher.name, teacher.pin, teacher.grades, teacher.time_limit, oldCode, new Date().toISOString(), teacher.created_at),
          env.DB.prepare('UPDATE history SET teacher_code = ? WHERE teacher_code = ?').bind(newCode, oldCode),
          env.DB.prepare('UPDATE students SET teacher_code = ? WHERE teacher_code = ?').bind(newCode, oldCode),
          env.DB.prepare('DELETE FROM teachers WHERE code = ?').bind(oldCode),
        ];
        await env.DB.batch(batch);

        return json({ success: true }, corsHeaders);
      }

      return error('Bulunamadi', 404, corsHeaders);

    } catch (err) {
      return error(err.message, 500, corsHeaders);
    }
  },
};

function json(data, headers) {
  return new Response(JSON.stringify(data), { headers });
}

function error(message, status, headers) {
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
