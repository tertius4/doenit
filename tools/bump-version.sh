#!/usr/bin/env bash
# Bumps the build number everywhere it is declared, and optionally the marketing version.
#
#   tools/bump-version.sh          build number +1, marketing version unchanged
#   tools/bump-version.sh 2.1.0    build number +1 and marketing version -> 2.1.0
#
# Every store upload needs a higher build number than the last one, even for identical code:
# Google Play rejects a repeated versionCode, App Store Connect a repeated CFBundleVersion.
#
# This does NOT commit. Appflow builds from master, so commit and push the result yourself.

set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

readonly GRADLE=android/app/build.gradle
readonly PBXPROJ=ios/App/App.xcodeproj/project.pbxproj
readonly PKG=package.json

# ios/App/App/Info.plist is deliberately absent: it already resolves CFBundleVersion and
# CFBundleShortVersionString from $(CURRENT_PROJECT_VERSION) / $(MARKETING_VERSION).

if [[ -t 1 ]]; then RED=$'\033[0;31m' GREEN=$'\033[0;32m' YELLOW=$'\033[1;33m' BLUE=$'\033[0;34m' NC=$'\033[0m'
else RED='' GREEN='' YELLOW='' BLUE='' NC=''; fi
step() { echo "${BLUE}==> $*${NC}"; }
ok()   { echo "${GREEN}✔ $*${NC}"; }
warn() { echo "${YELLOW}! $*${NC}"; }
fail() { echo "${RED}✘ $*${NC}" >&2; exit 1; }

for f in "$GRADLE" "$PBXPROJ" "$PKG"; do
    [[ -f $f ]] || fail "Not found: $f"
done

NEW_VERSION=${1:-}
[[ -z $NEW_VERSION || $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    || fail "Invalid version '$NEW_VERSION'. Expected MAJOR.MINOR.PATCH, for example 2.1.0"

# --- Read what is there now. The pbxproj is OpenStep format, not XML, so grep rather than a
# plist parser. versionName is matched with trailing whitespace so versionNameSuffix cannot match.
readonly RE_NAME='^[[:space:]]*versionName[[:space:]]+"[^"]+"'

gradle_code=$(grep -oE '^[[:space:]]*versionCode[[:space:]]+[0-9]+' "$GRADLE" | grep -oE '[0-9]+$')
gradle_name=$(grep -oE "$RE_NAME" "$GRADLE" | sed -E 's/.*"([^"]+)"/\1/')
pkg_name=$(grep -m1 -oE '^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$PKG" | sed -E 's/.*"([^"]+)"/\1/')
mapfile -t ios_codes < <(grep -oE 'CURRENT_PROJECT_VERSION = [0-9]+;' "$PBXPROJ" | grep -oE '[0-9]+')
mapfile -t ios_names < <(grep -oE 'MARKETING_VERSION = [^;]+;' "$PBXPROJ" | sed -E 's/.*= *(.*);/\1/')

# Both Xcode build configurations (Debug and Release) carry their own copy of each key.
(( ${#ios_codes[@]} == 2 )) || fail "Expected 2 CURRENT_PROJECT_VERSION in $PBXPROJ, found ${#ios_codes[@]}"
(( ${#ios_names[@]} == 2 )) || fail "Expected 2 MARKETING_VERSION in $PBXPROJ, found ${#ios_names[@]}"
[[ -n $gradle_code && -n $gradle_name ]] || fail "Could not read versionCode/versionName from $GRADLE"
[[ -n $pkg_name ]] || fail "Could not read the version field from $PKG"

# --- Build number: one counter shared by both platforms. On drift, take the highest so a bump
# can never go backwards into a number a store has already seen.
highest=$gradle_code
for c in "${ios_codes[@]}"; do (( c > highest )) && highest=$c; done

drifted=0
for c in "${ios_codes[@]}"; do [[ $c == "$gradle_code" ]] || drifted=1; done
if (( drifted )); then
    warn "Build numbers disagree: $GRADLE has $gradle_code, $PBXPROJ has ${ios_codes[*]}"
    warn "Using the highest ($highest) as the base."
fi

next_code=$(( highest + 1 ))

# --- Marketing version: an explicit argument resolves any disagreement; without one they must match.
current_name=$gradle_name
for n in "${ios_names[@]}" "$pkg_name"; do
    [[ $n == "$gradle_name" ]] && continue
    [[ -n $NEW_VERSION ]] || fail "Marketing versions disagree ($GRADLE: $gradle_name, $PBXPROJ: ${ios_names[*]}, $PKG: $pkg_name).
  Pass the version you want to settle on, for example: npm run bump -- $gradle_name"
    current_name="(mixed)"
done

version=${NEW_VERSION:-$current_name}
set_name=0
[[ -n $NEW_VERSION && $NEW_VERSION != "$gradle_name" ]] && set_name=1
[[ -n $NEW_VERSION && $current_name == "(mixed)" ]] && set_name=1

step "Current: $current_name (build $highest)  ->  $version (build $next_code)"

# --- Write. Each edit asserts how many occurrences it replaced, so a changed file layout stops
# the script instead of leaving a half-patched project behind.
python3 - "$GRADLE" "$next_code" "$version" "$set_name" <<'PY'
import re, sys
path, code, name, set_name = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == "1"
s = open(path).read()
s, n = re.subn(r'(^[ \t]*versionCode[ \t]+)\d+', lambda m: m.group(1) + code, s, flags=re.M)
if n != 1:
    sys.exit(f"  {path}: expected 1 versionCode, replaced {n}")
if set_name:
    s, n = re.subn(r'(^[ \t]*versionName[ \t]+")[^"]+(")', lambda m: m.group(1) + name + m.group(2), s, flags=re.M)
    if n != 1:
        sys.exit(f"  {path}: expected 1 versionName, replaced {n}")
open(path, 'w').write(s)
PY
[[ $? -eq 0 ]] || fail "Could not patch $GRADLE"
ok "$GRADLE"

python3 - "$PBXPROJ" "$next_code" "$version" "$set_name" <<'PY'
import re, sys
path, code, name, set_name = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == "1"
s = open(path).read()
s, n = re.subn(r'(CURRENT_PROJECT_VERSION = )\d+;', lambda m: m.group(1) + code + ';', s)
if n != 2:
    sys.exit(f"  {path}: expected 2 CURRENT_PROJECT_VERSION, replaced {n}")
if set_name:
    s, n = re.subn(r'(MARKETING_VERSION = )[^;]+;', lambda m: m.group(1) + name + ';', s)
    if n != 2:
        sys.exit(f"  {path}: expected 2 MARKETING_VERSION, replaced {n}")
open(path, 'w').write(s)
PY
[[ $? -eq 0 ]] || fail "Could not patch $PBXPROJ"
ok "$PBXPROJ"

if (( set_name )); then
    # Patch the version line rather than re-serialising the JSON, so the file's own formatting stays.
    python3 - "$PKG" "$version" <<'PY'
import re, sys
path, name = sys.argv[1], sys.argv[2]
s = open(path).read()
s, n = re.subn(r'(^[ \t]*"version"[ \t]*:[ \t]*")[^"]+(")', lambda m: m.group(1) + name + m.group(2),
               s, count=1, flags=re.M)
if n != 1:
    sys.exit(f"  {path}: expected 1 version field, replaced {n}")
open(path, 'w').write(s)
PY
    [[ $? -eq 0 ]] || fail "Could not patch $PKG"
    ok "$PKG"
else
    echo "   $PKG unchanged (version $version)"
fi

cat <<EOF

${YELLOW}Not committed yet.${NC} Appflow builds from master, so commit and push before you build:

  git commit -am "Version $version (build $next_code)" && git push

EOF
