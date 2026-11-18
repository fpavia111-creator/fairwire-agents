# Fairwire-Agenten für IT und Netzwerk

*Von Claude übersetzt; Prüfung durch Muttersprachler steht aus. Die englische [README](README.md) ist maßgeblich.*

Einunddreißig kleine MCP-Agenten für IT-Teams. Jeder ist für **eine Aufgabe** zuständig, etwa Firewall-Regeln prüfen, Sicherungsergebnisse kontrollieren, Anmeldeprotokolle lesen oder die Cloud-Rechnung durchsehen, und kann nicht darüber hinaus handeln. Sie lesen die Dateien, die Ihr IT-Team bereits aus Firewalls, Controllern, Identitätsanbietern, Geräteverwaltung, Sicherungswerkzeugen, Service Desk und Cloud-Konsolen exportiert, schreiben Berichte auf Ihrem Rechner und entwerfen Notizen. Jede Änderung an einem laufenden Gerät, einer Firewall, einer DNS-Zone, einem Verzeichnis oder einem Cloud-Konto bleibt **der Klick einer namentlich genannten Person**.

Teil von [Mythos Machines](https://fair-agents.com) (auf der Website: Fairwire). Die Software ist kostenlos (MIT); Sie zahlen einen Festpreis für die Einrichtung auf Ihren Dateien.

MIT-Lizenz · Node 20 oder neuer · nur lokale Dateien · keine Zugangsdaten · keine Abhängigkeiten · Namen und Adressen für das Modell maskiert

## Ausprobieren

```bash
npx -y fairwire-firewall-rules demo     # Prüfung von Firewall-Regeln mit fiktiven Daten
npx -y fairwire-sign-in-logs demo      # Prüfung von Anmeldeprotokollen mit fiktiven Daten
```

## Die Agenten

**Netzwerk und Perimeter:** `fairwire-firewall-rules` (Firewall-Regeln), `fairwire-network-traffic` (NetFlow, IPFIX, sFlow), `fairwire-vpn-access` (VPN-Protokolle), `fairwire-dns-queries` (DNS-Abfragen), `fairwire-dns-records` (Pflege der DNS-Zonen), `fairwire-wifi-health` (WLAN-Controller), `fairwire-switch-ports` (Switch-Ports und VLANs), `fairwire-dhcp-leases` (DHCP), `fairwire-call-quality` (Anrufqualität).

**Identität, E-Mail und Administratoren:** `fairwire-sign-in-logs` (Anmeldeprotokolle), `fairwire-mfa-coverage` (MFA-Abdeckung), `fairwire-admin-roles` (privilegierte Rollen), `fairwire-directory-hygiene` (Verzeichnispflege), `fairwire-email-gateway` (E-Mail-Gateway).

**Geräte und Software:** `fairwire-asset-inventory` (CMDB-Abgleich), `fairwire-patch-status` (Patch-Stand), `fairwire-endpoint-protection` (Endpunktschutz), `fairwire-mobile-devices` (mobile Geräte), `fairwire-software-licenses` (Installationen gegen Lizenzen), `fairwire-print-fleet` (Druckerflotte).

**Betrieb und Ausfallsicherheit:** `fairwire-backup-jobs` (Sicherungsjobs), `fairwire-restore-tests` (Wiederherstellungstests), `fairwire-uptime-incidents` (Verfügbarkeit und Störungen), `fairwire-change-calendar` (Änderungskalender), `fairwire-ticket-sla` (Ticket-SLAs), `fairwire-log-retention` (Protokollaufbewahrung).

**IT-Ausgaben und KI-Nutzung:** `fairwire-cloud-costs` (Cloud-Rechnungen), `fairwire-contract-renewals` (IT-Verträge und Kündigungsfristen), `fairwire-telecom-bills` (Telekommunikationsrechnungen), `fairwire-ai-usage` (KI-Nutzung), `fairwire-api-retries` (Kosten von Wiederholungen).

## So arbeiten sie

- Sie lesen nur exportierte Dateien und melden sich nie an Live-Systemen an.
- Sie schreiben Entwürfe; die Freigabe ist ein Klick einer namentlich genannten Person, auch im Auto-Modus. Live-Aktionen werden verweigert.
- Namen, Anmeldenamen, E-Mail-Adressen, Telefonnummern und Client-Adressen werden für das Modell durch Pseudonyme ersetzt.
- Exporte in neun Sprachen werden gleich gelesen (Kodierungen, `1.234,56`, Datumsformate, lokale Spaltennamen). Berichtsseiten folgen `--lang de`.

Ergebnisse und Entscheidungen: [REVIEW-ver1.md](REVIEW-ver1.md). Keine Rechts-, Compliance- oder Zertifizierungsberatung.
