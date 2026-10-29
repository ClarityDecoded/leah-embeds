# Events page — Claude-controllable system

The **School for Sacred Storytelling `/events`** page ("Upcoming Gatherings") is
driven by one JSON file. Edit that file, push, and the page updates on its own —
no Framer editing.

## How it works

```
events-data.json   (edit this)                     ← single source of truth
      │  committed + pushed to ClarityDecoded/leah-embeds
      ▼
https://claritydecoded.github.io/leah-embeds/events-data.json   (GitHub Pages)
      │  fetched live by the Framer code component
      ▼
Framer "Event List" component on /events           ← renders it, in site style
```

The component has a **Data Source URL** property set to the URL above. When set,
it loads events from the JSON and ignores the in-Framer Events array (which stays
as a fallback if the file is ever unreachable). Past dates and finished events
drop off automatically.

## One-time setup (already prepared)

1. In Framer, open the **Event List** code component and replace its code with
   `EventList.tsx` (adds the Data Source URL + the tour-rail date/venue/Register row).
2. Select the Event List on `/events` → set **Data Source URL** to
   `https://claritydecoded.github.io/leah-embeds/events-data.json`
3. Publish.

## To update events (the everyday workflow)

Edit `events-data.json` in the `leah-embeds` repo, then:

```bash
git add events-data.json && git commit -m "Update events" && git push
```

The page refreshes within ~1 minute (the component cache-busts each minute).

## Event shape

Two kinds of event:

**A) A single dated event** (e.g. a retreat):
```json
{
  "name": "Change Your Story, Change Your Life",
  "description": "A 1-day New Year retreat …",
  "start": "2027-01-10",
  "timeText": "10am–6pm PST",
  "hideAfter": "2027-01-11",
  "registerNowUrl": "https://…",
  "ctaLabel": "Register",
  "image": { "src": "https://…", "alt": "…" }   // optional
}
```

**B) A multi-date schedule / tour** (renders the date-rail with per-row Register):
```json
{
  "name": "Gatherings for Change",
  "description": "A Sacred Storytelling Tour …",
  "learnMoreUrl": "https://thelittlebookofchange.com/events",
  "occurrences": [
    {
      "date": "2026-10-29",
      "label": "Sisters, OR",
      "sublabel": "Paulina Springs Books, 252 W Hood Ave · 6–8 pm",
      "url": "https://events.humanitix.com/a-gathering-for-change"
    }
  ]
}
```

### Field notes
- `date` / `start` / `hideAfter`: `YYYY-MM-DD` (local calendar date, no timezone drift).
- A tour **row** disappears the day after its `date`; the whole tour disappears
  once every row is past.
- A single event disappears after `hideAfter` (omit it to keep the event forever).
- `label` = city (or e.g. "Full Moon"); `sublabel` = venue · time; `url` = that
  row's Register link. `highlight: true` tints a label-only row with the accent color.
- All links open in the parent window.

## Files
- `events-data.json` — the data you edit (lives at the repo root when deployed).
- `EventList.tsx` — the Framer component (paste once; rarely changes).
- `preview.html` / `preview.rendered.html` — offline visual preview of the data.
