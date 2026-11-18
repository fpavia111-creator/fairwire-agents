# Agentes Fairwire de TI e redes

*Traduzido pelo Claude; revisão por falante nativo pendente. O [README](README.md) em inglês é a versão de referência.*

Trinta e um pequenos agentes MCP para equipes de TI. Cada um tem **uma única tarefa**, como revisar regras de firewall, verificar backups, ler registros de login ou revisar a fatura de nuvem, e não age fora dela. Eles leem os arquivos que sua equipe já exporta de firewalls, controladoras, provedores de identidade, gerenciamento de dispositivos, ferramentas de backup, service desk e consoles de nuvem, escrevem relatórios na sua máquina e redigem notas. Qualquer mudança em um dispositivo, firewall, zona DNS, diretório ou conta de nuvem continua sendo **o clique de uma pessoa identificada**.

Parte da [Mythos Machines](https://fair-agents.com) (Fairwire no site). O software é gratuito (MIT); você paga um preço fixo pela implantação nos seus arquivos.

Licença MIT · Node 20 ou mais recente · apenas arquivos locais · sem credenciais · sem dependências · nomes e endereços mascarados para o modelo

## Experimente

```bash
npx -y boreas-of-firewalls demo     # revisão de regras de firewall com dados fictícios
npx -y angelia-of-signins demo      # revisão de logins com dados fictícios
```

## Os agentes

**Rede e perímetro:** `boreas-of-firewalls` (regras de firewall), `iris-of-traffic` (NetFlow, IPFIX, sFlow), `zephyrus-of-vpn` (registros de VPN), `notus-of-dns` (consultas DNS), `etesian-of-zones` (higiene das zonas DNS), `aura-of-wifi` (controladoras Wi-Fi), `eurus-of-switchports` (portas de switch e VLANs), `kaikias-of-leases` (DHCP), `echo-of-voip` (qualidade das chamadas).

**Identidade, e-mail e administradores:** `angelia-of-signins` (logins), `bora-of-mfa` (cobertura de MFA), `arke-of-admins` (funções privilegiadas), `tramontane-of-directory` (higiene do diretório), `pheme-of-gateways` (gateway de e-mail).

**Dispositivos e software:** `argestes-of-assets` (conciliação com a CMDB), `skiron-of-patches` (status dos patches), `apeliotes-of-endpoints` (proteção de endpoints), `eurybates-of-mobiles` (dispositivos móveis), `levante-of-software` (instalações versus licenças), `ostro-of-printers` (parque de impressoras).

**Operação e resiliência:** `meltemi-of-backups` (backups), `aparctias-of-restores` (testes de restauração), `stentor-of-incidents` (disponibilidade e incidentes), `ceryx-of-changes` (calendário de mudanças), `talthybius-of-tickets` (SLA dos chamados), `ossa-of-logs` (retenção de logs).

**Gastos de TI e uso de IA:** `sirocco-of-cloud` (faturas de nuvem), `chinook-of-renewals` (contratos e prazos de aviso), `libeccio-of-telecom` (faturas de telecom), `hermes-of-efficiency` (uso de IA), `icarus-of-retries` (custo das novas tentativas).

## Como funcionam

- Leem apenas arquivos exportados e nunca fazem login em sistemas em produção.
- Redigem rascunhos; a aprovação é o clique de uma pessoa identificada, também no modo Auto. Ações em produção são recusadas.
- Nomes, logins, e-mails, telefones e endereços de cliente viram pseudônimos para o modelo.
- Exportações em nove idiomas são lidas da mesma forma (codificações, `1.234,56`, datas, nomes de coluna locais). As páginas de relatório seguem `--lang pt`.

Resultados e decisões: [REVIEW-ver1.md](REVIEW-ver1.md). Não é aconselhamento jurídico, de conformidade ou de certificação.
