#!/usr/bin/env bash
#
# Build the deployment bundle that gets attached to a release.
#
# GitHub already attaches "Source code (zip/tar.gz)" to every release, and that is the
# whole repository: the marketing site, the CI workflows, the screenshots, the tests, the
# agent instructions. This produces the other thing — everything needed to build the image
# and run the app, and nothing else.
#
# The contents come from `git archive HEAD`, not from the working tree, and that is the
# property worth having twice over. Only committed files can be included, so a local
# experiment, an uncommitted config line, `.env`, the SQLite database or a screenshot of
# real figures cannot reach a published archive by accident — and what ships is exactly
# what the tag says it is. This repository's first rule is that no real household data
# enters it, and a release is the one place where breaking that rule would be public and
# permanent.
#
# Usage: npm run pack [ref]     (ref defaults to HEAD)
set -euo pipefail

cd "$(dirname "$0")/.."

ref="${1:-HEAD}"
version="$(node -p "require('./package.json').version")"
name="kassenknoten-${version}"
out="dist"
stage="${out}/${name}"

rm -rf "$stage" "${out}/${name}.tar.gz"
mkdir -p "$stage"

git archive --format=tar "$ref" | tar -x -C "$stage"

# The bundle's README. The setup instructions are lifted out of the repository README
# rather than written a second time — if that section is ever renamed, this fails loudly
# instead of quietly shipping instructions that have drifted.
run_it="$(awk '/^## Run it$/{flag=1} /^## Security$/{flag=0} flag' "$stage/README.md")"
if [ -z "$run_it" ]; then
  echo "pack-release: could not find the '## Run it' section in README.md" >&2
  exit 1
fi

# Development-only paths. Everything else the repository tracks is needed to build or run.
#   docs/, site/, .github/     documentation, marketing and CI
#   *.test.ts                  the suite; clone the repository to run it
#   eslint/prettier/vitest     configuration for tools the image never invokes
#   AGENTS/CLAUDE/CURRENT_WORK how the project is worked on, not how it is run
#   scripts/*                  except the two the setup instructions tell you to run
rm -rf \
  "$stage/docs" "$stage/site" "$stage/.github" "$stage/.gitignore" \
  "$stage/eslint.config.mjs" "$stage/.prettierrc.json" "$stage/.prettierignore" \
  "$stage/vitest.config.mts" \
  "$stage/AGENTS.md" "$stage/CLAUDE.md" "$stage/CURRENT_WORK.md"
find "$stage" -name '*.test.ts' -o -name '*.test.tsx' | xargs -r rm -f
find "$stage/scripts" -type f \
  ! -name 'hash-password.ts' ! -name 'totp-secret.ts' -delete

{
  echo "# KassenKnoten ${version}"
  echo
  echo "Self-hosted household finance planner. This archive holds everything needed to"
  echo "build and run it — the application, the Dockerfile, the compose file and the two"
  echo "setup scripts. Tests, documentation, the landing page and the CI workflows are not"
  echo "in here; clone the repository for those."
  echo
  echo "- Repository: <https://github.com/jankln/KassenKnoten>"
  echo "- What it does: <https://jankln.github.io/KassenKnoten/>"
  echo "- Licence: MIT, see LICENSE"
  echo
  echo "${run_it}"
} > "$stage/README.md"

tar -czf "${out}/${name}.tar.gz" -C "$out" "$name"
rm -rf "$stage"

echo "${out}/${name}.tar.gz"
tar -tzf "${out}/${name}.tar.gz" | grep -vc '/$' | xargs echo "files:"
du -h "${out}/${name}.tar.gz" | cut -f1 | xargs echo "size:"
