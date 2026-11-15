# Engine sounds still missing (all 8 cars)

What each car needs, in public/audio/engines/<carId>/ (ogg or mp3, mono is fine, 44.1/48 kHz, 1-3 s seamless loops):
`idle.ogg` (~900 rpm), `low.ogg` (~2500), `mid.ogg` (~4500), `high.ogg` (~6500, or near redline), optional `off-mid.ogg`
(coasting, throttle closed). Then list them in src/data/engineSounds.ts, e.g.
`layers: [{ file: 'idle.ogg', rpm: 900, load: 'both' }, { file: 'low.ogg', rpm: 2500, load: 'on' }, ...]`.
The game picks them up automatically; a missing or broken file falls back to the synth. Credit every file in docs/audio-credits.md.

Why none are in yet: the openly licensed recordings found are long mixed clips (start-up, revs, driving, wind, voices)
that must be cut into steady-rpm loops BY EAR, and most carry Wikimedia's "licence review needed" tag (CC BY 3.0 from
YouTube, not yet confirmed by an admin). Claude cannot listen, so it did not guess cuts or ship unconfirmed licences.

| Car | Best candidate found (verify the licence on the page before use) | Licence status | Cut from it |
|---|---|---|---|
| civic | Commons: "Honda S2000 - engine and exhaust sound (YouTube aTd8viYxxnU).opus" (F20C, closest NA VTEC) + "The sound of VTEC engaging.ogg" (5 s) | CC BY 3.0, review needed; VTEC clip public domain | idle, low, mid, high (VTEC crossover between mid and high) |
| golf | Commons: "Volkswagen Golf GTI - engine and exhaust sound (YouTube NrA1GgbjFRg).opus" (generation unknown) | CC BY 3.0, review needed | idle, low, mid, high; search "1.8T 20V" |
| 350z | Commons: "Nissan 350Z - engine and exhaust sound (YouTube zNpHriHrNl0).opus" (600 s) + "NISSAN VQ35HR engine.ogg" | CC BY 3.0 review needed; VQ35HR clip public domain | idle, low, mid, high |
| rx7 | Commons: "Mazda RX-7 - engine and exhaust sound (YouTube 4z0y1H2REvE).opus" | CC BY 3.0, review needed | idle (rotary brap), low, mid, high |
| e61 | none for a diesel six; nearest "Volkswagen Passat B5 1.9 TDI ... (YouTube 12P7SQ 48k4).opus" | CC BY 3.0, review needed | idle, low, mid (diesels rev to ~5000); search "BMW 535d", "M57", "330d" |
| m3 | Commons: "BMW M Coupé - engine and exhaust sound (YouTube XwL8KdiaN1I).opus" (S50/S52, nearest to S54) | CC BY 3.0 | idle, low, mid, high (8000 rpm) |
| evo | Commons: "Mitsubishi Lancer Evolution VI - engine and exhaust sound (YouTube p2UANOqploM).opus" (4G63) | CC BY 3.0, review needed | idle, low, mid, high |
| supra | Commons: "Toyota Supra (A80) - engine and exhaust sound (YouTube YlRjnMnHRO4).opus" (34 s) | CC BY 3.0 | idle, low, mid, high |

Ready-made but generic (not tied to any car): OpenGameArt "racing car engine sound loops" by domasx2 (CC0),
https://opengameart.org/content/racing-car-engine-sound-loops. Freesound and Internet Archive were not searched
(Freesound needs a login for downloads): good search terms there are "<car> idle loop", "<engine code> rev", "onboard steady rpm".
Turbo whistle, blow-off and pops stay procedural (audio/turboSound, locked).
