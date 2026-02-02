# 0.6.1

- Fixed an issue with proto v0.55 installs.
- Updated to use githubusercontent.com instead of moonrepo.dev for script downloads.
- Updated dependencies.

# 0.6.0

- Added a `auto-setup` input that will automatically setup moon toolchains by running `moon setup`.
- Updated proto version detection to extract the `proto.version` field from `.moon/toolchain.yml`.

# 0.5.0

- Support proto v0.51 changes and `.protolock` files.
- Fixed the proto/moon versions not being available in the post-run cache key.
- Updated dependencies.

# 0.4.1

- Include the architecture in the cache key.

# 0.4.0

- Added a `cache-version` input that will be used in the cache key.
- Updated dependencies.

# 0.3.3

- If `moon` is configured in a root `.prototools`, we'll no longer install the moon binary through
  the action, and rely on proto to install it. This only applies if `auto-install` is true.

# 0.3.2

- Auto-install will now run in the `workspace-root` if defined.

# 0.3.1

- moon can be forced installed by setting `moon-version`, instead of relying on file detection.

# 0.3.0

- Now includes the moon and proto versions in the cache key.
- Updated dependencies.

# 0.2.1

- Support proto v0.24 changes.

# 0.2.0

- Added a `cache` input to toggle caching of the toolchain. Defaults to true.
- Added a `cache-base` input. When provided, will only save cache on this branch/ref, but will
  restore cache on all branches/refs.

# 0.1.2

- Improve cache key checks.
- Reduce globbing calls.

# 0.1.1

- Updated logging.

# 0.1.0

- Initial release.
