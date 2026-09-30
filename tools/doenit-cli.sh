#!/usr/bin/env bash
# Doenit ontwikkeling CLI. Gebruik: ./tools/doenit-cli.sh [1-4]

set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

if [[ -t 1 ]]; then
    RED=$'\033[0;31m' GREEN=$'\033[0;32m' YELLOW=$'\033[1;33m' BLUE=$'\033[0;34m' NC=$'\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

readonly OUTPUT_DIR="app-output"
readonly DEV_APK="android/app/build/outputs/apk/release/app-release-signed.apk"
readonly PROD_APK="$DEV_APK"
readonly PROD_AAB="android/app/build/outputs/bundle/release/app-release-signed.aab"

step()  { echo "${BLUE}==> $*${NC}"; }
ok()    { echo "${GREEN}✔ $*${NC}"; }
warn()  { echo "${YELLOW}! $*${NC}"; }
fail()  { echo "${RED}✘ $*${NC}" >&2; return 1; }

# Voer 'n bevel uit; meld watter bevel gefaal het.
run() {
    "$@" || fail "Gefaal: $*"
}

# Lees PUBLIC_APP_ID uit 'n .env lêer.
app_id() {
    grep -m1 '^PUBLIC_APP_ID=' "$1" 2>/dev/null | cut -d= -f2- | tr -d '\r'
}

need_file() {
    [[ -f $1 ]] || fail "Lêer nie gevind nie: $1${2:+ ($2)}"
}

check_device() {
    command -v adb >/dev/null || fail "adb is nie geïnstalleer nie" || return 1
    adb devices | awk 'NR>1 && $2=="device" {found=1} END {exit !found}' \
        || fail "Geen Android toestel gekoppel nie" || return 1
}

# Installeer dependencies net wanneer nodig.
ensure_deps() {
    local marker=node_modules/.package-lock.json
    if [[ ! -f $marker || package-lock.json -nt $marker ]]; then
        step "Installeer dependencies"
        run npm i --no-fund --no-audit || return 1
    fi
}

# Kopieer omgewing-spesifieke konfigurasie (gitignored). $1 = dev|prod
use_config() {
    need_file "android/app/google-services.$1.json" || return 1
    need_file "android/app.$1.keystore" "tools/generate-production-keystore.sh" || return 1
    cp "android/app/google-services.$1.json" android/app/google-services.json
    cp "android/app.$1.keystore" android/app.keystore
}

# Web bou + Capacitor sync. $1 = dev|prod
build_web() {
    local mode=$1 node_env=development variant=development
    [[ $mode == prod ]] && node_env=production variant=production

    ensure_deps || return 1
    step "Bou web ($mode)"
    NODE_ENV=$node_env run npm run "build:$mode" || return 1
    step "Sync Capacitor"
    NODE_ENV=$node_env APP_VARIANT=$variant run npx cap sync android
}

# 1) Produksie AAB + APK
build_prod() {
    need_file .env.production "Skep dit en gebruik tools/generate-production-keystore.sh" || return 1
    use_config prod || return 1
    build_web prod || return 1

    step "Bou Android (AAB + APK)"
    NODE_ENV=production run npx cap build android || return 1

    mkdir -p "$OUTPUT_DIR"
    rm -f "$OUTPUT_DIR"/doenit.{aab,apk}
    [[ -f $PROD_AAB ]] && cp "$PROD_AAB" "$OUTPUT_DIR/doenit.aab" && ok "$OUTPUT_DIR/doenit.aab"
    [[ -f $PROD_APK ]] && cp "$PROD_APK" "$OUTPUT_DIR/doenit.apk" && ok "$OUTPUT_DIR/doenit.apk"
    ok "Produksie bou klaar. Laai doenit.aab op na Google Play Console."
}

# 3) Bou dev APK vanaf die bestaande web bou en installeer
install_dev() {
    check_device || return 1
    use_config dev || return 1

    step "Bou Android dev APK"
    NODE_ENV=development APP_VARIANT=development \
        run npx cap build android --androidreleasetype APK --signing-type apksigner || return 1
    need_file "$DEV_APK" || return 1

    mkdir -p "$OUTPUT_DIR"
    cp "$DEV_APK" "$OUTPUT_DIR/doenit-dev.apk"

    step "Installeer op toestel"
    run adb install -r "$DEV_APK" || return 1
    ok "Dev app geïnstalleer ($(app_id .env.development))"
}

# 2) Web bou + dev APK + installeer
build_and_install_dev() {
    check_device || return 1
    use_config dev || return 1
    build_web dev || return 1
    install_dev
}

# 4) App logs
view_logs() {
    check_device || return 1
    local pkg pid
    pkg=$(app_id .env.development)
    pid=$(adb shell pidof "${pkg:-doenit.app.dev}" 2>/dev/null | tr -d '\r')

    adb logcat -c
    if [[ -n $pid ]]; then
        step "Logs vir $pkg (Ctrl+C om te stop)"
        adb logcat --pid="$pid"
    else
        warn "$pkg loop nie; wys alle 'Doenit|Console' logs (Ctrl+C om te stop)"
        adb logcat | grep --line-buffered -E "Doenit|Console"
    fi
}

# Voer 'n opsie uit; Ctrl+C stop net die aksie, nie die CLI nie.
dispatch() {
    local start=$SECONDS rc=0
    case $1 in
        1) build_prod ;;
        2) build_and_install_dev ;;
        3) install_dev ;;
        4) ( trap 'exit 0' INT; view_logs ) ;;
        *) fail "Ongeldige opsie: $1" ;;
    esac || rc=$?
    (( rc == 0 )) && echo "Klaar in $(( SECONDS - start ))s" || warn "Gestop met fout (kode $rc)"
    return "$rc"
}

show_menu() {
    cat <<'EOF'

DOENIT CLI
  1) Bou produksie (AAB + APK)
  2) Bou en installeer dev (met web bou)
  3) Installeer dev (net app, geen web bou)
  4) Kyk app logs
  q) Stop
EOF
}

main() {
    if [[ $# -gt 0 ]]; then
        dispatch "$1"
        return
    fi

    local choice
    while true; do
        show_menu
        read -rp "Kies opsie: " choice || break
        [[ $choice == q || $choice == Q ]] && break
        [[ -n $choice ]] && dispatch "$choice"
    done
}

main "$@"
