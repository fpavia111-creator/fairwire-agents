# Fairwire DNS Records fixtures

Fictional records for example.com (reserved for documentation) and an internal corp zone.

- `records.csv`: 14 records. promo2024 points at an S3 website that is not in the list of resources that still exist; intranet in the public zone points at a private address; legacy points at an address outside the owned range; mail is listed twice; status has a CNAME and a TXT record (and a 30-second TTL); a wildcard under preview; api has a two-week TTL. The internal zone is not public, so its private address is fine.
- `settings.json`: the public zone, the owned range 203.0.113.0/24 and the cloud host names that still exist.
