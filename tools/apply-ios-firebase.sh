#!/usr/bin/env bash
# Applies ios/App/App/GoogleService-Info.plist to the rest of the iOS config:
# the Google sign-in URL scheme, PUBLIC_GOOGLE_AUTH_IOS, and the iOS Firebase app id.
# Safe to re-run after replacing the plist.

set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

readonly PLIST=ios/App/App/GoogleService-Info.plist
readonly INFO=ios/App/App/Info.plist
readonly EXPECT_BUNDLE=doenit.app
readonly EXPECT_PROJECT=doenit2

if [[ -t 1 ]]; then RED=$'\033[0;31m' GREEN=$'\033[0;32m' YELLOW=$'\033[1;33m' NC=$'\033[0m'
else RED='' GREEN='' YELLOW='' NC=''; fi
ok()   { echo "${GREEN}✔ $*${NC}"; }
warn() { echo "${YELLOW}! $*${NC}"; }
fail() { echo "${RED}✘ $*${NC}" >&2; exit 1; }

[[ -f $PLIST ]] || fail "$PLIST not found. Download it from the Firebase console (iOS app, bundle id $EXPECT_BUNDLE)."

read -r BUNDLE PROJECT CLIENT REVERSED APP_ID < <(python3 - "$PLIST" <<'PY'
import plistlib, sys
d = plistlib.load(open(sys.argv[1], 'rb'))
keys = ("BUNDLE_ID", "PROJECT_ID", "CLIENT_ID", "REVERSED_CLIENT_ID", "GOOGLE_APP_ID")
print(*(d.get(k) or "-" for k in keys))
PY
) || fail "Could not parse $PLIST"

[[ $BUNDLE  == "$EXPECT_BUNDLE"  ]] || fail "Wrong plist: BUNDLE_ID is '$BUNDLE', expected '$EXPECT_BUNDLE'."
[[ $PROJECT == "$EXPECT_PROJECT" ]] || fail "Wrong plist: PROJECT_ID is '$PROJECT', expected '$EXPECT_PROJECT'."
ok "Plist is for $BUNDLE in $PROJECT"

# --- Google sign-in URL scheme. Without it the OAuth callback never returns to the app.
if [[ $REVERSED == "-" || $CLIENT == "-" ]]; then
    warn "No CLIENT_ID/REVERSED_CLIENT_ID in the plist, so Google sign-in is not provisioned for iOS."
    warn "Enable Google under Firebase -> Authentication -> Sign-in method, then re-download the plist."
else
    python3 - "$INFO" "$REVERSED" <<'PY'
import sys
path, reversed_id = sys.argv[1], sys.argv[2]
s = open(path).read()
placeholder = "REPLACE_WITH_REVERSED_CLIENT_ID"
if placeholder in s:
    open(path, 'w').write(s.replace(placeholder, reversed_id))
    print("  URL scheme set")
elif reversed_id in s:
    print("  URL scheme already current")
else:
    sys.exit("  Info.plist has neither the placeholder nor this REVERSED_CLIENT_ID - check it by hand")
PY
    [[ $? -eq 0 ]] || fail "Could not patch $INFO"
    ok "Info.plist URL scheme -> $REVERSED"
fi

# --- PUBLIC_GOOGLE_AUTH_IOS in the local (gitignored) env files.
if [[ $CLIENT != "-" ]]; then
    for f in .env .env.production; do
        [[ -f $f ]] || continue
        if grep -q '^PUBLIC_GOOGLE_AUTH_IOS=' "$f"; then
            python3 - "$f" "$CLIENT" <<'PY'
import re, sys
path, value = sys.argv[1], sys.argv[2]
s = open(path).read()
open(path, 'w').write(re.sub(r'^PUBLIC_GOOGLE_AUTH_IOS=.*$', f'PUBLIC_GOOGLE_AUTH_IOS={value}', s, flags=re.M))
PY
        else
            printf 'PUBLIC_GOOGLE_AUTH_IOS=%s\n' "$CLIENT" >> "$f"
        fi
        ok "$f -> PUBLIC_GOOGLE_AUTH_IOS"
    done
fi

cat <<EOF

Set these in Appflow -> Environments (local .env files are not used by Appflow):

  PUBLIC_GOOGLE_AUTH_IOS=$CLIENT
  PUBLIC_FIREBASE_APP_ID=$APP_ID    # iOS app id, replaces the android: one for iOS builds

Still to do by hand:
  - PUBLIC_APP_STORE_URL once App Store Connect gives you the numeric app id
  - APNs .p8 key: Firebase -> Project settings -> Cloud Messaging -> Apple app configuration
EOF
