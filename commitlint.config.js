/**
 * Commitlint configuration
 * Enforces conventional commit format for semantic versioning
 *
 * Format: <type>(<scope>): <subject>
 *
 * Types:
 * - feat: New feature (minor version bump)
 * - fix: Bug fix (patch version bump)
 * - docs: Documentation only
 * - style: Formatting, no code change
 * - refactor: Code restructuring, no feature change
 * - perf: Performance improvement
 * - test: Adding/updating tests
 * - chore: Maintenance tasks
 * - ci: CI/CD changes
 * - build: Build system changes
 * - revert: Revert previous commit
 *
 * Breaking changes: Add BREAKING CHANGE in footer or ! after type
 * Example: feat!: remove deprecated API
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the conventional types
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "ci",
        "build",
        "revert",
      ],
    ],
    // Type is required and must be lowercase
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    // Subject (description) requirements
    "subject-empty": [2, "never"],
    "subject-case": [2, "always", "lower-case"],
    // Don't end subject with period
    "subject-full-stop": [2, "never", "."],
    // Header (first line) max length
    "header-max-length": [2, "always", 100],
    // Body and footer formatting
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },
};
