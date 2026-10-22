# Сборка и проверки

## Инструменты

- Node.js 20+.
- JDK 17+; подходит JBR из Android Studio.
- Android SDK: Platform 36 или новее, Build Tools 36.0.0 или новее.
- Для проверки на эмуляторе — Android SDK Platform Tools.

Сборка использует стандартные инструменты Android SDK через Node.js, без Gradle и сторонних библиотек npm. Пути к SDK и JDK задаются через `ANDROID_SDK_ROOT` (или `ANDROID_HOME`) и `JAVA_HOME`. Если они не заданы, используются стандартные каталоги Android Studio; Java также может находиться в PATH.

Пример PowerShell:

```powershell
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
npm run build:android
```

Пример Linux/macOS с установленными инструментами:

```sh
export ANDROID_SDK_ROOT="$HOME/Android/Sdk" # На macOS обычно $HOME/Library/Android/sdk
export JAVA_HOME="/path/to/jdk"
npm run build:android
```

Можно явно выбрать установленные версии: `MIFOLAB_PLATFORM=android-36` и `MIFOLAB_BUILD_TOOLS=36.0.0`. Без этих переменных выбираются последние найденные версии.

## Тестовая сборка

```sh
npm run build:android
```

Результат: `dist/mifolab-1.4.1-debug.apk`. Локальный ключ для разработки создаётся в `.local/development-signing/` и исключён из Git. Эта сборка содержит тестовый экран и инструментальные проверки.

У тестовой сборки свой ключ подписи: её следует устанавливать в отдельный эмулятор, а не поверх APK из Releases на телефоне с важным сохранённым подворьем.

## Релиз

Официальный ключ подписи в репозиторий не входит. Для подписанного релиза задайте:

- `MIFOLAB_KEYSTORE` — путь к PKCS12/JKS-хранилищу;
- `MIFOLAB_STORE_PASSWORD_FILE` — путь к файлу пароля;
- `MIFOLAB_KEY_ALIAS` — имя ключа, по умолчанию `mifolab`.

Хранилище и файл пароля должны оставаться за пределами опубликованных файлов.

```sh
npm run build:release
```

Готовый подписанный APK — `dist/mifolab.apk`, контрольная сумма — `dist/mifolab.apk.sha256`, сведения о сборке — `dist/mifolab.apk.json`. В каждом выпуске GitHub прикрепляйте APK и контрольную сумму с этими постоянными именами и отмечайте актуальный выпуск как **Latest**. Версия по-прежнему задаётся `versionName` и `versionCode` в AndroidManifest.xml, а тег выпуска имеет вид `v1.4.1`.

Постоянная ссылка для пользователей:

<https://github.com/severesoul-sys/mifolab/releases/latest/download/mifolab.apk>

После отправки проверенных исходников и тега в GitHub публикуйте сборку через GitHub CLI:

```sh
npm run publish:release -- --notes release-notes.md
```

Скрипт проверяет встроенную версию по метаданным сборки, подпись и SHA-256; загружает `mifolab.apk` и `mifolab.apk.sha256`; проверяет хеши на GitHub и лишь затем публикует новый выпуск как Latest. Повторный запуск с теми же файлами безопасен. Для проверки локальных файлов без сети: `npm run publish:release -- --check`.

Для неподписанного APK без инструментальных проверок:

```sh
npm run build:unsigned
```

## Тесты

```sh
npm test
```

Основные тесты работают без сети и игрового аккаунта. Восемь дополнительных проверок сравнивают результаты с локально предоставленными версиями клиента игры; без них эти проверки явно пропускаются. Клиент игры не включён в репозиторий и не загружается автоматически.

Для этих проверок можно задать `MIFOLAB_REFERENCE_037`, `MIFOLAB_REFERENCE_042`, `MIFOLAB_REFERENCE_044` и `MIFOLAB_REFERENCE_046` — абсолютные пути к соответствующим файлам клиента. Текущие каталоги 0.46 обновляются командой `node tools/extract-046.cjs`, которая проверяет контрольную сумму изученного файла. Исторические инструменты в `web/tools/` и `tools/extract-upgrade.cjs` оставлены для воспроизведения прежних версий; для текущего каталога их запускать не нужно.

Для инструментальной проверки запустите отдельный, предназначенный для тестов эмулятор. Посмотрите его идентификатор командой `adb devices`, затем:

```sh
npm run test:android -- emulator-5554
```

Сценарий принимает только эмулятор, устанавливает debug APK и проверяет работу интерфейса на синтетическом подворье. Данные Mifo Lab в этом эмуляторе очищаются перед проверкой. Результаты сохраняются в `dist/android-tests.txt`, снимок — в `dist/android-screen.png`. Флаг `--screenshots` сохраняет также экраны планировщика и основных разделов.

Перед публикацией исходников выполните `npm run check:publish`. Скрипт проверяет имена отслеживаемых файлов и признаки случайно включённых секретов; секретные значения в отчёт не выводятся.
