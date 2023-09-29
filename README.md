# Setup proto and moon toolchains

A GitHub action that sets up an environment for proto and moon.

- Installs `proto` globally so that installed tools can also be executed globally.
- Conditionally installs `moon` globally if the repository is using moon (attempts to detect a
  `.moon` directory).
- Caches the toolchain (`~/.proto`) so subsequent runs are faster.
- Hashes `.prototools` and `.moon/toolchain.yml` files to generate a unique cache key.
- Cleans the toolchain before caching to remove unused or stale tools.

## Installation

```yaml
# ...
jobs:
  ci:
    name: CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: moonrepo/setup-toolchain@v0
      - run: proto use
      - run: moon ci
```

## Inputs

- `moon-version` - Version of moon to explicitly install (if repository is using moon). Defaults to
  "latest".
- `proto-version` - Version of proto to explicitly install. Defaults to "latest".
- `workspace-root` - Relative path to moon's workspace root if initialized in a sub-directory.
  Defaults to "".
