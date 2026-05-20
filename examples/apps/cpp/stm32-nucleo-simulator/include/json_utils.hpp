#pragma once

#include "board_simulator.hpp"

#include <nlohmann/json.hpp>
#include <string>

namespace stm32::json_util {

inline std::string pin_mode_to_string(PinMode mode) {
  switch (mode) {
    case PinMode::Input:
      return "input";
    case PinMode::Output:
      return "output";
    case PinMode::InputPullup:
      return "input_pullup";
    case PinMode::InputPulldown:
      return "input_pulldown";
    case PinMode::Analog:
      return "analog";
  }
  return "input";
}

inline PinMode pin_mode_from_string(const std::string& mode) {
  if (mode == "output") {
    return PinMode::Output;
  }
  if (mode == "input_pullup") {
    return PinMode::InputPullup;
  }
  if (mode == "input_pulldown") {
    return PinMode::InputPulldown;
  }
  if (mode == "analog") {
    return PinMode::Analog;
  }
  return PinMode::Input;
}

inline std::string pin_state_to_string(PinState state) {
  return state == PinState::High ? "high" : "low";
}

inline PinState pin_state_from_string(const std::string& state) {
  return state == "high" ? PinState::High : PinState::Low;
}

inline std::string pin_side_to_string(PinSide side) {
  return side == PinSide::Left ? "left" : "right";
}

inline std::string sensor_type_to_string(SensorType type) {
  switch (type) {
    case SensorType::Temperature:
      return "temperature";
    case SensorType::Humidity:
      return "humidity";
    case SensorType::Voltage:
      return "voltage";
    case SensorType::InternalTemperature:
      return "internal_temperature";
    case SensorType::Current:
      return "current";
  }
  return "temperature";
}

inline nlohmann::json to_json(const BoardInfo& board) {
  return {
      {"model", board.model},
      {"chip", board.chip},
      {"firmware_version", board.firmware_version},
      {"cpu_mhz", board.cpu_mhz},
      {"free_ram_bytes", board.free_ram_bytes},
      {"uptime_seconds", board.uptime_seconds},
      {"stlink_connected", board.stlink_connected},
      {"stlink_serial", board.stlink_serial},
      {"reset_cause", board.reset_cause},
  };
}

inline nlohmann::json to_json(const BoardConfig& config) {
  return {
      {"hostname", config.hostname},
      {"telemetry_interval_ms", config.telemetry_interval_ms},
      {"temperature_alert_celsius", config.temperature_alert_celsius},
      {"auto_blink_on_alert", config.auto_blink_on_alert},
      {"adc_resolution_bits", config.adc_resolution_bits},
  };
}

inline BoardConfig config_from_json(const nlohmann::json& body, const BoardConfig& current) {
  BoardConfig config = current;
  if (body.contains("hostname")) {
    config.hostname = body.at("hostname").get<std::string>();
  }
  if (body.contains("telemetry_interval_ms")) {
    config.telemetry_interval_ms = body.at("telemetry_interval_ms").get<int>();
  }
  if (body.contains("temperature_alert_celsius")) {
    config.temperature_alert_celsius = body.at("temperature_alert_celsius").get<double>();
  }
  if (body.contains("auto_blink_on_alert")) {
    config.auto_blink_on_alert = body.at("auto_blink_on_alert").get<bool>();
  }
  if (body.contains("adc_resolution_bits")) {
    config.adc_resolution_bits = body.at("adc_resolution_bits").get<int>();
  }
  return config;
}

inline nlohmann::json to_json(const Pin& pin) {
  nlohmann::json payload = {
      {"id", pin.id},
      {"name", pin.name},
      {"mode", pin_mode_to_string(pin.mode)},
      {"state", pin_state_to_string(pin.state)},
      {"supports_adc", pin.supports_adc},
      {"side", pin_side_to_string(pin.side)},
      {"row", pin.row},
  };

  if (pin.adc_voltage.has_value()) {
    payload["adc_voltage"] = pin.adc_voltage.value();
  }

  return payload;
}

inline nlohmann::json to_json(const Sensor& sensor) {
  return {
      {"id", sensor.id},
      {"name", sensor.name},
      {"type", sensor_type_to_string(sensor.type)},
      {"unit", sensor.unit},
      {"pin_id", sensor.pin_id},
      {"min_value", sensor.min_value},
      {"max_value", sensor.max_value},
  };
}

inline nlohmann::json to_json(const Reading& reading) {
  return {
      {"id", reading.id},
      {"sensor_id", reading.sensor_id},
      {"value", reading.value},
      {"unit", reading.unit},
      {"recorded_at", reading.recorded_at},
  };
}

inline nlohmann::json to_json(const SimulationEvent& event) {
  return {
      {"id", event.id},
      {"type", event.type},
      {"message", event.message},
      {"recorded_at", event.recorded_at},
  };
}

inline nlohmann::json to_json(const SensorSnapshot& snapshot) {
  nlohmann::json payload = {
      {"sensor", to_json(snapshot.sensor)},
      {"recent_readings", nlohmann::json::array()},
  };

  for (const auto& reading : snapshot.recent_readings) {
    payload["recent_readings"].push_back(to_json(reading));
  }

  if (snapshot.latest_reading.has_value()) {
    payload["latest_reading"] = to_json(snapshot.latest_reading.value());
  }

  return payload;
}

inline nlohmann::json to_json(const BoardSnapshot& snapshot) {
  nlohmann::json payload = {
      {"board", to_json(snapshot.board)},
      {"config", to_json(snapshot.config)},
      {"pins", nlohmann::json::array()},
      {"sensors", nlohmann::json::array()},
      {"events", nlohmann::json::array()},
      {"blinking", snapshot.blinking},
  };

  for (const auto& pin : snapshot.pins) {
    payload["pins"].push_back(to_json(pin));
  }
  for (const auto& sensor : snapshot.sensors) {
    payload["sensors"].push_back(to_json(sensor));
  }
  for (const auto& event : snapshot.events) {
    payload["events"].push_back(to_json(event));
  }

  return payload;
}

inline nlohmann::json error_json(const std::string& message, int status) {
  return {
      {"error", message},
      {"status", status},
  };
}

}  // namespace stm32::json_util
