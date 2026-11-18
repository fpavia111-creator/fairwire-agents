# Fairwire IT・ネットワーク エージェント

*Claude による翻訳です。ネイティブスピーカーによる確認はまだです。英語の [README](README.md) が正本です。*

IT チーム向けの小さな MCP エージェント 31 個です。それぞれが**ひとつの仕事**だけを担当します。たとえばファイアウォールルールの確認、バックアップ結果の確認、サインインログの確認、クラウド請求の確認などで、それ以外のことはできません。ファイアウォール、コントローラー、ID プロバイダー、デバイス管理、バックアップツール、サービスデスク、クラウドコンソールから IT チームがすでにエクスポートしているファイルを読み、お使いのコンピューター上でレポートを書き、メモの下書きを作ります。稼働中の機器、ファイアウォール、DNS ゾーン、ディレクトリ、クラウドアカウントへの変更は、すべて**名前のある担当者のワンクリック**で行われます。

[Mythos Machines](https://fair-agents.com) の一部です（サイト上の名称は Fairwire）。ソフトウェアは無料（MIT）で、お客様のファイルでの導入に固定料金をいただきます。

MIT ライセンス · Node 20 以降 · ローカルファイルのみ · 認証情報なし · 依存関係なし · 名前とアドレスはモデルに対してマスク

## 試す

```bash
npx -y boreas-of-firewalls demo     # 架空のデータでファイアウォールルールを確認
npx -y angelia-of-signins demo      # 架空のデータでサインインログを確認
```

## エージェント

**ネットワークと境界：** `boreas-of-firewalls`（ファイアウォールルール）、`iris-of-traffic`（NetFlow、IPFIX、sFlow）、`zephyrus-of-vpn`（VPN ログ）、`notus-of-dns`（DNS クエリ）、`etesian-of-zones`（DNS ゾーンの整理）、`aura-of-wifi`（Wi-Fi コントローラー）、`eurus-of-switchports`（スイッチポートと VLAN）、`kaikias-of-leases`（DHCP）、`echo-of-voip`（通話品質）。

**ID、メール、管理者：** `angelia-of-signins`（サインインログ）、`bora-of-mfa`（多要素認証の適用状況）、`arke-of-admins`（特権ロール）、`tramontane-of-directory`（ディレクトリの整理）、`pheme-of-gateways`（メールゲートウェイ）。

**デバイスとソフトウェア：** `argestes-of-assets`（CMDB との照合）、`skiron-of-patches`（パッチ適用状況）、`apeliotes-of-endpoints`（エンドポイント保護）、`eurybates-of-mobiles`（モバイル端末）、`levante-of-software`（インストールとライセンス）、`ostro-of-printers`（プリンター群）。

**運用とレジリエンス：** `meltemi-of-backups`（バックアップ）、`aparctias-of-restores`（リストアテスト）、`stentor-of-incidents`（稼働率とインシデント）、`ceryx-of-changes`（変更カレンダー）、`talthybius-of-tickets`（チケット SLA）、`ossa-of-logs`（ログの保存期間）。

**IT 支出と AI 利用：** `sirocco-of-cloud`（クラウド請求）、`chinook-of-renewals`（IT 契約と解約予告期限）、`libeccio-of-telecom`（通信費）、`hermes-of-efficiency`（AI 利用）、`icarus-of-retries`（リトライのコスト）。

## 動作

- エクスポートされたファイルだけを読み、稼働中のシステムにはログインしません。
- 下書きを作成し、承認は名前のある担当者のワンクリックです（Auto モードでも同じ）。稼働中のシステムへの操作は拒否されます。
- 名前、サインイン名、メールアドレス、電話番号、クライアントのアドレスは、モデルに対して仮名に置き換えます。
- 9 言語のエクスポート（文字コード、`1,234.56`、日付形式、現地の列名）を同じように読みます。レポートページは `--lang ja` に従います。

結果と判断は [REVIEW-ver1.md](REVIEW-ver1.md) にあります。法務、コンプライアンス、認証に関する助言ではありません。
