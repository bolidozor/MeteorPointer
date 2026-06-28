# CI/CD — Android build & deploy

Workflow: `.github/workflows/android-build.yml`

## Triggers

| Event                        | Build | Deploy |
|------------------------------|-------|--------|
| Pull request → `master`      | ✅ (typecheck + test + APK) | ❌ |
| Push to `master`             | ✅    | ✅ → `latest` |
| Push tag `v*` (e.g. `v1.2.0`)| ✅    | ✅ → `latest` + `release` |
| Manual (`workflow_dispatch`) | ✅    | ✅ if run on a branch/tag push context |

## Versioning & layout on the server

```
$DEPLOY_PATH/
├── builds/
│   ├── master-a1b2c3d/MeteorPointer-master-a1b2c3d.apk   # per-commit
│   └── v1.2.0/MeteorPointer-v1.2.0.apk                   # per-tag
├── latest  -> builds/master-a1b2c3d   # newest build of any kind
└── release -> builds/v1.2.0           # newest tagged release only
```

- Master pushes are versioned by short commit hash (`master-<sha>`).
- Tags are versioned by tag name.

## Required GitHub secrets

Set under *Settings → Secrets and variables → Actions*:

| Secret            | Description                                          |
|-------------------|------------------------------------------------------|
| `SSH_PRIVATE_KEY` | Private deploy key (ed25519), full PEM block         |
| `SSH_HOST`        | Server hostname or IP                                |
| `SSH_USER`        | SSH user                                             |
| `SSH_PORT`        | SSH port (optional, defaults to `22`)                |
| `DEPLOY_PATH`     | Absolute base path on the server (no trailing slash) |

## Deploy key setup

A dedicated key pair was generated for this. Put the **private** key in the
`SSH_PRIVATE_KEY` secret, and append the **public** key to the server's
`~/.ssh/authorized_keys` for `SSH_USER`.

To regenerate:

```sh
ssh-keygen -t ed25519 -C "github-actions-deploy@meteorpointer" -f deploy_key -N ""
```
