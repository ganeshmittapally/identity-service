-- Seed initial scopes
INSERT INTO scopes (scope_name, description) VALUES
  ('profile', 'Access user profile information'),
  ('email', 'Access user email address'),
  ('openid', 'OpenID Connect scope for identity information'),
  ('offline_access', 'Access to refresh tokens'),
  ('clients:read', 'Read OAuth clients'),
  ('clients:write', 'Write OAuth clients'),
  ('scopes:read', 'Read available scopes'),
  ('scopes:write', 'Write scopes'),
  ('admin', 'Full administrative access')
ON CONFLICT (scope_name) DO NOTHING;

-- Create admin user (password: ChangeMe123!@#)
-- Hash: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHexLi (bcryptjs with 10 rounds)
INSERT INTO users (email, password_hash, first_name, last_name, is_active) VALUES
  ('admin@identity-service.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHexLi', 'Admin', 'User', true)
ON CONFLICT (email) DO NOTHING;
