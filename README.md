# aircraft tracker 3d

a real-time aircraft tracking application built with nuxt 3, vue 3, and cesium.js. track aircraft on an interactive 3d globe with live flight details, supporting both simulation mode and real iot sensor data.

![Aircraft Tracker Demo](https://img.shields.io/badge/Status-Live%20Demo-brightgreen)
![Nuxt 3](https://img.shields.io/badge/Nuxt-3.x-00C58E)
![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D)
![License](https://img.shields.io/badge/License-MIT-blue)

## features

- interactive 3d globe powered by cesium.js with real-time aircraft visualization
- live aircraft data with real-time position, altitude, speed, and heading
- responsive design that works on desktop and mobile
- auto-updates with live data streaming every 2 seconds
- dual mode supporting simulation or real iot sensor connection
- flight details popup when you click any aircraft
- status monitoring for tcp connection and data source

## quick start

### demo mode (zero configuration)

```bash
git clone https://github.com/wanataya/aircraft-tracker-3d.git
cd aircraft-tracker-3d
npm install
npm run dev
```

open [http://localhost:3000](http://localhost:3000) and see simulated aircraft data immediately!

### real iot sensor setup

1. configure environment variables:

   ```bash
   cp .env.example .env
   # edit .env with your iot sensor details
   ```

2. set your sensor configuration in `.env`:

   ```env
   TCP_HOST=your.sensor.ip.address
   TCP_PORT=30003
   WS_PROXY_PORT=8080
   WS_PROXY_HOST=localhost
   ```

3. start the enhanced proxy server:

   ```bash
   node enhanced-proxy.js
   ```

4. start the application:
   ```bash
   npm run dev
   ```

## requirements

- node.js 16+
- npm or yarn
- modern browser with websocket support

## configuration

the application uses environment variables for configuration:

| variable        | description           | default            |
| --------------- | --------------------- | ------------------ |
| `TCP_HOST`      | iot sensor ip address | `demo.example.com` |
| `TCP_PORT`      | iot sensor port       | `30003`            |
| `WS_PROXY_PORT` | websocket proxy port  | `8080`             |
| `WS_PROXY_HOST` | websocket proxy host  | `localhost`        |

## data format

the application expects mode s/ads-b format data:

```
MSG,3,1,1,8A0001,1,2025/07/23,10:30:00.000,2025/07/23,10:30:00.000,GIA123,35000,-6.2088,106.8456,,,,,,,0
```

## architecture

```
┌─────────────────┐    websocket   ┌────────────────┐    tcp    ┌────────────────┐
│   web browser   │ ◄────────────► │  proxy server  │ ◄───────► │   iot sensor   │
│   (vue 3 app)   │                │  (node.js/ws)  │           │ (ads-b/mode s) │
└─────────────────┘                └────────────────┘           └────────────────┘
```

## project structure

```
aircraft-tracker-3d/
├── components/             # vue components
│   ├── AircraftCard.vue
│   ├── AircraftDetails.vue
│   ├── AircraftMap3D.vue
│   └── ...
├── composables/            # vue composables
│   ├── useAppConfig.js
│   ├── useTcpClient.js
│   └── ...
├── pages/                  # nuxt pages
├── assets/                 # static assets
├── public/                 # public files
├── tcp-proxy-server.js     # websocket-to-tcp proxy
├── nuxt.config.ts          # nuxt configuration
├── .env.example            # environment template
└── README.md               # this file
```

## available scripts

```bash
# development
npm run dev          # start development server
npm run build        # build for production
npm run start        # start production server

# proxy server
node tcp-proxy-server.js    # start tcp proxy
npm run proxy              # alternative proxy start
npm run dev:full          # start both proxy and dev server
```

## troubleshooting

### connection issues

1. simulation mode working? no action needed
2. real tcp issues? check proxy server is running
3. network problems? verify firewall settings for port 8080
4. iot sensor offline? confirm sensor accessibility

### console messages

- `"TCP Client: Ready to connect..."` = good
- `"Running in simulation mode"` = no proxy server
- `"Connected to TCP proxy"` = real connection active

## contributing

1. fork the repository
2. create your feature branch (`git checkout -b feature/amazing-feature`)
3. commit your changes (`git commit -m 'Add amazing feature'`)
4. push to the branch (`git push origin feature/amazing-feature`)
5. open a pull request

## license

this project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## acknowledgments

- cesium.js for 3d globe visualization
- nuxt 3 vue.js framework
- ads-b exchange for aircraft data format reference
- mode s/ads-b aviation data standards

## support

- documentation: see [TCP-CONNECTION-GUIDE.md](TCP-CONNECTION-GUIDE.md)
- issues: [GitHub Issues](https://github.com/wanataya/aircraft-tracker-3d/issues)
- discussions: [GitHub Discussions](https://github.com/wanataya/aircraft-tracker-3d/discussions)

---

<div align="center">

**happy aircraft tracking!**

made with love using vue 3 and nuxt 3

</div>
- sample aircraft data from major cities
- aircraft info popups
- responsive design

## tech stack

- nuxt 3
- vue 3
- cesium.js (for 3d globe)
- tailwind css

that's it! simple aircraft tracker that just works.
