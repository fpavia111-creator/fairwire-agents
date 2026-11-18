# Fairwire IT・ネットワーク エージェント

*Claude による翻訳です。ネイティブスピーカーによる確認はまだです。英語の [README](README.md) が正本です。*

IT チーム向けの小さな MCP エージェント 31 個です。それぞれが**ひとつの仕事**だけを担当します。たとえばファイアウォールルールの確認、バックアップ結果の確認、サインインログの確認、クラウド請求の確認などで、それ以外のことはできません。ファイアウォール、コントローラー、ID プロバイダー、デバイス管理、バックアップツール、サービスデスク、クラウドコンソールから IT チームがすでにエクスポートしているファイルを読み、お使いのコンピューター上でレポートを書き、メモの下書きを作ります。稼働中の機器、ファイアウォール、DNS ゾーン、ディレクトリ、クラウドアカウントへの変更は、すべて**名前のある担当者のワンクリック**で行われます。

[Mythos Machines](https://fair-agents.com) の一部です（サイト上の名称は Fairwire）。ソフトウェアは無料（MIT）で、お客様のファイルでの導入に固定料金をいただきます。

MIT ライセンス · Node 20 以降 · ローカルファイルのみ · 認証情報なし · 依存関係なし · 名前とアドレスはモデルに対してマスク

## 試す

```bash
npx -y fairwire-firewall-rules demo     # 架空のデータでファイアウォールルールを確認
npx -y fairwire-sign-in-logs demo      # 架空のデータでサインインログを確認
```

## エージェント

**ネットワークと境界：** `fairwire-firewall-rules`（ファイアウォールルール）、`fairwire-network-traffic`（NetFlow、IPFIX、sFlow）、`fairwire-vpn-access`（VPN ログ）、`fairwire-dns-queries`（DNS クエリ）、`fairwire-dns-records`（DNS ゾーンの整理）、`fairwire-wifi-health`（Wi-Fi コントローラー）、`fairwire-switch-ports`（スイッチポートと VLAN）、`fairwire-dhcp-leases`（DHCP）、`fairwire-call-quality`（通話品質）。

**ID、メール、管理者：** `fairwire-sign-in-logs`（サインインログ）、`fairwire-mfa-coverage`（多要素認証の適用状況）、`fairwire-admin-roles`（特権ロール）、`fairwire-directory-hygiene`（ディレクトリの整理）、`fairwire-email-gateway`（メールゲートウェイ）。

**デバイスとソフトウェア：** `fairwire-asset-inventory`（CMDB との照合）、`fairwire-patch-status`（パッチ適用状況）、`fairwire-endpoint-protection`（エンドポイント保護）、`fairwire-mobile-devices`（モバイル端末）、`fairwire-software-licenses`（インストールとライセンス）、`fairwire-print-fleet`（プリンター群）。

**運用とレジリエンス：** `fairwire-backup-jobs`（バックアップ）、`fairwire-restore-tests`（リストアテスト）、`fairwire-uptime-incidents`（稼働率とインシデント）、`fairwire-change-calendar`（変更カレンダー）、`fairwire-ticket-sla`（チケット SLA）、`fairwire-log-retention`（ログの保存期間）。

**IT 支出と AI 利用：** `fairwire-cloud-costs`（クラウド請求）、`fairwire-contract-renewals`（IT 契約と解約予告期限）、`fairwire-telecom-bills`（通信費）、`fairwire-ai-usage`（AI 利用）、`fairwire-api-retries`（リトライのコスト）。

## 動作

- エクスポートされたファイルだけを読み、稼働中のシステムにはログインしません。
- 下書きを作成し、承認は名前のある担当者のワンクリックです（Auto モードでも同じ）。稼働中のシステムへの操作は拒否されます。
- 名前、サインイン名、メールアドレス、電話番号、クライアントのアドレスは、モデルに対して仮名に置き換えます。
- 9 言語のエクスポート（文字コード、`1,234.56`、日付形式、現地の列名）を同じように読みます。レポートページは `--lang ja` に従います。

結果と判断は [REVIEW-ver1.md](REVIEW-ver1.md) にあります。法務、コンプライアンス、認証に関する助言ではありません。
