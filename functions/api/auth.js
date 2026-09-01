export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const clientId = context.env.GITHUB_CLIENT_ID;
  if (!clientId) return new Response('Chybí GITHUB_CLIENT_ID v Cloudflare Pages.', { status: 500 });
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/callback`;
  const scope = context.env.GITHUB_SCOPE || 'public_repo,user';
  const target = new URL('https://github.com/login/oauth/authorize');
  target.searchParams.set('client_id', clientId);
  target.searchParams.set('redirect_uri', redirectUri);
  target.searchParams.set('scope', scope);
  target.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      'Location': target.toString(),
      'Set-Cookie': `decap_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
}
