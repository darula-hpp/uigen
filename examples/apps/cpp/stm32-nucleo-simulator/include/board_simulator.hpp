#pragma once

#include <chrono>
#include <cstdint>
#include <mutex>
#include <optional>
#include <string>
#include <vector>

namespace stm32 {

enum class PinMode { Input, Output, InputPullup, InputPulldown, Analog };

enum class PinState { Low, High };

enum class PinSide { Left, Right };

struct Pin {
  int id;
  std::string name;
  PinMode mode;
  PinState state;
  bool supports_adc;
  std::optional<double> adc_voltage;
  PinSide side;
  int row;
};

enum class SensorType { Temperature, Humidity, Voltage, InternalTemperature, Current };

struct Sensor {
  int id;
  std::string name;
  SensorType type;
  std::string unit;
  int pin_id;
  double min_value;
  double max_value;
};

struct Reading {
  int id;
  int sensor_id;
  double value;
  std::string unit;
  std::string recorded_at;
};

struct BoardInfo {
  std::string model;
  std::string chip;
  std::string firmware_version;
  int cpu_mhz;
  int free_ram_bytes;
  int uptime_seconds;
  bool stlink_connected;
  std::string stlink_serial;
  std::string reset_cause;
};

struct BoardConfig {
  std::string hostname;
  int telemetry_interval_ms;
  double temperature_alert_celsius;
  bool auto_blink_on_alert;
  int adc_resolution_bits;
};

struct SimulationEvent {
  int id;
  std::string type;
  std::string message;
  std::string recorded_at;
};

struct SensorSnapshot {
  Sensor sensor;
  std::optional<Reading> latest_reading;
  std::vector<Reading> recent_readings;
};

struct BoardSnapshot {
  BoardInfo board;
  BoardConfig config;
  std::vector<Pin> pins;
  std::vector<SensorSnapshot> sensors;
  std::vector<SimulationEvent> events;
  bool blinking;
};

class BoardSimulator {
 public:
  BoardSimulator();

  BoardInfo get_board_info() const;
  BoardConfig get_config() const;
  void update_config(const BoardConfig& config);

  std::vector<Pin> list_pins() const;
  std::optional<Pin> get_pin(int pin_id) const;
  bool update_pin(int pin_id, PinMode mode, std::optional<PinState> state);

  std::vector<Sensor> list_sensors() const;
  std::optional<Sensor> get_sensor(int sensor_id) const;

  std::vector<Reading> list_readings(int sensor_id, int limit) const;
  Reading take_reading(int sensor_id);

  bool blink_led(int times, int interval_ms);
  void reset();

  BoardSnapshot get_snapshot(int reading_limit = 30) const;
  void tick();

 private:
  mutable std::mutex mutex_;
  BoardInfo board_;
  BoardConfig config_;
  std::vector<Pin> pins_;
  std::vector<Sensor> sensors_;
  std::vector<Reading> readings_;
  std::vector<SimulationEvent> events_;
  int next_reading_id_;
  int next_event_id_;
  bool blinking_;
  std::chrono::steady_clock::time_point started_at_;
  std::chrono::steady_clock::time_point last_telemetry_at_;

  void initialize_pins();
  void initialize_sensors();
  void record_event_locked(const std::string& type, const std::string& message);
  void record_event(const std::string& type, const std::string& message);
  double simulate_sensor_value(const Sensor& sensor) const;
  std::string now_iso8601() const;
  int uptime_seconds() const;
};

}  // namespace stm32
