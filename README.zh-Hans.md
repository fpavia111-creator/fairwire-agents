# Fairwire IT 与网络智能体

*由 Claude 翻译，尚待母语人士审校。以英文 [README](README.md) 为准。*

面向 IT 团队的 31 个小型 MCP 智能体。每个只负责**一项工作**，例如审查防火墙规则、检查备份结果、阅读登录日志或审查云账单，不能越界行事。它们读取您的 IT 团队已经从防火墙、控制器、身份提供商、设备管理、备份工具、服务台和云控制台导出的文件，在您的电脑上生成报告并起草说明。对在线设备、防火墙、DNS 区域、目录或云账户的任何更改，始终由**一位署名人员点击确认**。

属于 [Mythos Machines](https://fair-agents.com)（网站上名为 Fairwire）。软件免费（MIT 许可）；您为基于自己文件的部署支付固定价格。

MIT 许可 · Node 20 或更高 · 仅本地文件 · 无需凭据 · 无依赖 · 对模型隐藏姓名和地址

## 试用

```bash
npx -y fairwire-firewall-rules demo     # 用虚构数据审查防火墙规则
npx -y fairwire-sign-in-logs demo      # 用虚构数据审查登录日志
```

## 智能体

**网络与边界：** `fairwire-firewall-rules`（防火墙规则）、`fairwire-network-traffic`（NetFlow、IPFIX、sFlow）、`fairwire-vpn-access`（VPN 日志）、`fairwire-dns-queries`（DNS 查询）、`fairwire-dns-records`（DNS 区域卫生）、`fairwire-wifi-health`（Wi-Fi 控制器）、`fairwire-switch-ports`（交换机端口与 VLAN）、`fairwire-dhcp-leases`（DHCP）、`fairwire-call-quality`（通话质量）。

**身份、邮件与管理员：** `fairwire-sign-in-logs`（登录日志）、`fairwire-mfa-coverage`（多因素认证覆盖）、`fairwire-admin-roles`（特权角色）、`fairwire-directory-hygiene`（目录卫生）、`fairwire-email-gateway`（邮件网关）。

**设备与软件：** `fairwire-asset-inventory`（与 CMDB 比对）、`fairwire-patch-status`（补丁状态）、`fairwire-endpoint-protection`（终端防护）、`fairwire-mobile-devices`（移动设备）、`fairwire-software-licenses`（安装与许可证比对）、`fairwire-print-fleet`（打印机群）。

**运维与韧性：** `fairwire-backup-jobs`（备份）、`fairwire-restore-tests`（恢复测试）、`fairwire-uptime-incidents`（可用性与事件）、`fairwire-change-calendar`（变更日历）、`fairwire-ticket-sla`（工单 SLA）、`fairwire-log-retention`（日志保留）。

**IT 支出与 AI 使用：** `fairwire-cloud-costs`（云账单）、`fairwire-contract-renewals`（IT 合同与通知期限）、`fairwire-telecom-bills`（电信账单）、`fairwire-ai-usage`（AI 使用）、`fairwire-api-retries`（重试成本）。

## 工作方式

- 只读取导出的文件，从不登录在线系统。
- 起草草稿；批准需要一位署名人员点击，Auto 模式下也一样。在线操作会被拒绝。
- 姓名、登录名、电子邮件、电话号码和客户端地址在发送给模型前替换为假名。
- 九种语言的导出文件（编码、`1,234.56`、日期格式、本地列名）都能同样读取。报告页面遵循 `--lang zh`。

结果与决定见 [REVIEW-ver1.md](REVIEW-ver1.md)。不构成法律、合规或认证建议。
