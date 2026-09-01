HROMADNÁ MIGRACE Z WEBNODE
==========================

Tento doplněk je určen pro existující repozitář jaroslav-holecek-web.
Nepřepisuje konfiguraci Decap CMS ani OAuth.

Obsahuje:
- scripts/migrate-webnode.mjs
- .github/workflows/migrate-webnode.yml

Po nahrání do kořene repozitáře se v GitHubu objeví:
Actions > Hromadná migrace z Webnode > Run workflow

Workflow automaticky:
1. projde sekce Buddhismus, Hinduismus, Taoismus, Astrologie a Rámakrišnovo evangelium,
2. načte jednotlivé stránky publikací,
3. převezme dostupná metadata a přesné href odkazy na Webshare,
4. stáhne obálky do src/media,
5. zkusí převést i galerii Digitalizace,
6. vše commitne do větve main.

Existující lokální obálka (/media/...) má přednost, takže již ručně opravená
Praktická astrologie se nepřepíše zpět odkazem na Webnode.

Po migraci je nutná vizuální kontrola a kontrola Webshare odkazů.
