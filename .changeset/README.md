# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## Adding a Changeset

When you make a change that should be released, run:

```bash
bunx changeset
```

This will prompt you to:
1. Select the type of change (major, minor, patch)
2. Write a summary of the change

## Version Types

- **major**: Breaking changes (removes features, changes APIs)
- **minor**: New features (backwards compatible)
- **patch**: Bug fixes (backwards compatible)

## Releasing

When ready to release:

```bash
bunx changeset version  # Updates version and CHANGELOG.md
git add .
git commit -m "chore: version packages"
git push
```

The CI/CD pipeline will handle publishing after merging to main.

## Conventional Commits

This project also uses conventional commits. The changeset type should match your commit type:

| Commit Type | Changeset Type |
|-------------|----------------|
| `feat`      | minor          |
| `fix`       | patch          |
| `feat!`     | major          |
| `BREAKING CHANGE` | major    |
