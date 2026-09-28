# tanstack start ts — pacote Android

Identificador do app: `com.meuapp.tanstackstartts`
Pasta web usada: `dist`

## Opção 1 — compilar de graça na nuvem (GitHub Actions)

1. Crie um repositório novo no GitHub (pode ser privado).
2. Envie TODO o conteúdo deste pacote para o repositório (inclusive a pasta oculta `.github`).
3. No repositório, abra a aba **Actions**. O fluxo "Build APK" começa sozinho — se não começar, clique em "Build APK" e depois em "Run workflow".
4. Espere terminar (normalmente 5 a 12 minutos).
5. Na execução concluída, baixe o artefato **app-debug-apk**. Dentro dele está o `app-debug.apk`.
6. Envie o APK para o celular Android, toque no arquivo e libere a instalação de "fontes desconhecidas" quando o sistema pedir.

Com git, em vez do passo 2:

```bash
git init
git add .
git commit -m "primeiro envio"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

## Opção 2 — compilar no seu computador

Precisa de Node.js 20, Java 17 e Android Studio instalados.

```bash
npm install --legacy-peer-deps
npm run build
npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Rodar só no navegador do PC

```bash
npm install --legacy-peer-deps
npm run dev
```
