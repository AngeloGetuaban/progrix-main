-- Seed AI models for Ubuntu CPU server (7.7GB RAM)
-- Models installed via Ollama: deepseek-coder:6.7b, phi3.5, qwen2.5:3b, llama3.2:3b, llama3.2:1b
-- Run: mysql -u root progrix < seed_ai_models.sql

-- Clear existing models and re-seed
TRUNCATE TABLE ai_models;

INSERT INTO ai_models (name, display_name, provider, priority, is_active, is_healthy, context_size, notes) VALUES
  ('deepseek-coder:6.7b', 'DeepSeek Coder 6.7B', 'ollama', 1, 1, 1,  16384, 'Best code quality on this server'),
  ('phi3.5',              'Phi 3.5',              'ollama', 2, 1, 1, 131072, 'Fast, strong coding, long context'),
  ('qwen2.5:3b',          'Qwen 2.5 3B',          'ollama', 3, 1, 1,  32768, 'Balanced code + general use'),
  ('llama3.2:3b',         'Llama 3.2 3B',         'ollama', 4, 1, 1, 131072, 'General fallback'),
  ('llama3.2:1b',         'Llama 3.2 1B',         'ollama', 5, 1, 1, 131072, 'Lightest, fastest last-resort fallback');

SELECT id, name, display_name, priority, is_active, is_healthy FROM ai_models ORDER BY priority;
