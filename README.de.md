# Fairwire-Agenten für IT und Netzwerk

*Von Claude übersetzt; Prüfung durch Muttersprachler steht aus. Die englische [README](README.md) ist maßgeblich.*

Einunddreißig kleine MCP-Agenten für IT-Teams. Jeder ist für **eine Aufgabe** zuständig, etwa Firewall-Regeln prüfen, Sicherungsergebnisse kontrollieren, Anmeldeprotokolle lesen oder die Cloud-Rechnung durchsehen, und kann nicht darüber hinaus handeln. Sie lesen die Dateien, die Ihr IT-Team bereits aus Firewalls, Controllern, Identitätsanbietern, Geräteverwaltung, Sicherungswerkzeugen, Service Desk und Cloud-Konsolen exportiert, schreiben Berichte auf Ihrem Rechner und entwerfen Notizen. Jede Änderung an einem laufenden Gerät, einer Firewall, einer DNS-Zone, einem Verzeichnis oder einem Cloud-Konto bleibt **der Klick einer namentlich genannten Person**.

Teil von [Mythos Machines](https://fair-agents.com) (auf der Website: Fairwire). Die Software ist kostenlos (MIT); Sie zahlen einen Festpreis für die Einrichtung auf Ihren Dateien.

MIT-Lizenz · Node 20 oder neuer · nur lokale Dateien · keine Zugangsdaten · keine Abhängigkeiten · Namen und Adressen für das Modell maskiert

## Ausprobieren

```bash
npx -y boreas-of-firewalls demo     # Prüfung von Firewall-Regeln mit fiktiven Daten
npx -y angelia-of-signins demo      # Prüfung von Anmeldeprotokollen mit fiktiven Daten
```

## Die Agenten

**Netzwerk und Perimeter:** `boreas-of-firewalls` (Firewall-Regeln), `iris-of-traffic` (NetFlow, IPFIX, sFlow), `zephyrus-of-vpn` (VPN-Protokolle), `notus-of-dns` (DNS-Abfragen), `etesian-of-zones` (Pflege der DNS-Zonen), `aura-of-wifi` (WLAN-Controller), `eurus-of-switchports` (Switch-Ports und VLANs), `kaikias-of-leases` (DHCP), `echo-of-voip` (Anrufqualität).

**Identität, E-Mail und Administratoren:** `angelia-of-signins` (Anmeldeprotokolle), `bora-of-mfa` (MFA-Abdeckung), `arke-of-admins` (privilegierte Rollen), `tramontane-of-directory` (Verzeichnispflege), `pheme-of-gateways` (E-Mail-Gateway).

**Geräte und Software:** `argestes-of-assets` (CMDB-Abgleich), `skiron-of-patches` (Patch-Stand), `apeliotes-of-endpoints` (Endpunktschutz), `eurybates-of-mobiles` (mobile Geräte), `levante-of-software` (Installationen gegen Lizenzen), `ostro-of-printers` (Druckerflotte).

**Betrieb und Ausfallsicherheit:** `meltemi-of-backups` (Sicherungsjobs), `aparctias-of-restores` (Wiederherstellungstests), `stentor-of-incidents` (Verfügbarkeit und Störungen), `ceryx-of-changes` (Änderungskalender), `talthybius-of-tickets` (Ticket-SLAs), `ossa-of-logs` (Protokollaufbewahrung).

**IT-Ausgaben und KI-Nutzung:** `sirocco-of-cloud` (Cloud-Rechnungen), `chinook-of-renewals` (IT-Verträge und Kündigungsfristen), `libeccio-of-telecom` (Telekommunikationsrechnungen), `hermes-of-efficiency` (KI-Nutzung), `icarus-of-retries` (Kosten von Wiederholungen).

## So arbeiten sie

- Sie lesen nur exportierte Dateien und melden sich nie an Live-Systemen an.
- Sie schreiben Entwürfe; die Freigabe ist ein Klick einer namentlich genannten Person, auch im Auto-Modus. Live-Aktionen werden verweigert.
- Namen, Anmeldenamen, E-Mail-Adressen, Telefonnummern und Client-Adressen werden für das Modell durch Pseudonyme ersetzt.
- Exporte in neun Sprachen werden gleich gelesen (Kodierungen, `1.234,56`, Datumsformate, lokale Spaltennamen). Berichtsseiten folgen `--lang de`.

Ergebnisse und Entscheidungen: [REVIEW-ver1.md](REVIEW-ver1.md). Keine Rechts-, Compliance- oder Zertifizierungsberatung.
