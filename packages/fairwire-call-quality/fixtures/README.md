# Fairwire Call Quality fixtures

Fictional calls from three sites. Phone numbers use the 555-0100 to 555-0300 fiction range.

- `calls.csv`: 37 calls. HQ is clean except one call with no audio coming back (one-way audio). Five Warehouse calls on carrier-b at 14:00 have loss, jitter and a low MOS, so the site, the trunk and the hour stand out. One Branch-2 call has a MOS of 2.9. One number at Branch-2 has three calls of 3 to 6 seconds.
- `settings.json`: the default limits written out.
