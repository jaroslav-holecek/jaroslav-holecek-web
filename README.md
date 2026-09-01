# Jaroslav Holeček – Cloudflare Pages + Decap CMS

Toto je ostrý základ webu: statický web se generuje z JSON záznamů publikací a `/admin/` používá Decap CMS. Decap zapisuje změny do GitHubu; Cloudflare Pages při každém commitu web znovu sestaví a zveřejní.

## Co už funguje
- úvodní stránka a kategorie,
- detail publikace,
- data publikací v `src/content/books/*.json`,
- administrace Decap CMS na `/admin/`,
- nahrávání obálek do `src/media`,
- Cloudflare Pages OAuth funkce `/api/auth` a `/api/callback`,
- žádná databáze a žádný placený CMS.

## Co je třeba jednorázově doplnit před ostrým nasazením
1. GitHub účet a repozitář, např. `uzivatel/jaroslav-holecek-web`.
2. V `src/admin/config.yml` nahradit:
   - `YOUR_GITHUB_USERNAME`
   - `YOUR-SITE.pages.dev` (na obou místech)
3. V GitHubu vytvořit OAuth App:
   - Homepage URL: `https://YOUR-SITE.pages.dev`
   - Authorization callback URL: `https://YOUR-SITE.pages.dev/api/callback`
4. V Cloudflare Pages → Settings → Variables and Secrets přidat:
   - `GITHUB_CLIENT_ID` jako běžnou proměnnou,
   - `GITHUB_CLIENT_SECRET` jako Secret.
   - Volitelně `GITHUB_SCOPE=repo,user`, jen pokud bude repozitář soukromý. Pro veřejný repozitář stačí výchozí `public_repo,user`.

## Nastavení Cloudflare Pages
- Připojit GitHub repozitář.
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (výchozí)

Cloudflare musí mít adresář `functions` v kořeni projektu; nepřesouvejte jej do `dist`.

## Jak budete potom pracovat
1. Otevřete `https://YOUR-SITE.pages.dev/admin/`.
2. Přihlásíte se GitHubem.
3. Kliknete na Publikace → Nová publikace (nebo otevřete existující).
4. Vyplníte formulář, nahrajete obálku, vložíte Webshare odkazy a dáte Publikovat.
5. Decap uloží změnu do GitHubu. Cloudflare Pages automaticky sestaví novou verzi webu.

Git ani HTML při běžné správě používat nemusíte.

## Lokální kontrola
Stačí Node.js:

```bash
npm run build
```

Potom je hotový web v `dist/`. Administrace se lokálně bez OAuth produkčního nastavení nepřihlásí; to je očekávané.

## Migrace z Webnode
Ukázkové záznamy jsou pouze tři. Další fáze je převést celý katalog, stáhnout původní obálky do `src/media` a doplnit přesné Webshare odkazy.
