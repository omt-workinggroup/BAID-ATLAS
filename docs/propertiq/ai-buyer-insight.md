# AI buyer insight: proposal

Status: **proposal, 19 October 2026.** Nothing here is built yet. It needs your approval and an AI provider
account before work starts.

## What the reference video describes

The clip (a real estate podcast on TikTok) talks about an AI tool that:

- takes a property's address and details;
- analyses them to describe the **most likely buyer** for that property (the "buyer avatar");
- lets the agent aim the marketing at that person instead of posting to everyone.

The agent then uses this in a **listing presentation**: "I can tell you who your buyer is and market straight to
them". That wins the listing against an agent who only plans to post it and put it on the MLS.

The clip also claims the tool is "accurate almost 100% of the time". That claim is not supported, and Propertiq
will not repeat it.

## How it fits Propertiq

A **Buyer insight** panel on each listing in the advertiser portal (`/portal/:org/listings/:id`).

1. The advertiser presses **Get buyer insight**.
2. A Supabase Edge Function sends the listing's own facts to an AI model. Those facts are:
   - type and subtype
   - purpose and price
   - area and city
   - bedrooms, bathrooms and size
   - furnishing and amenities
   - completion stage
3. The panel shows, clearly labelled **"AI suggestion — check it against what you know"**:
   - **Likely buyers or renters:** two or three profiles, for example "young professional couple working
     around Airport City" or "diaspora buyer looking for a family home to rent out". Each comes with the facts it
     is based on.
   - **What to stress in the advert:** for example "borehole and boys' quarters matter to this buyer".
   - **Where to reach them:** for example WhatsApp groups, diaspora audiences or LinkedIn.
   - **A suggested headline and opening paragraph** the advertiser can edit and use.
4. The advertiser can save the result to the listing (private to their organisation) and regenerate it after
   editing the listing.

**Later, for people looking for property:** the same idea in reverse, like "AI Recommendations" in the LIVO
reference. A buyer describes what they need and gets matching listings. This comes after the advertiser tool
works well.

## Rules it must follow (from the decisions already approved)

- **Honest labelling:**
  - It is a suggestion, not a fact.
  - It never shows a score or an accuracy figure.
  - It never appears to the public as a trust or verification line.
- **Listing facts only:**
  - It uses no personal data about real people.
  - It never uses the exact address. It works from the area, the same as the public map.
- **No discriminatory profiling:** profiles never use tribe or ethnicity, religion, gender, marital status,
  disability or nationality as the reason someone should or should not buy. This needs a fixed instruction and a
  check on the output.
- **Payment never buys verification:** if this becomes a paid feature later, it is a marketing tool only and
  changes no trust line.
- **Security:**
  - The AI key lives only in Supabase Edge Function secrets, never in the browser or the repo.
  - Requests are rate-limited per organisation (for example 20 a day) to control cost and abuse.
- **Data protection:** listing facts sent to the AI provider are covered in the privacy notice (Ghana Data
  Protection Act, 2012).

## What is needed to build it

1. **Your approval** of this scope.
2. **An AI provider account and API key.**
   - Anthropic's Claude API is the default choice.
   - You add the key yourself in Supabase under Edge Functions → Secrets. Never paste it into chat.
3. **A small schema change** (documented before it is applied): a private `listing_insights` table, keyed by
   listing, readable and writable by members of the owning organisation only.
4. **Build:**
   - an edge function `buyer-insight`
   - the portal panel
   - rate limiting
   - tests: pgTAP for access rules, unit tests for the prompt and output checks, and e2e for the panel
