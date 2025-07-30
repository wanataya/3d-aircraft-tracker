# aircraft tracker 3d - tcp connection setup

## overview

this application tracks aircraft in real-time using a 3d globe visualization powered by cesium.js and connects to iot sensors via tcp.

## tcp connection options

### option 1: simulation mode (current default)

the application runs in simulation mode by default, generating aircraft data for testing purposes.

- works immediately
- uses indonesian aircraft data
- centered on indonesia
- updates every 2 seconds

### option 2: real tcp connection via proxy

to connect to your real IoT sensor, you need to run a tcp proxy server.

#### setup instructions:

1. **configure environment variables**:

   create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

   edit `.env` and set your IoT sensor details:

   ```env
   TCP_HOST=your.sensor.ip.address
   TCP_PORT=30003
   WS_PROXY_PORT=8080
   WS_PROXY_HOST=localhost
   ```

2. **install dependencies** (already done):

   ```powershell
   npm install
   ```

3. **start the tcp proxy server**:

   **Option A - Using npm script:**

   ```powershell
   npm run proxy
   ```

   **Option B - Direct Node.js (if npm script fails):**

   ```powershell
   node tcp-proxy-server.js
   ```

   Both commands start a websocket-to-tcp proxy on `localhost:8080`

4. **start the web application**:

   ```powershell
   npm run dev
   ```

   the web app runs on `localhost:3001`

5. **or run both together**:
   ```powershell
   npm run dev:full
   ```
   this starts both the proxy and web app simultaneously

#### how it works:

- browser connects to websocket proxy (`ws://localhost:8080`)
- proxy forwards data between websocket and tcp (configured IoT sensor)
- real-time aircraft data flows from iot sensor to your 3d map

## current status

the application is currently running in **simulation mode** because:

- web browsers cannot make direct tcp connections (security restriction)
- the tcp proxy server is not yet running

## features

- **3d globe**: interactive cesium.js visualization
- **aircraft tracking**: real-time position updates
- **tcp integration**: connect to iot sensors
- **status panel**: connection monitoring
- **indonesia focus**: default location and aircraft data
- **auto-reconnect**: handles connection failures

## quick start

1. open browser to: `http://localhost:3001/`
2. check the status panel for connection info
3. aircraft will appear on the 3d globe
4. for real tcp data, follow the proxy setup above

## data format

the application expects mode s/ads-b format data from the tcp sensor:

```
MSG,3,1,1,8A0001,1,2025/07/23,10:30:00.000,2025/07/23,10:30:00.000,GIA123,35000,-6.2088,106.8456,,,,,,,0
```

## troubleshooting

### "can't connect" issues:

1. **simulation mode**: working by default, no action needed
2. **real tcp**: ensure proxy server is running
   - Try: `npm run proxy`
   - Or: `node tcp-proxy-server.js`
3. **network**: check firewall settings for localhost:8080
4. **iot sensor**: verify your configured sensor address is accessible

### console messages:

- `"tcp client: ready to connect to iot sensor at [your-sensor-ip]:[port]"` = good
- `"running in simulation mode"` = no proxy server
- `"connected to tcp proxy"` = real connection active
