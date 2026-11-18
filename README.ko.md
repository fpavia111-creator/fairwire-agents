# Fairwire IT·네트워크 에이전트

*Claude가 번역했으며 원어민 검토는 아직입니다. 영어 [README](README.md)가 기준입니다.*

IT 팀을 위한 작은 MCP 에이전트 31개입니다. 각각 방화벽 규칙 검토, 백업 결과 확인, 로그인 기록 검토, 클라우드 청구서 검토처럼 **한 가지 일**만 맡으며 그 밖의 일은 할 수 없습니다. IT 팀이 이미 방화벽, 컨트롤러, ID 공급자, 기기 관리, 백업 도구, 서비스 데스크, 클라우드 콘솔에서 내보내는 파일을 읽고, 사용자의 컴퓨터에서 보고서를 쓰고, 메모 초안을 작성합니다. 운영 중인 장비, 방화벽, DNS 영역, 디렉터리, 클라우드 계정에 대한 모든 변경은 **이름이 있는 담당자의 한 번의 클릭**으로 남습니다.

[Mythos Machines](https://fair-agents.com)의 일부입니다(사이트 이름 Fairwire). 소프트웨어는 무료(MIT)이며, 고객 파일에 맞춘 설치에 고정 가격을 받습니다.

MIT 라이선스 · Node 20 이상 · 로컬 파일만 · 자격 증명 없음 · 의존성 없음 · 모델에는 이름과 주소를 가림

## 사용해 보기

```bash
npx -y fairwire-firewall-rules demo     # 가상의 데이터로 방화벽 규칙 검토
npx -y fairwire-sign-in-logs demo      # 가상의 데이터로 로그인 기록 검토
```

## 에이전트

**네트워크와 경계:** `fairwire-firewall-rules`(방화벽 규칙), `fairwire-network-traffic`(NetFlow, IPFIX, sFlow), `fairwire-vpn-access`(VPN 기록), `fairwire-dns-queries`(DNS 쿼리), `fairwire-dns-records`(DNS 영역 정리), `fairwire-wifi-health`(Wi-Fi 컨트롤러), `fairwire-switch-ports`(스위치 포트와 VLAN), `fairwire-dhcp-leases`(DHCP), `fairwire-call-quality`(통화 품질).

**ID, 메일, 관리자:** `fairwire-sign-in-logs`(로그인 기록), `fairwire-mfa-coverage`(MFA 적용 현황), `fairwire-admin-roles`(특권 역할), `fairwire-directory-hygiene`(디렉터리 정리), `fairwire-email-gateway`(메일 게이트웨이).

**기기와 소프트웨어:** `fairwire-asset-inventory`(CMDB 대조), `fairwire-patch-status`(패치 현황), `fairwire-endpoint-protection`(엔드포인트 보호), `fairwire-mobile-devices`(모바일 기기), `fairwire-software-licenses`(설치 대비 라이선스), `fairwire-print-fleet`(프린터 현황).

**운영과 복원력:** `fairwire-backup-jobs`(백업), `fairwire-restore-tests`(복원 테스트), `fairwire-uptime-incidents`(가동률과 장애), `fairwire-change-calendar`(변경 일정), `fairwire-ticket-sla`(티켓 SLA), `fairwire-log-retention`(로그 보존).

**IT 지출과 AI 사용:** `fairwire-cloud-costs`(클라우드 청구서), `fairwire-contract-renewals`(IT 계약과 해지 통지 기한), `fairwire-telecom-bills`(통신 요금), `fairwire-ai-usage`(AI 사용), `fairwire-api-retries`(재시도 비용).

## 작동 방식

- 내보낸 파일만 읽으며 운영 중인 시스템에 로그인하지 않습니다.
- 초안을 작성하고, 승인은 이름이 있는 담당자의 클릭입니다(Auto 모드에서도 동일). 운영 시스템에 대한 작업은 거부됩니다.
- 이름, 로그인 이름, 이메일 주소, 전화번호, 클라이언트 주소는 모델에 가명으로 전달됩니다.
- 9개 언어의 내보내기 파일(인코딩, `1,234.56`, 날짜 형식, 현지 열 이름)을 똑같이 읽습니다. 보고서 페이지는 `--lang ko`를 따릅니다.

결과와 결정은 [REVIEW-ver1.md](REVIEW-ver1.md)에 있습니다. 법률, 규정 준수 또는 인증 관련 조언이 아닙니다.
