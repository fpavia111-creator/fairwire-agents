# Fairwire Asset Inventory fixtures

Fictional CMDB records and discovery data (made-up names, serials and hosts).

- `cmdb.csv`: 10 records. AST-1003 is retired but still seen on the network; AST-1004 has no location and its warranty ends in December; AST-1005 is out of warranty; AST-1006 and AST-1007 share a serial; AST-1008 has no owner; AST-1009 is named LAPTOP-109 but discovery calls it LAPTOP-9X; AST-1010 was last seen in July.
- `seen.csv`: 11 devices seen by Intune and a network scan, including a laptop and a lobby camera with no CMDB record.
- `settings.json`: 90 days unseen is a ghost; warranty notice 60 days.
