# Aparctias fixtures

Fictional restore tests (made-up systems and people).

- `tests.csv`: 7 tests. SQL-01 last restored in 310 minutes against an RTO of 240. FILE-01 failed in September and was not repeated. MAIL-01 was last tested in March (overdue) and the data was 30 hours old against an RPO of 24. WEB-01 has no sign-off. HR-APP failed once and passed two weeks later.
- `critical.csv`: five critical systems; ERP-01 was never tested.
- `settings.json`: test every 180 days unless a system says otherwise.
