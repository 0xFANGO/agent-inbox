# Security

**English** | [简体中文](SECURITY.zh-CN.md)

This extension reads local agent conversations and window information and maintains a local database, cache, and notifications. Do not put credentials, complete conversations, databases, or unredacted configuration in public issues, pull requests, or screenshots.

## Reporting a vulnerability

Check the repository's [Security page](https://github.com/0xFANGO/agent-inbox/security). If **Report a vulnerability** is available, use it to privately provide the affected version, reproduction conditions, impact, and a redacted sample.

If that option is unavailable, no alternative private email address is currently listed here. Open an issue asking for a private contact channel, without vulnerability details, exploit steps, or sensitive data. Send the details once the maintainer provides that channel.

## Isolating test data

When debugging the state machine or CLI, use a temporary `AGENT_INBOX_HOME` with `notifications: false`. See the [CLI example](docs/cli.md). Do not use real sessions to test automatic approvals or message sending; Agent Inbox does not approve agent requests on your behalf.

There is no published GitHub Release or long-term support branch yet. Include the commit in your report; release notes will describe the scope of fixes.
