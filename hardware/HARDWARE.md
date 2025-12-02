# LocknGo Hardware Specification

## 1. Master Controller Unit (MCU)
The brain of the locker station.
- **Component**: ESP32-S3-WROOM-1
- **Why**: Dual-core 240MHz, Wi-Fi + BLE 5.0, AI instructions (for future cam features), sufficient GPIOs.
- **Connectivity**: 
  - **WiFi**: Primary connection.
  - **GSM/LTE**: SIM7600 Module (UART) for fallback.
  - **Ethernet**: LAN8720 (Optional for high-stability locs).

## 2. Lock Control Board (Slave)
Controls the solenoids for the doors.
- **Architecture**: Daisy-chainable modules (RS485 or I2C).
- **Driver**: ULN2803 (Darlington Transistor Array) or MOSFETs (IRF520) to drive 12V/24V solenoids.
- **IO Expander**: MCP23017 (16 channels via I2C) allows controlling 16 locks with 2 wires.

## 3. Peripherals
- **Locks**: 12V Electromagnetic Solenoid Lock with Feedback (Reed switch) to confirm door closing.
- **Sensors**: IR Proximity Sensor (inside cell) to detect if object is left behind.
- **Cameras**: ESP32-CAM module or USB Cam if using RPi. (For "Smart Safe" feature).
- **Power Supply**: 12V 10A Industrial PSU + Lead-Acid Battery (12V 7Ah) for backup.

## 4. Schematic Overview
[ESP32] --(I2C)--> [MCP23017] --(GPIO)--> [ULN2803] --(12V)--> [Solenoids]
   |
   +--(UART)--> [SIM7600 LTE]
   |
   +--(ADC)--> [Battery Voltage Sensor]
