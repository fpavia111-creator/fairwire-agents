// The words on a report page, in the nine report languages: page headings, section
// headings and the common column names. `--lang` (or FAIRWIRE_LANG) picks the language.
//
// What does not change with the language: the CSV file (its column names are read by
// scripts), finding codes and status values, the finding sentences and the notes under
// "Limits". A page in another language says so in its footer.
//
// Translations are written by Claude and marked for review by a native speaker.
// A string with no translation is shown in English, never left blank.
import { normLang } from './lang.js';

const ORDER = ['de', 'fr', 'es', 'pt', 'it', 'ja', 'zh', 'ko'];

// English: [de, fr, es, pt, it, ja, zh, ko]. {d} is a date, {1} {2} are numbers.
const PAGE = {
  'All rows ({1})': ['Alle Zeilen ({1})', 'Toutes les lignes ({1})', 'Todas las filas ({1})', 'Todas as linhas ({1})', 'Tutte le righe ({1})', '全行（{1}）', '全部行（{1}）', '전체 행 ({1})'],
  Limits: ['Grenzen', 'Limites', 'Límites', 'Limites', 'Limiti', '制限事項', '限制说明', '한계'],
  'None.': ['Keine.', 'Aucun.', 'Ninguno.', 'Nenhum.', 'Nessuno.', 'なし。', '无。', '없음.'],
  'Written by a Fairwire agent from your files. Nothing was sent or changed.': [
    'Von einem Fairwire-Agenten aus Ihren Dateien erstellt. Es wurde nichts gesendet oder geändert.',
    'Rédigé par un agent Fairwire à partir de vos fichiers. Rien n’a été envoyé ni modifié.',
    'Escrito por un agente Fairwire a partir de sus archivos. No se envió ni se cambió nada.',
    'Escrito por um agente Fairwire a partir dos seus arquivos. Nada foi enviado nem alterado.',
    'Scritto da un agente Fairwire a partire dai vostri file. Nulla è stato inviato o modificato.',
    'Fairwire エージェントがお客様のファイルから作成しました。送信も変更も行っていません。',
    '由 Fairwire 智能体根据您的文件生成。未发送或更改任何内容。',
    'Fairwire 에이전트가 귀사의 파일로 작성했습니다. 아무것도 전송하거나 변경하지 않았습니다.'],
  'The summary line, finding texts, codes and the notes under Limits are in English. This page was translated by Claude; a native speaker has not reviewed it yet.': [
    'Die Zusammenfassung, die Befundtexte, die Codes und die Hinweise unter „Grenzen“ sind auf Englisch. Diese Seite wurde von Claude übersetzt; eine Prüfung durch Muttersprachler steht noch aus.',
    'La ligne de synthèse, les textes des constats, les codes et les notes sous « Limites » sont en anglais. Cette page a été traduite par Claude ; elle n’a pas encore été relue par un locuteur natif.',
    'La línea de resumen, los textos de los hallazgos, los códigos y las notas de «Límites» están en inglés. Esta página fue traducida por Claude; todavía no la ha revisado un hablante nativo.',
    'A linha de resumo, os textos dos apontamentos, os códigos e as notas em “Limites” estão em inglês. Esta página foi traduzida pelo Claude; ainda não foi revisada por um falante nativo.',
    'La riga di sintesi, i testi dei rilievi, i codici e le note sotto «Limiti» sono in inglese. Questa pagina è stata tradotta da Claude; non è ancora stata rivista da un madrelingua.',
    '概要行、指摘の本文、コード、「制限事項」の注記は英語です。このページは Claude が翻訳しました。ネイティブによる確認はまだ行われていません。',
    '摘要行、发现项的文字、代码以及“限制说明”下的备注为英文。本页由 Claude 翻译，尚未经母语人士审校。',
    '요약 문장, 지적 사항의 문구, 코드와 “한계” 아래의 주석은 영어입니다. 이 페이지는 Claude가 번역했으며 원어민 검토는 아직 이루어지지 않았습니다.'],
};

const TITLES = {
  'AI usage review': ['Prüfung der KI-Nutzung', 'Revue de l’usage de l’IA', 'Revisión del uso de IA', 'Revisão do uso de IA', 'Revisione dell’uso dell’IA', 'AI 利用状況の確認', 'AI 使用情况审查', 'AI 사용 검토'],
  'Assets against the CMDB': ['Geräte im Abgleich mit der CMDB', 'Actifs comparés à la CMDB', 'Activos frente a la CMDB', 'Ativos comparados à CMDB', 'Asset confrontati con la CMDB', 'CMDB と資産の照合', '资产与 CMDB 比对', 'CMDB 대비 자산'],
  'Backup job results': ['Ergebnisse der Sicherungsjobs', 'Résultats des sauvegardes', 'Resultados de las copias de seguridad', 'Resultados dos backups', 'Esiti dei job di backup', 'バックアップジョブの結果', '备份作业结果', '백업 작업 결과'],
  'Call quality review': ['Prüfung der Anrufqualität', 'Revue de la qualité des appels', 'Revisión de la calidad de llamadas', 'Revisão da qualidade das chamadas', 'Revisione della qualità delle chiamate', '通話品質の確認', '通话质量审查', '통화 품질 검토'],
  'Change calendar review': ['Prüfung des Änderungskalenders', 'Revue du calendrier des changements', 'Revisión del calendario de cambios', 'Revisão do calendário de mudanças', 'Revisione del calendario delle modifiche', '変更カレンダーの確認', '变更日历审查', '변경 일정 검토'],
  'Cloud bill review': ['Prüfung der Cloud-Rechnung', 'Revue de la facture cloud', 'Revisión de la factura de la nube', 'Revisão da fatura de nuvem', 'Revisione della fattura cloud', 'クラウド請求の確認', '云账单审查', '클라우드 청구서 검토'],
  'DHCP lease review': ['Prüfung der DHCP-Leases', 'Revue des baux DHCP', 'Revisión de concesiones DHCP', 'Revisão das concessões DHCP', 'Revisione dei lease DHCP', 'DHCP リースの確認', 'DHCP 租约审查', 'DHCP 임대 검토'],
  'DNS query review': ['Prüfung der DNS-Abfragen', 'Revue des requêtes DNS', 'Revisión de consultas DNS', 'Revisão de consultas DNS', 'Revisione delle query DNS', 'DNS クエリの確認', 'DNS 查询审查', 'DNS 쿼리 검토'],
  'DNS zone hygiene': ['Pflege der DNS-Zonen', 'Hygiène des zones DNS', 'Higiene de las zonas DNS', 'Higiene das zonas DNS', 'Igiene delle zone DNS', 'DNS ゾーンの整理状況', 'DNS 区域卫生检查', 'DNS 영역 정리 상태'],
  'Directory hygiene': ['Verzeichnispflege', 'Hygiène de l’annuaire', 'Higiene del directorio', 'Higiene do diretório', 'Igiene della directory', 'ディレクトリの整理状況', '目录卫生检查', '디렉터리 정리 상태'],
  'Email gateway review': ['Prüfung des E-Mail-Gateways', 'Revue de la passerelle de messagerie', 'Revisión de la pasarela de correo', 'Revisão do gateway de e-mail', 'Revisione del gateway di posta', 'メールゲートウェイの確認', '邮件网关审查', '이메일 게이트웨이 검토'],
  'Endpoint protection coverage': ['Abdeckung des Endpunktschutzes', 'Couverture de la protection des postes', 'Cobertura de protección de endpoints', 'Cobertura de proteção de endpoints', 'Copertura della protezione degli endpoint', 'エンドポイント保護の適用範囲', '终端防护覆盖情况', '엔드포인트 보호 적용 범위'],
  'Firewall rule review': ['Prüfung der Firewall-Regeln', 'Revue des règles de pare-feu', 'Revisión de reglas del cortafuegos', 'Revisão das regras de firewall', 'Revisione delle regole del firewall', 'ファイアウォールルールの確認', '防火墙规则审查', '방화벽 규칙 검토'],
  'IT contracts and renewals': ['IT-Verträge und Verlängerungen', 'Contrats informatiques et renouvellements', 'Contratos de TI y renovaciones', 'Contratos de TI e renovações', 'Contratti IT e rinnovi', 'IT 契約と更新', 'IT 合同与续约', 'IT 계약 및 갱신'],
  'Log retention and coverage': ['Aufbewahrung und Abdeckung der Protokolle', 'Conservation et couverture des journaux', 'Retención y cobertura de registros', 'Retenção e cobertura de logs', 'Conservazione e copertura dei log', 'ログの保存期間と収集範囲', '日志保留与覆盖情况', '로그 보존 및 수집 범위'],
  'MFA coverage': ['MFA-Abdeckung', 'Couverture de l’authentification multifacteur', 'Cobertura de MFA', 'Cobertura de MFA', 'Copertura MFA', '多要素認証の適用状況', '多因素认证覆盖情况', 'MFA 적용 현황'],
  'Mobile device inventory': ['Bestand mobiler Geräte', 'Inventaire des appareils mobiles', 'Inventario de dispositivos móviles', 'Inventário de dispositivos móveis', 'Inventario dei dispositivi mobili', 'モバイル端末の一覧', '移动设备清单', '모바일 기기 목록'],
  'Network flow review': ['Prüfung der Netzwerkflüsse', 'Revue des flux réseau', 'Revisión de flujos de red', 'Revisão de fluxos de rede', 'Revisione dei flussi di rete', 'ネットワークフローの確認', '网络流量审查', '네트워크 플로 검토'],
  'Patch status': ['Patch-Stand', 'État des correctifs', 'Estado de los parches', 'Status dos patches', 'Stato delle patch', 'パッチ適用状況', '补丁状态', '패치 현황'],
  'Print fleet review': ['Prüfung der Druckerflotte', 'Revue du parc d’imprimantes', 'Revisión del parque de impresoras', 'Revisão do parque de impressoras', 'Revisione del parco stampanti', 'プリンター群の確認', '打印机群审查', '프린터 현황 검토'],
  'Privileged role review': ['Prüfung privilegierter Rollen', 'Revue des rôles à privilèges', 'Revisión de roles con privilegios', 'Revisão de funções privilegiadas', 'Revisione dei ruoli privilegiati', '特権ロールの確認', '特权角色审查', '특권 역할 검토'],
  'Remote access review': ['Prüfung des Fernzugriffs', 'Revue des accès à distance', 'Revisión del acceso remoto', 'Revisão do acesso remoto', 'Revisione degli accessi remoti', 'リモートアクセスの確認', '远程访问审查', '원격 접속 검토'],
  'Restore tests': ['Wiederherstellungstests', 'Tests de restauration', 'Pruebas de restauración', 'Testes de restauração', 'Test di ripristino', 'リストアテスト', '恢复测试', '복원 테스트'],
  'Retry cost review': ['Prüfung der Kosten von Wiederholungen', 'Revue du coût des nouvelles tentatives', 'Revisión del coste de los reintentos', 'Revisão do custo das novas tentativas', 'Revisione del costo dei tentativi ripetuti', 'リトライのコスト確認', '重试成本审查', '재시도 비용 검토'],
  'Sign-in log review': ['Prüfung der Anmeldeprotokolle', 'Revue des journaux de connexion', 'Revisión de registros de inicio de sesión', 'Revisão dos registros de login', 'Revisione dei log di accesso', 'サインインログの確認', '登录日志审查', '로그인 기록 검토'],
  'Software installs against licences': ['Softwareinstallationen im Abgleich mit Lizenzen', 'Installations de logiciels comparées aux licences', 'Instalaciones de software frente a licencias', 'Instalações de software comparadas às licenças', 'Installazioni software confrontate con le licenze', 'ソフトウェアのインストールとライセンスの照合', '软件安装与许可证比对', '라이선스 대비 소프트웨어 설치'],
  'Switch port and VLAN review': ['Prüfung der Switch-Ports und VLANs', 'Revue des ports de commutateur et des VLAN', 'Revisión de puertos de switch y VLAN', 'Revisão de portas de switch e VLANs', 'Revisione delle porte switch e delle VLAN', 'スイッチポートと VLAN の確認', '交换机端口与 VLAN 审查', '스위치 포트 및 VLAN 검토'],
  'Telecom bill review': ['Prüfung der Telekommunikationsrechnungen', 'Revue des factures télécom', 'Revisión de facturas de telecomunicaciones', 'Revisão das faturas de telecom', 'Revisione delle fatture telefoniche', '通信費請求の確認', '电信账单审查', '통신 요금 청구서 검토'],
  'Ticket SLA aging': ['Ticket-Alter und SLA', 'Ancienneté des tickets et SLA', 'Antigüedad de tickets y SLA', 'Idade dos chamados e SLA', 'Anzianità dei ticket e SLA', 'チケットの経過日数と SLA', '工单时效与 SLA', '티켓 경과 및 SLA'],
  'Uptime and incidents': ['Verfügbarkeit und Störungen', 'Disponibilité et incidents', 'Disponibilidad e incidentes', 'Disponibilidade e incidentes', 'Disponibilità e incidenti', '稼働率とインシデント', '可用性与事件', '가동률 및 장애'],
  'Wi-Fi review': ['WLAN-Prüfung', 'Revue du Wi-Fi', 'Revisión de la Wi-Fi', 'Revisão do Wi-Fi', 'Revisione del Wi-Fi', 'Wi-Fi の確認', 'Wi-Fi 审查', 'Wi-Fi 검토'],
};

const SECTIONS = {
  'Accepted as known': ['Als bekannt akzeptiert', 'Acceptés comme connus', 'Aceptados como conocidos', 'Aceitos como conhecidos', 'Accettati come noti', '既知として承認済み', '已确认为已知', '알려진 항목으로 승인됨'],
  'By account': ['Nach Konto', 'Par compte', 'Por cuenta', 'Por conta', 'Per account', 'アカウント別', '按账户', '계정별'],
  'By application': ['Nach Anwendung', 'Par application', 'Por aplicación', 'Por aplicação', 'Per applicazione', 'アプリケーション別', '按应用', '애플리케이션별'],
  'By client': ['Nach Client', 'Par poste client', 'Por cliente', 'Por cliente', 'Per client', 'クライアント別', '按客户端', '클라이언트별'],
  'By codec': ['Nach Codec', 'Par codec', 'Por códec', 'Por codec', 'Per codec', 'コーデック別', '按编解码器', '코덱별'],
  'By country': ['Nach Land', 'Par pays', 'Por país', 'Por país', 'Per paese', '国別', '按国家', '국가별'],
  'By department': ['Nach Abteilung', 'Par département', 'Por departamento', 'Por departamento', 'Per reparto', '部署別', '按部门', '부서별'],
  'By endpoint': ['Nach Endpunkt', 'Par point de terminaison', 'Por endpoint', 'Por endpoint', 'Per endpoint', 'エンドポイント別', '按端点', '엔드포인트별'],
  'By finding': ['Nach Befund', 'Par constat', 'Por hallazgo', 'Por apontamento', 'Per rilievo', '指摘別', '按发现项', '지적 사항별'],
  'By group': ['Nach Gruppe', 'Par groupe', 'Por grupo', 'Por grupo', 'Per gruppo', 'グループ別', '按组', '그룹별'],
  'By host': ['Nach Host', 'Par hôte', 'Por host', 'Por host', 'Per host', 'ホスト別', '按主机', '호스트별'],
  'By job': ['Nach Job', 'Par tâche', 'Por trabajo', 'Por tarefa', 'Per job', 'ジョブ別', '按作业', '작업별'],
  'By location': ['Nach Standort', 'Par site', 'Por ubicación', 'Por local', 'Per sede', '拠点別', '按地点', '위치별'],
  'By model': ['Nach Modell', 'Par modèle', 'Por modelo', 'Por modelo', 'Per modello', 'モデル別', '按模型', '모델별'],
  'By month': ['Nach Monat', 'Par mois', 'Por mes', 'Por mês', 'Per mese', '月別', '按月', '월별'],
  'By platform': ['Nach Plattform', 'Par plateforme', 'Por plataforma', 'Por plataforma', 'Per piattaforma', 'プラットフォーム別', '按平台', '플랫폼별'],
  'By priority': ['Nach Priorität', 'Par priorité', 'Por prioridad', 'Por prioridade', 'Per priorità', '優先度別', '按优先级', '우선순위별'],
  'By product': ['Nach Produkt', 'Par logiciel', 'Por producto', 'Por produto', 'Per prodotto', '製品別', '按产品', '제품별'],
  'By protocol': ['Nach Protokoll', 'Par protocole', 'Por protocolo', 'Por protocolo', 'Per protocollo', 'プロトコル別', '按协议', '프로토콜별'],
  'By region': ['Nach Region', 'Par région', 'Por región', 'Por região', 'Per regione', 'リージョン別', '按地域', '리전별'],
  'By role': ['Nach Rolle', 'Par rôle', 'Por rol', 'Por função', 'Per ruolo', 'ロール別', '按角色', '역할별'],
  'By rule': ['Nach Regel', 'Par règle', 'Por regla', 'Por regra', 'Per regola', 'ルール別', '按规则', '규칙별'],
  'By scope': ['Nach Bereich', 'Par étendue', 'Por ámbito', 'Por escopo', 'Per ambito', 'スコープ別', '按作用域', '범위별'],
  'By service': ['Nach Dienst', 'Par service', 'Por servicio', 'Por serviço', 'Per servizio', 'サービス別', '按服务', '서비스별'],
  'By site': ['Nach Niederlassung', 'Par site', 'Por sede', 'Por unidade', 'Per sito', 'サイト別', '按站点', '사이트별'],
  'By source': ['Nach Quelle', 'Par source', 'Por origen', 'Por origem', 'Per origine', 'ソース別', '按来源', '소스별'],
  'By SSID': ['Nach SSID', 'Par SSID', 'Por SSID', 'Por SSID', 'Per SSID', 'SSID 別', '按 SSID', 'SSID별'],
  'By switch': ['Nach Switch', 'Par commutateur', 'Por switch', 'Por switch', 'Per switch', 'スイッチ別', '按交换机', '스위치별'],
  'By system': ['Nach System', 'Par système', 'Por sistema', 'Por sistema', 'Per sistema', 'システム別', '按系统', '시스템별'],
  'By team': ['Nach Team', 'Par équipe', 'Por equipo', 'Por equipe', 'Per team', 'チーム別', '按团队', '팀별'],
  'By type': ['Nach Art', 'Par type', 'Por tipo', 'Por tipo', 'Per tipo', '種類別', '按类型', '유형별'],
  'By user': ['Nach Benutzer', 'Par utilisateur', 'Por usuario', 'Por usuário', 'Per utente', 'ユーザー別', '按用户', '사용자별'],
  'By vendor': ['Nach Lieferant', 'Par fournisseur', 'Por proveedor', 'Por fornecedor', 'Per fornitore', '仕入先別', '按供应商', '공급업체별'],
  'By zone': ['Nach Zone', 'Par zone', 'Por zona', 'Por zona', 'Per zona', 'ゾーン別', '按区域', '영역별'],
  'Open findings': ['Offene Befunde', 'Constats ouverts', 'Hallazgos abiertos', 'Apontamentos em aberto', 'Rilievi aperti', '未対応の指摘', '未处理的发现项', '미해결 지적 사항'],
};

// Column names used by two or more agents, plus the scorecard measures. A column with no
// entry keeps its English name on the page.
const COLUMNS = {
  status: ['Status', 'Statut', 'Estado', 'Status', 'Stato', 'ステータス', '状态', '상태'],
  detail: ['Einzelheiten', 'Détail', 'Detalle', 'Detalhe', 'Dettaglio', '詳細', '详情', '상세'],
  amount: ['Betrag', 'Montant', 'Importe', 'Valor', 'Importo', '金額', '金额', '금액'],
  code: ['Code', 'Code', 'Código', 'Código', 'Codice', 'コード', '代码', '코드'],
  reason: ['Grund', 'Motif', 'Motivo', 'Motivo', 'Motivo', '理由', '原因', '사유'],
  reasons: ['Gründe', 'Motifs', 'Motivos', 'Motivos', 'Motivi', '理由', '原因', '사유'],
  count: ['Anzahl', 'Nombre', 'Cantidad', 'Quantidade', 'Numero', '件数', '数量', '건수'],
  notes: ['Notizen', 'Notes', 'Notas', 'Notas', 'Note', 'メモ', '备注', '메모'],
  date: ['Datum', 'Date', 'Fecha', 'Data', 'Data', '日付', '日期', '날짜'],
  age_days: ['Alter (Tage)', 'Âge (jours)', 'Antigüedad (días)', 'Idade (dias)', 'Età (giorni)', '経過日数', '账龄（天）', '경과 일수'],
  days_left: ['Verbleibende Tage', 'Jours restants', 'Días restantes', 'Dias restantes', 'Giorni rimanenti', '残り日数', '剩余天数', '남은 일수'],
  flags: ['Hinweise', 'Signalements', 'Avisos', 'Alertas', 'Segnalazioni', '注意点', '提示', '주의 사항'],
  units: ['Einheiten', 'Unités', 'Unidades', 'Unidades', 'Unità', '数量', '件数', '수량'],
  issues: ['Auffälligkeiten', 'Anomalies', 'Incidencias', 'Ocorrências', 'Anomalie', '問題点', '问题', '이슈'],
  from: ['Von', 'De', 'Origen', 'Origem', 'Da', '発地', '起点', '출발지'],
  to: ['Nach', 'Vers', 'Destino', 'Destino', 'A', '着地', '终点', '도착지'],
  type: ['Art', 'Type', 'Tipo', 'Tipo', 'Tipo', '種類', '类型', '유형'],
  spend: ['Ausgaben', 'Dépenses', 'Gasto', 'Gasto', 'Spesa', '支出', '支出', '지출'],
  share_pct: ['Anteil %', 'Part %', 'Cuota %', 'Participação %', 'Quota %', 'シェア %', '份额 %', '점유율 %'],
  finding: ['Befund', 'Constat', 'Hallazgo', 'Apontamento', 'Rilievo', '指摘', '发现项', '지적 사항'],
  findings: ['Befunde', 'Constats', 'Hallazgos', 'Apontamentos', 'Rilievi', '指摘', '发现项', '지적 사항'],
  rank: ['Rang', 'Rang', 'Puesto', 'Posição', 'Posizione', '順位', '排名', '순위'],
  score: ['Punktzahl', 'Score', 'Puntuación', 'Pontuação', 'Punteggio', 'スコア', '得分', '점수'],
  variance: ['Abweichung', 'Écart', 'Variación', 'Variação', 'Scostamento', '差異', '差异', '차이'],
  difference: ['Differenz', 'Différence', 'Diferencia', 'Diferença', 'Differenza', '差額', '差额', '차액'],
  description: ['Beschreibung', 'Description', 'Descripción', 'Descrição', 'Descrizione', '内容', '描述', '설명'],
  action: ['Maßnahme', 'Action', 'Acción', 'Ação', 'Azione', '対応', '措施', '조치'],
  fix: ['Abhilfe', 'Correction', 'Solución', 'Correção', 'Rimedio', '是正策', '解决办法', '해결 방법'],
  value: ['Wert', 'Valeur', 'Valor', 'Valor', 'Valore', '金額', '价值', '가액'],
  rule: ['Regel', 'Règle', 'Regla', 'Regra', 'Regola', 'ルール', '规则', '규칙'],
  savings: ['Einsparung', 'Économies', 'Ahorro', 'Economia', 'Risparmio', '削減額', '节省', '절감액'],
  line: ['Position', 'Ligne', 'Línea', 'Linha', 'Riga', '明細', '行', '라인'],
  lines: ['Positionen', 'Lignes', 'Líneas', 'Linhas', 'Righe', '明細数', '行数', '라인 수'],
  expected: ['Erwartet', 'Attendu', 'Esperado', 'Esperado', 'Atteso', '期待値', '应为', '예상'],
  cost: ['Kosten', 'Coût', 'Coste', 'Custo', 'Costo', 'コスト', '成本', '비용'],
  cost_center: ['Kostenstelle', 'Centre de coûts', 'Centro de coste', 'Centro de custo', 'Centro di costo', 'コストセンター', '成本中心', '코스트센터'],
  basis: ['Basis', 'Base', 'Base', 'Base', 'Base', '基準', '依据', '기준'],
  vendor: ['Lieferant', 'Fournisseur', 'Proveedor', 'Fornecedor', 'Fornitore', '仕入先', '供应商', '공급업체'],
  total: ['Summe', 'Total', 'Total', 'Total', 'Totale', '合計', '合计', '합계'],
  severity: ['Schweregrad', 'Gravité', 'Gravedad', 'Gravidade', 'Gravità', '重大度', '严重程度', '심각도'],
  host: ['Host', 'Hôte', 'Host', 'Host', 'Host', 'ホスト', '主机', '호스트'],
  user: ['Benutzer', 'Utilisateur', 'Usuario', 'Usuário', 'Utente', 'ユーザー', '用户', '사용자'],
  site: ['Niederlassung', 'Site', 'Sede', 'Unidade', 'Sito', 'サイト', '站点', '사이트'],
  device: ['Gerät', 'Appareil', 'Dispositivo', 'Dispositivo', 'Dispositivo', 'デバイス', '设备', '기기'],
  system: ['System', 'Système', 'Sistema', 'Sistema', 'Sistema', 'システム', '系统', '시스템'],
  service: ['Dienst', 'Service', 'Servicio', 'Serviço', 'Servizio', 'サービス', '服务', '서비스'],
  owner: ['Verantwortlich', 'Responsable', 'Responsable', 'Responsável', 'Responsabile', '担当者', '负责人', '담당자'],
  decision: ['Entscheidung', 'Décision', 'Decisión', 'Decisão', 'Decisione', '判断', '决定', '결정'],
  message: ['Meldung', 'Message', 'Mensaje', 'Mensagem', 'Messaggio', 'メッセージ', '说明', '메시지'],
  bytes: ['Bytes', 'Octets', 'Bytes', 'Bytes', 'Byte', 'バイト', '字节', '바이트'],
  key: ['Schlüssel', 'Clé', 'Clave', 'Chave', 'Chiave', 'キー', '键', '키'],
  open: ['Offen', 'Ouverts', 'Abiertos', 'Em aberto', 'Aperti', '未対応', '未处理', '미해결'],
};

// The scorecard's measure names, which the agent passes as labels.
const LABELS = {
};

/** Every catalog, for the tests: { name: { english: [8 translations] } }. */
export const REPORT_TEXT = Object.freeze({ page: PAGE, titles: TITLES, sections: SECTIONS, columns: COLUMNS, labels: LABELS });
export const ENGLISH_NOTE = 'The summary line, finding texts, codes and the notes under Limits are in English. This page was translated by Claude; a native speaker has not reviewed it yet.';

const DATE = /\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?/;
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : vars[k]));

/** Find a phrase in a catalog: as written, then with its date as {d}, then with its numbers as {1} {2}. */
function lookup(cat, s) {
  if (Object.hasOwn(cat, s)) return [cat[s], {}];
  const d = DATE.exec(s);
  if (d) { const k = s.replace(DATE, '{d}'); if (Object.hasOwn(cat, k)) return [cat[k], { d: d[0] }]; }
  const vars = {}; let n = 0; const k = s.replace(/\d+(?:\.\d+)?/g, (m) => { vars[++n] = m; return `{${n}}`; });
  return n && Object.hasOwn(cat, k) ? [cat[k], vars] : [null, {}];
}

/**
 * Text for a report page in one language:
 *   t.page(s), t.title(s), t.section(s)  a phrase, translated when the catalog has it;
 *   t.column(name, label)                a column heading (label is the agent's own, when it set one);
 *   t.english                            true when nothing is translated.
 */
export function reportText(lang) {
  const l = normLang(lang); const i = ORDER.indexOf(l);
  const tr = (cat) => (s) => { if (i < 0) return s; const [hit, vars] = lookup(cat, String(s)); return hit && hit[i] ? fill(hit[i], vars) : s; };
  const label = tr(LABELS);
  return {
    lang: l, english: i < 0, page: tr(PAGE), title: tr(TITLES), section: tr(SECTIONS),
    column: (name, own) => { if (own) return label(own); if (i >= 0 && Object.hasOwn(COLUMNS, name) && COLUMNS[name][i]) return COLUMNS[name][i]; return String(name).replace(/_/g, ' '); },
  };
}
