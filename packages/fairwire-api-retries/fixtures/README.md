# Fairwire API Retries fixtures

Fictional request attempts to three endpoints.

- `requests.csv`: 33 attempts for 25 requests. R-002 is retried twice within 0.4 seconds after 500s. R-003 is retried 2 seconds after a 429 that asked for 10. R-004 is retried twice after a 400 and still fails. R-006 uploads 2 MB three times and still gets 503. The rest succeed first time.
- `settings.json`: the default limits written out.
