#!/usr/bin/env bash
#
# Build the deployment bundle that gets attached to a release.
#
# GitHub already attaches "Source code (zip/tar.gz)" to every release, and that is the
# whole repository: the marketing site, the CI workflows, the screenshots, the tests, the
# agent instructions. This produces the other thing — everything needed to build the image
# and run the app, and nothing else.
#
# The file list is derived from `git ls-files`, which is the safety property that matters:
# only tracked files can be included, so `.env`, the SQLite database and any local
# screenshot of real figures cannot end up in a published archive by accident. This
# repository's first rule is that no real household data reaches it; a release is the one
# place where breaking that rule would be irreversible and public.
#
# Usage: npm run pack
set -euo pipefail

cd "$(dirname "$0")/.."

version="$(node -p "require('./package.json').version")"
name="kassenknoten-${version}"
out="dist"
stage="${out}/${name}"

rm -rf "$stage" "${out}/${name}.tar.gz"
mkdir -p "$stage"

# Development-only paths. Everything else that git tracks is needed to build or to run.
#   docs/, site/, .github/  — documentation, marketing and CI
#   *.test.ts               — the suite; clone the repository to run it
#   eslint/prettier/vitest  — configuration for tools the image never invokes
#   AGENTS/CLAUDE/CURRENT_WORK — how the project is worked on, not how it is run
#   scripts/*               — except the two the setup instructions actually tell you to
#                             run: auth:hash and auth:totp
git ls-files -z | while IFS= read -r -d '' file; do
  case "$file" in
    docs/* | site/* | .github/* | .gitignore) continue ;;
    *.test.ts | *.test.tsx) continue ;;
    eslint.config.mjs | .prettierrc.json | .prettierignore | vitest.config.mts) continue ;;
    AGENTS.md | CLAUDE.md | CURRENT_WORK.md) continue ;;
    README.md) continue ;;
    scripts/*)
      case "$file" in
        scripts/hash-password.ts | scripts/totp-secret.ts) ;;
        *) continue ;;
      esac
      ;;
  esac
  mkdir -p "$stage/$(dirname "$file")"
  cp "$file" "$stage/$file"
done

# The bundle's own README. The setup instructions are lifted out of the repository README
# rather than written a second time — if that section is ever renamed, this fails loudly
# instead of quietly shipping instructions that have drifted.
run_it="$(awk '/^## Run it$/{flag=1} /^## Security$/{flag=0} flag' README.md)"
if [ -z "$run_it" ]; then
  echo "pack-release: could not find the '## Run it' section in README.md" >&2
  exit 1
fi

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
tar -tzf "${out}/${name}.tar.gz" | wc -l | xargs echo "files:"
du -h "${out}/${name}.tar.gz" | cut -f1 | xargs echo "size:"
