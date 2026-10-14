# Changelog

## 0.1.0 — MVP

- Initial React and React Flow graph editor, graph schema v1, validation, JSON import/export, and history helpers.
- Package versions use semantic versioning. Public API and schema breaking changes require a major version after 1.0. Schema migrations will be explicit and versioned.

## Version policy

Before 1.0, minor releases may change APIs while the project stabilizes. Persisted schema changes always increment `schemaVersion`; unsupported versions fail clearly rather than being guessed or silently transformed.
