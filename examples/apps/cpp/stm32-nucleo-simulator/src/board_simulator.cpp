#include "board_simulator.hpp"

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <random>
#include <sstream>
#include <stdexcept>
#include <thread>

namespace stm32 {
namespace {

constexpr int kLedPinId = 13;

std::mt19937& rng() {
  static std::mt19937 engine{42};
  return engine;
}

}  // namespace

BoardSimulator::BoardSimulator()
    : next_reading_id_(1),
      next_event_id_(1),
      blinking_(false),
      started_at_(std::chrono::steady_clock::now()),
      last_telemetry_at_(started_at_) {
  board_ = {
      "NUCLEO-F411RE",
      "STM32F411RET6",
      "1.0.0-sim",
      96,
      98304,
      0,
      true,
      "066AFF123456",
      "power_on",
  };

  config_ = {
      "stm32-nucleo-simulator",
      2000,
      45.0,
      true,
      12,
  };

  initialize_pins();
  initialize_sensors();
  record_event("boot", "STM32 Nucleo simulator started");

  for (const auto& sensor : sensors_) {
    take_reading(sensor.id);
  }
}

void BoardSimulator::initialize_pins() {
  const struct PinDefinition {
    int id;
    const char* name;
    PinMode mode;
    PinState state;
    bool adc;
    PinSide side;
    int row;
  } definitions[] = {
      {0, "D0 (PA3)", PinMode::Input, PinState::Low, false, PinSide::Left, 0},
      {1, "D1 (PA2)", PinMode::Input, PinState::Low, false, PinSide::Left, 1},
      {2, "D2 (PA10)", PinMode::Output, PinState::Low, false, PinSide::Left, 2},
      {3, "D3 (PB3)", PinMode::Output, PinState::Low, false, PinSide::Left, 3},
      {4, "D4 (PB5)", PinMode::Output, PinState::Low, false, PinSide::Left, 4},
      {5, "D5 (PB4)", PinMode::Output, PinState::Low, false, PinSide::Left, 5},
      {6, "D6 (PB10)", PinMode::Output, PinState::Low, false, PinSide::Left, 6},
      {7, "D7 (PA8)", PinMode::Input, PinState::Low, false, PinSide::Left, 7},
      {8, "D8 (PA9)", PinMode::Input, PinState::Low, false, PinSide::Left, 8},
      {9, "D9 (PC7)", PinMode::Input, PinState::Low, false, PinSide::Left, 9},
      {10, "D10 (PB6)", PinMode::Output, PinState::Low, false, PinSide::Left, 10},
      {11, "D11 (PA7)", PinMode::Output, PinState::Low, false, PinSide::Left, 11},
      {12, "D12 (PA6)", PinMode::Output, PinState::Low, false, PinSide::Left, 12},
      {13, "D13 (PA5 / LD2)", PinMode::Output, PinState::Low, false, PinSide::Left, 13},
      {14, "D14 (PB9 / I2C SDA)", PinMode::InputPullup, PinState::High, false, PinSide::Left, 14},
      {15, "D15 (PB8 / I2C SCL)", PinMode::InputPullup, PinState::High, false, PinSide::Left, 15},
      {100, "A0 (PA0 / 4-20mA)", PinMode::Analog, PinState::Low, true, PinSide::Right, 0},
      {101, "A1 (PA1 / Supply)", PinMode::Analog, PinState::Low, true, PinSide::Right, 1},
      {102, "A2 (PA4)", PinMode::Analog, PinState::Low, true, PinSide::Right, 2},
      {103, "A3 (PB0)", PinMode::Analog, PinState::Low, true, PinSide::Right, 3},
      {104, "A4 (PC1)", PinMode::Analog, PinState::Low, true, PinSide::Right, 4},
      {105, "A5 (PC0)", PinMode::Analog, PinState::Low, true, PinSide::Right, 5},
      {113, "B1 (PC13 / User Button)", PinMode::InputPullup, PinState::High, false, PinSide::Right, 6},
  };

  pins_.clear();
  for (const auto& definition : definitions) {
    Pin pin{
        definition.id,
        definition.name,
        definition.mode,
        definition.state,
        definition.adc,
        definition.adc ? std::optional<double>(0.0) : std::nullopt,
        definition.side,
        definition.row,
    };
    pins_.push_back(pin);
  }
}

void BoardSimulator::initialize_sensors() {
  sensors_ = {
      {1, "Internal Die Temperature", SensorType::InternalTemperature, "C", 0, 20.0, 85.0},
      {2, "SHT31 Temperature", SensorType::Temperature, "C", 14, -40.0, 85.0},
      {3, "SHT31 Humidity", SensorType::Humidity, "%", 14, 0.0, 100.0},
      {4, "4-20mA Loop Input", SensorType::Current, "mA", 100, 4.0, 20.0},
      {5, "Supply Rail Monitor", SensorType::Voltage, "V", 101, 0.0, 3.3},
  };
}

void BoardSimulator::record_event_locked(const std::string& type, const std::string& message) {
  events_.push_back(SimulationEvent{
      next_event_id_++,
      type,
      message,
      now_iso8601(),
  });

  if (events_.size() > 100) {
    events_.erase(events_.begin(), events_.begin() + (events_.size() - 100));
  }
}

void BoardSimulator::record_event(const std::string& type, const std::string& message) {
  std::lock_guard<std::mutex> lock(mutex_);
  record_event_locked(type, message);
}

BoardInfo BoardSimulator::get_board_info() const {
  std::lock_guard<std::mutex> lock(mutex_);
  BoardInfo info = board_;
  info.uptime_seconds = uptime_seconds();
  info.free_ram_bytes = std::max(65536, 98304 - (uptime_seconds() * 28));
  return info;
}

BoardConfig BoardSimulator::get_config() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return config_;
}

void BoardSimulator::update_config(const BoardConfig& config) {
  std::lock_guard<std::mutex> lock(mutex_);
  config_ = config;
  record_event_locked("config", "Board configuration updated");
}

std::vector<Pin> BoardSimulator::list_pins() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return pins_;
}

std::optional<Pin> BoardSimulator::get_pin(int pin_id) const {
  std::lock_guard<std::mutex> lock(mutex_);
  for (const auto& pin : pins_) {
    if (pin.id == pin_id) {
      return pin;
    }
  }
  return std::nullopt;
}

bool BoardSimulator::update_pin(int pin_id, PinMode mode, std::optional<PinState> state) {
  std::lock_guard<std::mutex> lock(mutex_);
  for (auto& pin : pins_) {
    if (pin.id != pin_id) {
      continue;
    }

    pin.mode = mode;
    if (state.has_value()) {
      pin.state = state.value();
    }

    if (pin.supports_adc) {
      pin.adc_voltage = simulate_sensor_value(
          Sensor{0, "", SensorType::Voltage, "V", pin.id, 0.0, 3.3});
    }

    record_event_locked(
        "pin",
        pin.name + " set to " + (pin.state == PinState::High ? "HIGH" : "LOW"));
    return true;
  }

  return false;
}

std::vector<Sensor> BoardSimulator::list_sensors() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return sensors_;
}

std::optional<Sensor> BoardSimulator::get_sensor(int sensor_id) const {
  std::lock_guard<std::mutex> lock(mutex_);
  for (const auto& sensor : sensors_) {
    if (sensor.id == sensor_id) {
      return sensor;
    }
  }
  return std::nullopt;
}

std::vector<Reading> BoardSimulator::list_readings(int sensor_id, int limit) const {
  std::lock_guard<std::mutex> lock(mutex_);
  std::vector<Reading> filtered;
  for (const auto& reading : readings_) {
    if (sensor_id <= 0 || reading.sensor_id == sensor_id) {
      filtered.push_back(reading);
    }
  }

  if (limit > 0 && static_cast<int>(filtered.size()) > limit) {
    filtered.erase(filtered.begin(), filtered.end() - limit);
  }

  return filtered;
}

Reading BoardSimulator::take_reading(int sensor_id) {
  std::lock_guard<std::mutex> lock(mutex_);
  for (const auto& sensor : sensors_) {
    if (sensor.id != sensor_id) {
      continue;
    }

    Reading reading{
        next_reading_id_++,
        sensor.id,
        simulate_sensor_value(sensor),
        sensor.unit,
        now_iso8601(),
    };

    readings_.push_back(reading);
    if (readings_.size() > 500) {
      readings_.erase(readings_.begin(), readings_.begin() + (readings_.size() - 500));
    }

    record_event_locked("sensor", sensor.name + " sampled at " + std::to_string(reading.value) + reading.unit);
    return reading;
  }

  throw std::runtime_error("Sensor not found");
}

bool BoardSimulator::blink_led(int times, int interval_ms) {
  {
    std::lock_guard<std::mutex> lock(mutex_);
    if (blinking_) {
      return false;
    }
    blinking_ = true;
    record_event_locked("action", "Blinking LD2 on PA5 (D13)");
  }

  std::thread([this, times, interval_ms]() {
    for (int i = 0; i < times; ++i) {
      update_pin(kLedPinId, PinMode::Output, PinState::High);
      std::this_thread::sleep_for(std::chrono::milliseconds(interval_ms));
      update_pin(kLedPinId, PinMode::Output, PinState::Low);
      std::this_thread::sleep_for(std::chrono::milliseconds(interval_ms));
    }

    {
      std::lock_guard<std::mutex> lock(mutex_);
      blinking_ = false;
      record_event_locked("action", "LD2 blink sequence finished");
    }
  }).detach();

  return true;
}

void BoardSimulator::reset() {
  std::lock_guard<std::mutex> lock(mutex_);
  started_at_ = std::chrono::steady_clock::now();
  last_telemetry_at_ = started_at_;
  readings_.clear();
  events_.clear();
  next_reading_id_ = 1;
  next_event_id_ = 1;
  blinking_ = false;
  board_.reset_cause = "software";
  initialize_pins();
  initialize_sensors();
  record_event_locked("reset", "Simulator state reset to defaults");
}

BoardSnapshot BoardSimulator::get_snapshot(int reading_limit) const {
  std::lock_guard<std::mutex> lock(mutex_);

  BoardSnapshot snapshot;
  snapshot.board = board_;
  snapshot.board.uptime_seconds = uptime_seconds();
  snapshot.board.free_ram_bytes = std::max(65536, 98304 - (uptime_seconds() * 28));
  snapshot.config = config_;
  snapshot.pins = pins_;
  snapshot.events = events_;
  snapshot.blinking = blinking_;

  for (const auto& sensor : sensors_) {
    SensorSnapshot sensor_snapshot;
    sensor_snapshot.sensor = sensor;

    std::vector<Reading> recent;
    for (const auto& reading : readings_) {
      if (reading.sensor_id == sensor.id) {
        recent.push_back(reading);
      }
    }

    if (recent.size() > static_cast<size_t>(reading_limit)) {
      recent.erase(recent.begin(), recent.end() - reading_limit);
    }

    sensor_snapshot.recent_readings = recent;
    if (!recent.empty()) {
      sensor_snapshot.latest_reading = recent.back();
    }

    snapshot.sensors.push_back(sensor_snapshot);
  }

  return snapshot;
}

void BoardSimulator::tick() {
  std::lock_guard<std::mutex> lock(mutex_);
  const auto now = std::chrono::steady_clock::now();
  const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - last_telemetry_at_);
  if (elapsed.count() < config_.telemetry_interval_ms) {
    return;
  }

  last_telemetry_at_ = now;
  for (const auto& sensor : sensors_) {
    Reading reading{
        next_reading_id_++,
        sensor.id,
        simulate_sensor_value(sensor),
        sensor.unit,
        now_iso8601(),
    };
    readings_.push_back(reading);
  }

  if (readings_.size() > 500) {
    readings_.erase(readings_.begin(), readings_.begin() + (readings_.size() - 500));
  }

  for (auto& pin : pins_) {
    if (pin.supports_adc) {
      pin.adc_voltage = simulate_sensor_value(
          Sensor{0, "", SensorType::Voltage, "V", pin.id, 0.0, 3.3});
    }
  }

  const auto temp_reading = simulate_sensor_value(sensors_[0]);
  if (config_.auto_blink_on_alert && temp_reading >= config_.temperature_alert_celsius) {
    record_event_locked("alert", "Die temperature exceeded alert threshold");
  }
}

double BoardSimulator::simulate_sensor_value(const Sensor& sensor) const {
  const double phase = uptime_seconds() / 10.0;
  std::uniform_real_distribution<double> noise(-0.5, 0.5);

  switch (sensor.type) {
    case SensorType::InternalTemperature:
      return 42.0 + (std::sin(phase) * 3.0) + noise(rng());
    case SensorType::Temperature:
      return 23.5 + (std::sin(phase / 2.0) * 3.5) + noise(rng());
    case SensorType::Humidity:
      return 48.0 + (std::cos(phase / 3.0) * 8.0) + noise(rng());
    case SensorType::Voltage:
      return 3.24 + (std::sin(phase / 4.0) * 0.08) + (noise(rng()) * 0.02);
    case SensorType::Current:
      return 12.0 + (std::sin(phase / 5.0) * 3.5) + noise(rng());
  }

  return 0.0;
}

std::string BoardSimulator::now_iso8601() const {
  const auto now = std::chrono::system_clock::now();
  const auto time = std::chrono::system_clock::to_time_t(now);
  std::tm tm{};
  gmtime_r(&time, &tm);

  std::ostringstream stream;
  stream << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
  return stream.str();
}

int BoardSimulator::uptime_seconds() const {
  const auto now = std::chrono::steady_clock::now();
  return static_cast<int>(std::chrono::duration_cast<std::chrono::seconds>(now - started_at_).count());
}

}  // namespace stm32
