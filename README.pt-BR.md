# Agentes Fairwire de TI e redes

*Traduzido pelo Claude; revisão por falante nativo pendente. O [README](README.md) em inglês é a versão de referência.*

Trinta e um pequenos agentes MCP para equipes de TI. Cada um tem **uma única tarefa**, como revisar regras de firewall, verificar backups, ler registros de login ou revisar a fatura de nuvem, e não age fora dela. Eles leem os arquivos que sua equipe já exporta de firewalls, controladoras, provedores de identidade, gerenciamento de dispositivos, ferramentas de backup, service desk e consoles de nuvem, escrevem relatórios na sua máquina e redigem notas. Qualquer mudança em um dispositivo, firewall, zona DNS, diretório ou conta de nuvem continua sendo **o clique de uma pessoa identificada**.

Parte da [Fair Agents](https://fair-agents.com) (Fairwire no site). O software é gratuito (MIT); você paga um preço fixo pela implantação nos seus arquivos.

Licença MIT · Node 20 ou mais recente · apenas arquivos locais · sem credenciais · sem dependências · nomes e endereços mascarados para o modelo

## Experimente

```bash
npx -y fairwire-firewall-rules demo     # revisão de regras de firewall com dados fictícios
npx -y fairwire-sign-in-logs demo      # revisão de logins com dados fictícios
```

## Os agentes

**Rede e perímetro:** `fairwire-firewall-rules` (regras de firewall), `fairwire-network-traffic` (NetFlow, IPFIX, sFlow), `fairwire-vpn-access` (registros de VPN), `fairwire-dns-queries` (consultas DNS), `fairwire-dns-records` (higiene das zonas DNS), `fairwire-wifi-health` (controladoras Wi-Fi), `fairwire-switch-ports` (portas de switch e VLANs), `fairwire-dhcp-leases` (DHCP), `fairwire-call-quality` (qualidade das chamadas).

**Identidade, e-mail e administradores:** `fairwire-sign-in-logs` (logins), `fairwire-mfa-coverage` (cobertura de MFA), `fairwire-admin-roles` (funções privilegiadas), `fairwire-directory-hygiene` (higiene do diretório), `fairwire-email-gateway` (gateway de e-mail).

**Dispositivos e software:** `fairwire-asset-inventory` (conciliação com a CMDB), `fairwire-patch-status` (status dos patches), `fairwire-endpoint-protection` (proteção de endpoints), `fairwire-mobile-devices` (dispositivos móveis), `fairwire-software-licenses` (instalações versus licenças), `fairwire-print-fleet` (parque de impressoras).

**Operação e resiliência:** `fairwire-backup-jobs` (backups), `fairwire-restore-tests` (testes de restauração), `fairwire-uptime-incidents` (disponibilidade e incidentes), `fairwire-change-calendar` (calendário de mudanças), `fairwire-ticket-sla` (SLA dos chamados), `fairwire-log-retention` (retenção de logs).

**Gastos de TI e uso de IA:** `fairwire-cloud-costs` (faturas de nuvem), `fairwire-contract-renewals` (contratos e prazos de aviso), `fairwire-telecom-bills` (faturas de telecom), `fairwire-ai-usage` (uso de IA), `fairwire-api-retries` (custo das novas tentativas).

## Como funcionam

- Leem apenas arquivos exportados e nunca fazem login em sistemas em produção.
- Redigem rascunhos; a aprovação é o clique de uma pessoa identificada, também no modo Auto. Ações em produção são recusadas.
- Nomes, logins, e-mails, telefones e endereços de cliente viram pseudônimos para o modelo.
- Exportações em nove idiomas são lidas da mesma forma (codificações, `1.234,56`, datas, nomes de coluna locais). As páginas de relatório seguem `--lang pt`.

Resultados e decisões: [docs/](docs/). Não é aconselhamento jurídico, de conformidade ou de certificação.
