# Fairwire Sign-In Logs fixtures

Fictional sign-ins for corp.example (made-up accounts, documentation addresses).

- `signins.csv`: 44 sign-ins. One address fails on twelve accounts at 3 am; bkim fails ten times then succeeds; aortiz signs in from the US and Romania 50 minutes apart; cdiaz uses IMAP; a service account signs in to the admin portal in a browser; dlee fails eleven times with no success; a disabled account keeps being tried; three people sign in normally.
- `exports/entra-signins.csv`: three sign-ins with Entra ID sign-in log column names (written from knowledge of the export, not checked against a live tenant).
- `settings.json`: US and Canada allowed; svc- accounts are service accounts.
