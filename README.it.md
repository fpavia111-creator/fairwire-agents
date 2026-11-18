# Agenti Fairwire per IT e reti

*Tradotto da Claude; revisione da parte di un madrelingua in attesa. Il [README](README.md) in inglese è la versione di riferimento.*

Trentuno piccoli agenti MCP per i team IT. Ognuno ha **un solo compito**, per esempio rivedere le regole del firewall, controllare i backup, leggere i log di accesso o esaminare la fattura cloud, e non può agire oltre. Leggono i file che il vostro team esporta già da firewall, controller, provider di identità, gestione dei dispositivi, strumenti di backup, service desk e console cloud, scrivono report sul vostro computer e redigono note. Ogni modifica a un dispositivo, firewall, zona DNS, directory o account cloud resta **il clic di una persona con nome e cognome**.

Parte di [Mythos Machines](https://fair-agents.com) (Fairwire sul sito). Il software è gratuito (MIT); si paga un prezzo fisso per l’avvio sui vostri file.

Licenza MIT · Node 20 o successivo · solo file locali · nessuna credenziale · nessuna dipendenza · nomi e indirizzi mascherati per il modello

## Provare

```bash
npx -y boreas-of-firewalls demo     # revisione delle regole del firewall su dati fittizi
npx -y angelia-of-signins demo      # revisione dei log di accesso su dati fittizi
```

## Gli agenti

**Rete e perimetro:** `boreas-of-firewalls` (regole del firewall), `iris-of-traffic` (NetFlow, IPFIX, sFlow), `zephyrus-of-vpn` (log VPN), `notus-of-dns` (query DNS), `etesian-of-zones` (igiene delle zone DNS), `aura-of-wifi` (controller Wi-Fi), `eurus-of-switchports` (porte switch e VLAN), `kaikias-of-leases` (DHCP), `echo-of-voip` (qualità delle chiamate).

**Identità, posta e amministratori:** `angelia-of-signins` (log di accesso), `bora-of-mfa` (copertura MFA), `arke-of-admins` (ruoli privilegiati), `tramontane-of-directory` (igiene della directory), `pheme-of-gateways` (gateway di posta).

**Dispositivi e software:** `argestes-of-assets` (riconciliazione con la CMDB), `skiron-of-patches` (stato delle patch), `apeliotes-of-endpoints` (protezione degli endpoint), `eurybates-of-mobiles` (dispositivi mobili), `levante-of-software` (installazioni rispetto alle licenze), `ostro-of-printers` (parco stampanti).

**Operazioni e resilienza:** `meltemi-of-backups` (backup), `aparctias-of-restores` (test di ripristino), `stentor-of-incidents` (disponibilità e incidenti), `ceryx-of-changes` (calendario delle modifiche), `talthybius-of-tickets` (SLA dei ticket), `ossa-of-logs` (conservazione dei log).

**Spesa IT e uso dell’IA:** `sirocco-of-cloud` (fatture cloud), `chinook-of-renewals` (contratti e preavvisi), `libeccio-of-telecom` (fatture telefoniche), `hermes-of-efficiency` (uso dell’IA), `icarus-of-retries` (costo dei tentativi ripetuti).

## Come lavorano

- Leggono solo file esportati e non accedono mai ai sistemi in produzione.
- Scrivono bozze; l’approvazione è il clic di una persona con nome, anche in modalità Auto. Le azioni in produzione sono rifiutate.
- Nomi, utenze, e-mail, telefoni e indirizzi dei client diventano pseudonimi per il modello.
- Le esportazioni in nove lingue si leggono allo stesso modo (codifiche, `1.234,56`, date, nomi di colonna locali). Le pagine di report seguono `--lang it`.

Risultati e decisioni: [REVIEW-ver1.md](REVIEW-ver1.md). Non è consulenza legale, di conformità o di certificazione.
