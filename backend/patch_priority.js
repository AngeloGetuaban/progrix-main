const pool = require('./database/db');
(async()=>{
  await pool.execute("UPDATE ai_models SET priority=10 WHERE name='llama3.2:3b'");
  await pool.execute("UPDATE ai_models SET priority=1 WHERE name='qwen2.5-coder:7b'");
  console.log('✅ Re-prioritized qwen2.5-coder:7b');
  process.exit();
})();
