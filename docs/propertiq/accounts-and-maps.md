# Accounts and maps

## Accounts (sign up, sign in)

Sign-up has four steps: role (agent, company, developer, home owner), phone number, the 6-digit SMS code,
then name, email and password. Sign-in is phone number and password. The role and name are stored on the
Supabase user (`user_metadata.role`, `user_metadata.name`).

Accounts live in the Supabase project **baid-atlas** (`ecikayrsbjzgdjkehnhl`); the site uses its public
URL and publishable key (`site/js/config.js`). Codes are sent through SasuSync by the Edge Function
`supabase/functions/send-sms`, which Supabase calls as its "Send SMS" hook.

### Turning it on (once, in the Supabase dashboard)

1. **Restore the project**: it is paused. Open it in the Supabase dashboard and choose *Restore*.
2. **Deploy the SMS function**: `supabase functions deploy send-sms --project-ref ecikayrsbjzgdjkehnhl`
   (or Dashboard → Edge Functions). Under *Edge Functions → Secrets*, set `SASUSYNC_API_KEY`,
   `SASUSYNC_SENDER` (your approved sender ID) and, after step 3, `SEND_SMS_HOOK_SECRET`.
   Paste these into the dashboard yourself; never commit them or send them in a chat.
3. **Connect it**: *Authentication → Hooks → Send SMS hook* → HTTPS → the function's URL
   (`https://ecikayrsbjzgdjkehnhl.supabase.co/functions/v1/send-sms`). Copy the secret it shows into
   `SEND_SMS_HOOK_SECRET`.
4. **Phone sign-up**: *Authentication → Sign In / Providers → Phone*: enable it and allow sign-ups.
   Turn on *Confirm phone*. Under *Email*, sign-ups can stay enabled (an email is added in step 4 of
   sign-up and Supabase sends a confirmation link).
5. **Site URL**: *Authentication → URL Configuration*: `https://propertiq-gh.vercel.app`.

Until these are done, the sign-up page shows "We couldn't send a text message right now".

## Maps

- **Street map**: OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`), free and open, no key,
  recoloured in black and white in `site/js/map.js`.
- **Satellite / Hybrid**: Esri World Imagery as a raster layer; Hybrid adds OpenFreeMap's road and area
  names on top. The provider is set by `IMAGERY` in `site/js/config.js`. If the imagery fails to load,
  the map switches to the street map and says so.
- **Licence**: Esri's public World Imagery service is governed by Esri's terms; for a commercial site,
  create a free ArcGIS Location Platform account and use a keyed URL (an API key in the tile URL is
  public by design and can be limited to this site in the ArcGIS dashboard), or set `IMAGERY` to another
  licensed provider. Keep the attribution.

### Imagery checked in Accra (Esri World Imagery, October 2026)

| Area | Zoom 17 | Zoom 18 | Zoom 19 |
| --- | --- | --- | --- |
| East Legon | Sharp | Sharp: roofs, solar panels, cars | Usable, slightly soft |
| Cantonments | Sharp | Sharp: houses, pools | Usable, soft |
| Airport Residential | Sharp | Sharp: towers, car parks | Soft |
| Spintex | Sharp | Sharp | Usable, soft |
| Labone | Sharp | Sharp: buildings, trees | Usable |
| Osu | Sharp | Sharp: dense roofs | Usable |

Best viewing is up to about zoom 18 (individual houses, cars and pools). Zoom 19 is enlarged and softer.
This is ordinary satellite/aerial imagery, not "4K/8K".
