# security & configuration

this document outlines the security measures implemented to prepare this repository for public access.

## what was secured

### 1. hardcoded ip addresses

**before**: iot sensor ip address was hardcoded in multiple files
**after**: replaced with environment variables and demo defaults

**files changed**:

- `composables/useTcpClient.js` - tcp configuration
- `components/SensorStatus.vue` - default props
- `tcp-proxy-server.js` - server configuration
- `TCP-CONNECTION-GUIDE.md` - documentation

### 2. environment variable system

created a comprehensive environment variable system:

- `.env.example` - template showing required variables
- `.env` - actual configuration (git-ignored)
- `composables/useAppConfig.js` - configuration management
- updated `nuxt.config.ts` with runtime config

### 3. default demo configuration

when no environment variables are set, the app uses safe demo values:

- `TCP_HOST`: `demo.example.com` (non-functional demo address)
- `TCP_PORT`: `30003`
- `WS_PROXY_HOST`: `localhost`
- `WS_PROXY_PORT`: `8080`

## environment variables

### required for real iot connection

```env
TCP_HOST=your.sensor.ip.address
TCP_PORT=30003
WS_PROXY_PORT=8080
WS_PROXY_HOST=localhost
```

### optional public variables

```env
NUXT_PUBLIC_APP_NAME=Aircraft Tracker 3D
NUXT_PUBLIC_APP_DESCRIPTION=A 3D aircraft tracking system
```

## files protected by .gitignore

the following sensitive files are automatically excluded from git:

- `.env` - local environment variables
- `.env.local` - local overrides
- `.env.production` - production configuration
- `.env.development` - development configuration

## setup scripts

two convenience scripts are provided:

- `setup-env.sh` - bash script for linux/macos
- `setup-env.ps1` - powershell script for windows

these scripts:

1. check if `.env` exists
2. copy from `.env.example` if needed
3. show current configuration (masked)
4. provide setup instructions

## benefits

1. security: no hardcoded credentials in public repository
2. flexibility: easy configuration for different environments
3. demo-ready: works out of the box with simulation data
4. production-ready: simple environment variable configuration
5. documentation: clear setup instructions for users

## usage

### for demo/development

```bash
npm install
npm run dev
```

### for production with real iot sensor

```bash
cp .env.example .env
# edit .env with your sensor details
npm install
npm run dev
```

## migration from hardcoded values

old hardcoded configuration:

```javascript
const tcpConfig = {
  host: "your.private.ip", // exposed private ip
  port: 30003,
};
```

new environment-based configuration:

```javascript
const { config } = useAppConfig();
const tcpConfig = {
  host: config.tcp.host, // from environment variables
  port: config.tcp.port,
};
```

this ensures sensitive configuration stays private while maintaining full functionality.
