# Notus fixtures

Fictional DNS queries from inside clients (10.0.1.x) to an inside resolver (10.0.0.53), with a count column.

- `queries.csv`: 23 rows. One client asks for www.example.com 1,200 times; another asks for twelve 40-character random names under tunnel.example.net; one gets NXDOMAIN for an old printer and WPAD; one goes straight to 8.8.8.8; one keeps asking for a blocked name; api.vendor.example fails with SERVFAIL for 12 of 20 queries. One CDN name is long but not random enough to count.
- `settings.json`: names the inside resolver.
