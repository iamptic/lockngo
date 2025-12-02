# LocknGo - Smart Locker System

This project contains the Firmware, Hardware Specification, and Full-Stack Web Application for the LocknGo Smart Locker System.

## Project Structure

- `src/index.tsx`: **The Core Application**. Contains:
  - **Backend API**: Hono framework running on Cloudflare Workers.
  - **Frontend User App**: Mobile-first booking interface (Vanilla JS + Tailwind).
  - **Frontend Admin Panel**: Full-featured dashboard (Vue 3 + Tailwind) matching "Lockers Web".
- `firmware/`: Source code for the **ESP32 Master Controller**.
- `hardware/`: **Hardware Specification** and Bill of Materials.
- `schema.sql`: Database schema for Cloudflare D1.

## How to Run

### Development
```bash
npm install
npm run db:setup
npm run dev
```
Access at `http://localhost:3001`.

### Architecture

1. **Master Controller (Firmware)**:
   - ESP32-S3 based.
   - Communicates via MQTT.
   - Controls lock boards via RS485/I2C.
   - Monitors battery & WiFi status.

2. **Backend**:
   - Cloudflare Workers (Serverless).
   - D1 Database (SQLite).
   - REST API for Client & Admin.
   - Webhook for Hardware Sync (`/api/hw/sync`).

3. **Frontend**:
   - **User App**: `/` - Scan QR, Select Size, Pay (Simulated).
   - **Admin Panel**: `/admin` - Manage Stations, Users, Tariffs. (Login: `12345`)

## Features Implemented
- **Dashboard**: Revenue, Active Rentals, Incidents.
- **Station Monitoring**: Battery, WiFi, Heartbeat status.
- **Remote Control**: Open cells remotely from Admin Panel.
- **Booking Flow**: Complete user journey (Select Station -> Select Size -> Book).
