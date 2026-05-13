# Consultor Bonos — App Móvil GYC

App Android para consultar bonos de producción en espera desde la red interna.

## Estructura

```
Consultor_Bonos_Movil/
├── api/          FastAPI — conecta al ERP SQL Server
└── app/          React Native (Expo) — app Android
```

## 1. Poner en marcha la API (en el servidor 10.0.0.12)

```bash
cd api
pip install -r requirements.txt

# Rellenar .env con los datos de SQL Server
# SQLSERVER_HOST, SQLSERVER_DB, SQLSERVER_USER, SQLSERVER_PASS

uvicorn main:app --host 0.0.0.0 --port 8000
```

Verificar: http://10.0.0.12:8000/health

## 2. Desarrollar la app (en local)

```bash
cd app
npm install
npx expo start
```

Escanear el QR con la app **Expo Go** en el móvil (misma WiFi).

## 3. Generar el APK

```bash
cd app
npm install -g eas-cli
eas login          # cuenta Expo gratuita
eas build --platform android --profile preview
```

Descarga el `.apk` del enlace que genera EAS y compártelo por WhatsApp/email.

## Endpoints de la API

| Endpoint | Descripción |
|---|---|
| `GET /bonos?matricula=X&estado_bono=0&estado_orden=1` | Bonos filtrados |
| `GET /matriculas` | Matrículas distintas con bonos en espera |
| `GET /health` | Estado de la API |
