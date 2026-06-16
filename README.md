# cofiswarm-ui

Cofiswarm component: `ui`.

- Layout: [REPO-STANDARD-LAYOUT](https://github.com/keepdevops/cofiswarmdev/blob/main/docs/REPO-STANDARD-LAYOUT.md)
- Migration: [MIGRATION-SPRINTS](https://github.com/keepdevops/cofiswarmdev/blob/main/docs/MIGRATION-SPRINTS.md)

## FHS paths

| Path | Purpose |
|------|---------|
| `/etc/cofiswarm/ui/` | config |
| `/var/lib/cofiswarm/ui/` | state |
| `/var/log/cofiswarm/ui/` | logs |

## Test

```bash
./test/scripts/assert-layout.sh ui
```
