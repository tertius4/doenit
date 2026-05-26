#!/bin/bash

# Kleure vir uitset
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # Geen kleur

# Haal repo root
repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root"

# Source helper functions
source ./tools/functions.sh 2>/dev/null || echo "Waarskuwing: functions.sh nie gevind nie"

# Get package name based on environment
get_package_name() {
    local env_file=".env.development"
    if [ -f "$env_file" ]; then
        local app_id=$(grep "^PUBLIC_APP_ID=" "$env_file" | cut -d'=' -f2)
        echo "${app_id:-doenit.app}"
    else
        echo "doenit.app"
    fi
}

# Helper function: Show invalid option error
show_invalid_option() {
    echo -e "${RED}Ongeldige opsie${NC}"
}

# Main menu
show_menu() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                   DOENIT ONTWIKKELING CLI                        ║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════╦══════════════════════════════╣${NC}"
    echo -e "${CYAN}║ ${YELLOW}1.${NC} Web Ontwikkeling (npm run dev) ${CYAN}║ ${YELLOW}5.${NC} Bou en Installeer (dev)   ${CYAN}║${NC}"
    echo -e "${CYAN}║ ${YELLOW}2.${NC} Firebase Functions Bestuur     ${CYAN}║ ${YELLOW}6.${NC} Toestel Bestuur           ${CYAN}║${NC}"
    echo -e "${CYAN}║ ${YELLOW}3.${NC} Bou en installeer (dev net app)${CYAN}║ ${YELLOW}7.${NC} Widget Debug              ${CYAN}║${NC}"
    echo -e "${CYAN}║ ${YELLOW}4.${NC} Bou App (produksie)            ${CYAN}║ ${YELLOW}8.${NC} App Logs Kyk              ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════╩══════════════════════════════╝${NC}"
    echo ""
}

# Hoof loop
main() {
    while true; do
        show_menu
        read -p "Kies 'n opsie (1-8): " choice
        echo ""
        
        case $choice in
            1) start_web_dev ;;
            2) manage_functions ;;
            3) build_and_install_only_app ;;
            4) build_app ;;
            5) build_and_install ;;
            6) device_management ;;
            7) widget_debug ;;
            8) view_app_logs ;;
            *) 
                echo -e "${RED}Ongeldige opsie. Probeer weer.${NC}"
                sleep 1
                ;;
        esac
        
        echo ""
        read -p "Druk Enter om voort te gaan..."
        clear
    done
}

# Web development
start_web_dev() {
    echo -e "${BLUE} 🌐 Begin web ontwikkeling server...${NC}"
    npm run dev
}

# Functions management
manage_functions() {
    echo -e "${PURPLE} 🔥 Firebase Functions Bestuur${NC}"
    echo "1. Start functions emulator"
    echo "2. Deploy functions (produksie)"
    echo "3. Deploy functions (ontwikkeling)"
    echo "4. View functions logs"
    read -p "Kies opsie: " func_choice
    
    case $func_choice in
        1) run_firebase_command "serve" "Begin functions emulator" ;;
        2) run_firebase_command "deploy" "Deploy functions (produksie)" ;;
        3) run_firebase_command "deploy-dev" "Deploy functions (ontwikkeling)" ;;
        4) run_firebase_command "logs" "Kyk functions logs" ;;
        *) show_invalid_option ;;
    esac
}

# Install dependencies
build_and_install_only_app() {
    echo -e "${BLUE}📱 Bou Android debug APK...${NC}"
    export NODE_ENV=development
    # cd android
    if npx cap build android --androidreleasetype "APK" --signing-type "apksigner"; then
    # if ./gradlew assembleDebug; then
        echo -e "${GREEN} ✅ Debug APK gebou${NC}"
        
        # # Find the APK file
        APK_PATH="android/app/build/outputs/apk/release/app-release-signed.apk"
        # APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
        if [ -f "$APK_PATH" ]; then
            echo -e "${BLUE}📲 Installeer op toestel...${NC}"
            if adb install -r "$APK_PATH"; then
                echo -e "${GREEN} ✅ Ontwikkeling app geïnstalleer${NC}"
                echo -e "${CYAN}App ID: doenit.app.dev${NC}"
                echo -e "${CYAN}App Naam: Doenit Dev${NC}"
            else
                echo -e "${RED} ❌ Installasie gefaal${NC}"
                # cd ..
                return 1
            fi
        else
            echo -e "${RED} ❌ APK lêer nie gevind nie: $APK_PATH${NC}"
        #     cd ..
            return 1
        fi
    else
        echo -e "${RED} ❌ APK bou gefaal${NC}"
    #     cd ..
        return 1
    fi
    # cd ..
    unset NODE_ENV
    
    # Copy to app-output for convenience
    mkdir -p app-output
    cp android/app/build/outputs/apk/debug/app-debug.apk app-output/doenit-dev.apk 2>/dev/null || true
    echo -e "${GREEN} 🎉 Ontwikkeling app gereed!${NC}"
}

# Bou app (produksie)
build_app() {
    echo -e "${PURPLE} 🏗️ Bou produksie app...${NC}"
    
    # Load production environment
    if [ ! -f ".env.production" ]; then
        echo -e "${RED} ❌ .env.production file nie gevind nie${NC}"
        echo -e "${YELLOW}Eerste keer produksie bou? Volg hierdie stappe:${NC}"
        echo "1. Skep produksie keystore: ${CYAN}./tools/generate-production-keystore.sh${NC}"
        echo "2. Redigeer .env.production met jou produksie waardes"
        echo "3. Skep Firebase app vir produksie (doenit.app)"
        echo "4. Laai af google-services.json vir produksie app"
        return 1
    fi
    
    # Check if production keystore exists
    if [ ! -f "android/app.keystore" ]; then
        echo -e "${RED} ❌ Produksie keystore nie gevind nie${NC}"
        echo -e "Skep dit met: ${CYAN}./tools/generate-production-keystore.sh${NC}"
        return 1
    fi
    
    echo -e "${BLUE} 📦 Installeer dependencies...${NC}"
    npm i --no-fund --no-audit || {
        echo -e "${RED} ❌ npm install failed${NC}"
        return 1
    }

    cp android/app/google-services.prod.json android/app/google-services.json
    cp android/app.prod.keystore android/app.keystore

    echo -e "${BLUE} 🏗️ Bou Svelte vir produksie...${NC}"
    NODE_ENV=production npm run build:prod || {
        echo -e "${RED} ❌ Production build failed${NC}"
        return 1
    }
    
    echo -e "${BLUE} 🔄 Sync Capacitor...${NC}"
    NODE_ENV=production npx cap sync || {
        echo -e "${RED} ❌ Capacitor sync failed${NC}"
        return 1
    }
    
    echo -e "${BLUE} 📱 Bou Android produksie AAB...${NC}"
    NODE_ENV=production npx cap build android || {
        echo -e "${RED} ❌ Android build failed${NC}"
        return 1
    }
    
    echo -e "${BLUE} 📁 Kopieer uitset lêers...${NC}"
    mkdir -p app-output
    rm -f app-output/doenit.aab app-output/doenit.apk
    
    # Copy AAB file
    if [ -f "android/app/build/outputs/bundle/release/app-release-signed.aab" ]; then
        cp android/app/build/outputs/bundle/release/app-release-signed.aab app-output/doenit.aab
        echo -e "${GREEN} ✅ doenit.aab geskep${NC}"
    fi
    
    # Copy APK file if it exists
    if [ -f "android/app/build/outputs/apk/release/app-release-signed.apk" ]; then
        cp android/app/build/outputs/apk/release/app-release-signed.apk app-output/doenit.apk
        echo -e "${GREEN} ✅ doenit.apk geskep${NC}"
    fi
    
    echo -e "${GREEN} 🎉 Produksie app gebou! Lêers in app-output/ gids.${NC}"
    echo -e "${CYAN} 📤 Laai doenit.aab op na Google Play Console${NC}"
}

# Bou en installeer ontwikkeling weergawe
build_and_install() {
    if ! check_device_connected; then
        return 1
    fi
    
    echo -e "${BLUE} 🏗️ Bou en installeer ontwikkeling weergawe...${NC}"
    
    echo -e "${BLUE} 📦 Installeer dependencies...${NC}"
    npm i --no-fund --no-audit || {
        echo -e "${RED} ❌ npm install failed${NC}"
        return 1
    }

    cp android/app/google-services.dev.json android/app/google-services.json
    cp android/app.dev.keystore android/app.keystore

    echo -e "${BLUE} 🏗️ Bou Svelte vir ontwikkeling...${NC}"
    NODE_ENV=development npm run build:dev || {
        echo -e "${RED} ❌ Development build failed${NC}"
        return 1
    }
    
    echo -e "${BLUE} 🔄 Sync Capacitor...${NC}"
    NODE_ENV=development npx cap sync || {
        echo -e "${RED} ❌ Capacitor sync failed${NC}"
        return 1
    }
    
    build_and_install_only_app || {
        return 1
    }
}

# Check of toestel gekoppel is
check_device_connected() {
    if ! command -v adb &> /dev/null; then
        echo -e "${RED} ❌ ADB nie geïnstalleer nie${NC}"
        return 1
    fi
    
    if ! adb devices | grep -q "device$"; then
        echo -e "${YELLOW} ⚠️ Geen Android toestel opgespoor nie${NC}"
        echo "Koppel 'n toestel en probeer weer"
        return 1
    fi
    
    echo -e "${GREEN} ✅ Toestel gekoppel${NC}"
    return 0
}

# Helper function: Run Firebase command
run_firebase_command() {
    local command=$1
    local description=$2
    echo -e "${PURPLE} 🔥 ${description}...${NC}"
    (cd functions && npm run "$command")
}

# Toestel bestuur (kombineer koppel help en status)
device_management() {
    echo -e "${CYAN}📱 Toestel Status${NC}"
    if check_device_connected; then
        echo ""
        echo -e "${BLUE}Toestel inligting:${NC}"
        adb shell getprop ro.product.model
        adb shell getprop ro.build.version.release
        echo ""
        echo -e "${BLUE}App status:${NC}"
        
        # Check for production app
        if adb shell pm list packages | grep -q "doenit.app$"; then
            echo -e "${GREEN} ✅ Produksie app geïnstalleer (doenit.app)${NC}"
            adb shell dumpsys package "doenit.app" | grep versionName || echo "Kan nie versie kry nie"
        else
            echo -e "${RED} ❌ Produksie app nie geïnstalleer nie${NC}"
        fi
        
        # Check for development app
        if adb shell pm list packages | grep -q "doenit.app.dev"; then
            echo -e "${GREEN} ✅ Ontwikkeling app geïnstalleer (doenit.app.dev)${NC}"
            adb shell dumpsys package "doenit.app.dev" | grep versionName || echo "Kan nie versie kry nie"
        else
            echo -e "${RED} ❌ Ontwikkeling app nie geïnstalleer nie${NC}"
        fi
    fi  
}

# Widget debug (oorspronklike funksionaliteit)
widget_debug() {
    echo -e "${YELLOW} 🔧 Widget Debug Mode${NC}"
    if ! check_device_connected; then
        return
    fi
    
    echo "1. Toets widget aksies (dev package)"
    echo "2. Toets widget aksies (prod package)"
    read -p "Kies opsie: " widget_choice
    
    case $widget_choice in
        1)
            echo -e "${BLUE}Toets widget aksies vir ontwikkeling app...${NC}"
            local dev_package=$(get_package_name)
            adb shell am broadcast -a "COMPLETE_TASK" -e "task_id" "test_task_123" -n "${dev_package}/app.doenit.TaskWidgetProvider"
            ;;
        2)
            echo -e "${BLUE}Toets widget aksies vir produksie app...${NC}"
            adb shell am broadcast -a "COMPLETE_TASK" -e "task_id" "test_task_123" -n "app.doenit.TaskWidgetProvider"
            ;;
        *)
            show_invalid_option
            ;;
    esac
}

# App logs kyk
view_app_logs() {
    if ! check_device_connected; then
        return
    fi
    
    echo -e "${BLUE} 📋 Kyk app logs (Ctrl+C om te stop)...${NC}"
    echo -e "${CYAN}Monitoring beide produksie (doenit.app) en ontwikkeling (doenit.app.dev) apps${NC}"
    adb logcat -c
    adb logcat | grep -E "(Doenit|Console)"
}

# Begin CLI
clear
main
