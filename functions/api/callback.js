function cookieValue(cookie, name) {
  return (cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1) || '';
}
function page(script) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>Přihlášení</title><p>Dokončuji přihlášení…</p><script>${script}<\/script>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const savedState = decodeURIComponent(cookieValue(context.request.headers.get('Cookie'), 'decap_oauth_state'));
  if (!code || !state || !savedState || state !== savedState) return new Response('Neplatný OAuth požadavek.', { status: 400 });
  const clientId = context.env.GITHUB_CLIENT_ID;
  const clientSecret = context.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return new Response('Chybí GitHub OAuth secrets v Cloudflare Pages.', { status: 500 });
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'jaroslav-holecek-decap' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: `${url.origin}/api/callback` })
  });
  const data = await tokenResponse.json();
  if (!tokenResponse.ok || !data.access_token) return new Response('GitHub přihlášení se nezdařilo.', { status: 400 });
  const payload = JSON.stringify({ token: data.access_token, provider: 'github' }).replace(/</g, '\\u003c');
  const origin = JSON.stringify(url.origin);
  return page(`(function(){const expected=${origin};let sent=false;function send(e){if(sent||e.origin!==expected)return;sent=true;window.opener.postMessage('authorization:github:success:${payload}',expected);setTimeout(()=>window.close(),250)}window.addEventListener('message',send,false);if(window.opener)window.opener.postMessage('authorizing:github',expected);})();`);
}
