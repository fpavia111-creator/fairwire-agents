# Agenti Fairwire per IT e reti

*Tradotto da Claude; revisione da parte di un madrelingua in attesa. Il [README](README.md) in inglese è la versione di riferimento.*

Trentuno piccoli agenti MCP per i team IT. Ognuno ha **un solo compito**, per esempio rivedere le regole del firewall, controllare i backup, leggere i log di accesso o esaminare la fattura cloud, e non può agire oltre. Leggono i file che il vostro team esporta già da firewall, controller, provider di identità, gestione dei dispositivi, strumenti di backup, service desk e console cloud, scrivono report sul vostro computer e redigono note. Ogni modifica a un dispositivo, firewall, zona DNS, directory o account cloud resta **il clic di una persona con nome e cognome**.

Parte di [Fair Agents](https://fair-agents.com) (Fairwire sul sito). Il software è gratuito (MIT); si paga un prezzo fisso per l’avvio sui vostri file.

Licenza MIT · Node 20 o successivo · solo file locali · nessuna credenziale · nessuna dipendenza · nomi e indirizzi mascherati per il modello

## Provare

```bash
npx -y fairwire-firewall-rules demo     # revisione delle regole del firewall su dati fittizi
npx -y fairwire-sign-in-logs demo      # revisione dei log di accesso su dati fittizi
```

## Gli agenti

**Rete e perimetro:** `fairwire-firewall-rules` (regole del firewall), `fairwire-network-traffic` (NetFlow, IPFIX, sFlow), `fairwire-vpn-access` (log VPN), `fairwire-dns-queries` (query DNS), `fairwire-dns-records` (igiene delle zone DNS), `fairwire-wifi-health` (controller Wi-Fi), `fairwire-switch-ports` (porte switch e VLAN), `fairwire-dhcp-leases` (DHCP), `fairwire-call-quality` (qualità delle chiamate).

**Identità, posta e amministratori:** `fairwire-sign-in-logs` (log di accesso), `fairwire-mfa-coverage` (copertura MFA), `fairwire-admin-roles` (ruoli privilegiati), `fairwire-directory-hygiene` (igiene della directory), `fairwire-email-gateway` (gateway di posta).

**Dispositivi e software:** `fairwire-asset-inventory` (riconciliazione con la CMDB), `fairwire-patch-status` (stato delle patch), `fairwire-endpoint-protection` (protezione degli endpoint), `fairwire-mobile-devices` (dispositivi mobili), `fairwire-software-licenses` (installazioni rispetto alle licenze), `fairwire-print-fleet` (parco stampanti).

**Operazioni e resilienza:** `fairwire-backup-jobs` (backup), `fairwire-restore-tests` (test di ripristino), `fairwire-uptime-incidents` (disponibilità e incidenti), `fairwire-change-calendar` (calendario delle modifiche), `fairwire-ticket-sla` (SLA dei ticket), `fairwire-log-retention` (conservazione dei log).

**Spesa IT e uso dell’IA:** `fairwire-cloud-costs` (fatture cloud), `fairwire-contract-renewals` (contratti e preavvisi), `fairwire-telecom-bills` (fatture telefoniche), `fairwire-ai-usage` (uso dell’IA), `fairwire-api-retries` (costo dei tentativi ripetuti).

## Come lavorano

- Leggono solo file esportati e non accedono mai ai sistemi in produzione.
- Scrivono bozze; l’approvazione è il clic di una persona con nome, anche in modalità Auto. Le azioni in produzione sono rifiutate.
- Nomi, utenze, e-mail, telefoni e indirizzi dei client diventano pseudonimi per il modello.
- Le esportazioni in nove lingue si leggono allo stesso modo (codifiche, `1.234,56`, date, nomi di colonna locali). Le pagine di report seguono `--lang it`.

Risultati e decisioni: [docs/](docs/). Non è consulenza legale, di conformità o di certificazione.
