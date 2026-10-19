// Gera chaves JWT locais (anon e service_role) assinadas com o segredo local.
// NUNCA use estes valores em produção.
import crypto from 'node:crypto';

const secret = process.env.LOCAL_JWT_SECRET ?? 'local-dev-jwt-secret-with-at-least-32-characters';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function sign(role) {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ iss: 'supabase-local', role, iat: 1700000000, exp: 2000000000 });
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}
if (process.argv[2] === 'anon') console.log(sign('anon'));
else if (process.argv[2] === 'service') console.log(sign('service_role'));
else console.log(JSON.stringify({ anon: sign('anon'), service: sign('service_role') }));
