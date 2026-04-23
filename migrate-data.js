/**
 * 로컬 todo-data.json → Supabase DB 마이그레이션 스크립트
 *
 * 사용법:
 *   1. .env 파일에 SUPABASE_URL, SUPABASE_SERVICE_KEY, MIGRATE_USER_EMAIL 설정
 *   2. npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DATA_FILE = path.join(__dirname, 'todo-data.json');

async function migrate() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 마이그레이션 대상 사용자 찾기
  const email = process.env.MIGRATE_USER_EMAIL;
  if (!email) {
    console.error('MIGRATE_USER_EMAIL 환경변수를 설정해주세요.');
    process.exit(1);
  }

  // 사용자 조회
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('사용자 조회 실패:', userError.message);
    process.exit(1);
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`이메일 ${email}에 해당하는 사용자를 찾을 수 없습니다.`);
    console.log('등록된 사용자:', users.map(u => u.email).join(', '));
    process.exit(1);
  }

  console.log(`사용자 찾음: ${user.email} (${user.id})`);

  // 로컬 데이터 읽기
  if (!fs.existsSync(DATA_FILE)) {
    console.error('todo-data.json 파일이 없습니다.');
    process.exit(1);
  }

  const localData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`로컬 데이터: ${localData.categories.length}개 카테고리, ${localData.todos.length}개 할일`);

  // DB에 저장
  const { error } = await supabase
    .from('user_data')
    .upsert({
      user_id: user.id,
      data: localData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('마이그레이션 실패:', error.message);
    process.exit(1);
  }

  console.log('마이그레이션 완료!');
}

migrate();
