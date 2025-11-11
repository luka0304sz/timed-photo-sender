# Poradnik Budowania Aplikacji - Timed Photo Sender

## Opcja 1: EAS Build (Polecane - Najłatwiejsze)

EAS (Expo Application Services) buduje aplikację w chmurze. Nie potrzebujesz Android SDK na swoim komputerze.

### Krok 1: Zaloguj się do Expo

```bash
npx eas login
```

Jeśli nie masz konta, zarejestruj się na: https://expo.dev/signup

### Krok 2: Skonfiguruj projekt

```bash
npx eas build:configure
```

### Krok 3: Zbuduj APK (Produkcja)

```bash
npx eas build --platform android --profile production
```

**Lub wersję preview (szybsza, do testów):**
```bash
npx eas build --platform android --profile preview
```

### Krok 4: Pobierz APK

Po zakończeniu buildu (10-20 minut):
1. Otrzymasz link do APK w terminalu
2. Możesz też pobrać z: https://expo.dev/accounts/[twoje-konto]/projects/react-native-boilerplate/builds
3. Skopiuj link do APK

### Krok 5: Zainstaluj na telefonie

**Metoda A - Bezpośrednio na telefonie:**
1. Otwórz link APK na telefonie Android
2. Pobierz plik APK
3. Zezwól na instalację z nieznanych źródeł (Ustawienia → Bezpieczeństwo)
4. Kliknij na pobrany APK i zainstaluj

**Metoda B - Przez ADB (jeśli telefon podłączony do PC):**
```bash
# Pobierz APK z linku do lokalnego folderu, potem:
adb install ./nazwa-pliku.apk
```

**Metoda C - Przez kabel USB:**
1. Pobierz APK na komputer
2. Podłącz telefon kablem USB
3. Skopiuj APK do folderu Download na telefonie
4. Na telefonie otwórz Menedżer plików → Download
5. Kliknij APK i zainstaluj

---

## Opcja 2: Lokalny Build (Wymaga Android SDK)

Jeśli masz zainstalowany Android SDK i chcesz budować lokalnie:

### Wymagania:
- Android Studio
- Java JDK 11 lub nowszy
- Android SDK (API 33+)
- Ustawione zmienne środowiskowe: ANDROID_HOME, JAVA_HOME

### Krok 1: Wygeneruj native code (jeśli jeszcze nie masz)

```bash
npx expo prebuild --platform android --clean
```

### Krok 2: Zbuduj APK Debug (szybkie testowanie)

```bash
cd android
./gradlew assembleDebug
```

APK znajdziesz w: `android/app/build/outputs/apk/debug/app-debug.apk`

### Krok 3: Zbuduj APK Release (produkcja)

Najpierw wygeneruj keystore (jednorazowo):

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Zapisz hasło i aliasy!

Dodaj do `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=twoje-haslo
MYAPP_RELEASE_KEY_PASSWORD=twoje-haslo
```

Zbuduj release APK:
```bash
cd android
./gradlew assembleRelease
```

APK znajdziesz w: `android/app/build/outputs/apk/release/app-release.apk`

### Krok 4: Zainstaluj na telefonie

```bash
# Przez ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Lub skopiuj plik APK i zainstaluj ręcznie (patrz Opcja 1, Krok 5)
```

---

## Opcja 3: Expo Go (Tylko Development)

**UWAGA:** Expo Go NIE wspiera niestandardowych natywnych modułów (expo-camera).
Ta opcja NIE DZIAŁA dla tej aplikacji, ponieważ używamy expo-camera.

---

## Rozwiązywanie Problemów

### EAS Build: "No development team found"
- To tylko dla iOS, możesz zignorować dla Androida

### EAS Build: "Not enough credits"
- Darmowy plan Expo daje ograniczoną liczbę buildów
- Możesz kupić więcej lub poczekać na reset miesięczny

### Lokalny build: "SDK location not found"
- Ustaw ANDROID_HOME w zmiennych środowiskowych:
  ```bash
  export ANDROID_HOME=$HOME/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

### APK nie instaluje się: "App not installed"
- Sprawdź czy masz wystarczająco miejsca na telefonie
- Odinstaluj starą wersję aplikacji jeśli istnieje
- Włącz instalację z nieznanych źródeł

### Camera nie działa po zainstalowaniu
- Sprawdź uprawnienia aplikacji w ustawieniach telefonu
- Upewnij się że APK został zbudowany z app.json zawierającym uprawnienia do kamery

---

## Rekomendacje

✅ **Zalecam Opcję 1 (EAS Build)** ponieważ:
- Najprostsza
- Nie wymaga konfiguracji Android SDK
- Automatyczne podpisywanie APK
- Łatwe budowanie na różnych platformach

Dla quick testów używaj profilu `preview`:
```bash
npx eas build -p android --profile preview
```

Dla finalnej wersji produkcyjnej:
```bash
npx eas build -p android --profile production
```
