#pragma once

#include "board_simulator.hpp"
#include "json_utils.hpp"

#include <httplib.h>
#include <nlohmann/json.hpp>
#include <chrono>
#include <functional>
#include <string>
#include <thread>

namespace esp32 {

namespace detail {

inline int sensor_id_from_subscribe(const std::string& msg) {
  if (msg.empty()) {
    return 0;
  }

  try {
    const auto body = nlohmann::json::parse(msg);
    if (body.contains("sensor_id")) {
      return body.at("sensor_id").get<int>();
    }
    if (body.contains("params") && body.at("params").contains("sensor_id")) {
      return body.at("params").at("sensor_id").get<int>();
    }
  } catch (const std::exception&) {
    return 0;
  }

  return 0;
}

inline void stream_json(
    httplib::ws::WebSocket& ws,
    BoardSimulator& simulator,
    const std::function<nlohmann::json()>& payload,
    int interval_ms) {
  while (ws.is_open()) {
    if (!ws.send(payload().dump())) {
      break;
    }
    std::this_thread::sleep_for(std::chrono::milliseconds(interval_ms));
  }
}

}  // namespace detail

inline void register_ws_routes(httplib::Server& server, BoardSimulator& simulator) {
  const int stream_interval_ms = 500;

  server.WebSocket("/ws/v1/board", [&simulator, stream_interval_ms](
                                      const httplib::Request&,
                                      httplib::ws::WebSocket& ws) {
    detail::stream_json(
        ws,
        simulator,
        [&simulator]() { return json_util::to_json(simulator.get_board_info()); },
        stream_interval_ms);
  });

  server.WebSocket("/ws/v1/state", [&simulator, stream_interval_ms](
                                     const httplib::Request&,
                                     httplib::ws::WebSocket& ws) {
    detail::stream_json(
        ws,
        simulator,
        [&simulator]() { return json_util::to_json(simulator.get_snapshot(30)); },
        stream_interval_ms);
  });

  server.WebSocket("/ws/v1/pins", [&simulator, stream_interval_ms](
                                    const httplib::Request&,
                                    httplib::ws::WebSocket& ws) {
    detail::stream_json(
        ws,
        simulator,
        [&simulator]() {
          nlohmann::json payload = nlohmann::json::array();
          for (const auto& pin : simulator.list_pins()) {
            payload.push_back(json_util::to_json(pin));
          }
          return payload;
        },
        stream_interval_ms);
  });

  server.WebSocket("/ws/v1/sensors", [&simulator, stream_interval_ms](
                                       const httplib::Request&,
                                       httplib::ws::WebSocket& ws) {
    detail::stream_json(
        ws,
        simulator,
        [&simulator]() {
          nlohmann::json payload = nlohmann::json::array();
          for (const auto& sensor : simulator.list_sensors()) {
            payload.push_back(json_util::to_json(sensor));
          }
          return payload;
        },
        stream_interval_ms);
  });

  server.WebSocket("/ws/v1/readings", [&simulator, stream_interval_ms](
                                          const httplib::Request&,
                                          httplib::ws::WebSocket& ws) {
    std::string subscribe_msg;
    if (ws.read(subscribe_msg)) {
      // UIGen may send subscribe JSON immediately after the socket opens.
    }

    const int sensor_id = detail::sensor_id_from_subscribe(subscribe_msg);
    constexpr int limit = 100;

    detail::stream_json(
        ws,
        simulator,
        [&simulator, sensor_id]() {
          nlohmann::json payload = nlohmann::json::array();
          for (const auto& reading : simulator.list_readings(sensor_id, limit)) {
            payload.push_back(json_util::to_json(reading));
          }
          return payload;
        },
        stream_interval_ms);
  });

  server.WebSocket(R"(/ws/v1/pins/(\d+))", [&simulator, stream_interval_ms](
                                                 const httplib::Request& req,
                                                 httplib::ws::WebSocket& ws) {
    const int pin_id = std::stoi(req.matches[1]);
    detail::stream_json(
        ws,
        simulator,
        [&simulator, pin_id]() {
          const auto pin = simulator.get_pin(pin_id);
          if (!pin.has_value()) {
            return json_util::error_json("Pin not found", 404);
          }
          return json_util::to_json(pin.value());
        },
        stream_interval_ms);
  });

  server.WebSocket(R"(/ws/v1/sensors/(\d+))", [&simulator, stream_interval_ms](
                                                    const httplib::Request& req,
                                                    httplib::ws::WebSocket& ws) {
    const int sensor_id = std::stoi(req.matches[1]);
    detail::stream_json(
        ws,
        simulator,
        [&simulator, sensor_id]() {
          const auto sensor = simulator.get_sensor(sensor_id);
          if (!sensor.has_value()) {
            return json_util::error_json("Sensor not found", 404);
          }
          return json_util::to_json(sensor.value());
        },
        stream_interval_ms);
  });

  server.WebSocket(R"(/ws/v1/sensors/(\d+)/readings)", [&simulator, stream_interval_ms](
                                                           const httplib::Request& req,
                                                           httplib::ws::WebSocket& ws) {
    const int sensor_id = std::stoi(req.matches[1]);
    constexpr int limit = 100;
    detail::stream_json(
        ws,
        simulator,
        [&simulator, sensor_id]() {
          nlohmann::json payload = nlohmann::json::array();
          for (const auto& reading : simulator.list_readings(sensor_id, limit)) {
            payload.push_back(json_util::to_json(reading));
          }
          return payload;
        },
        stream_interval_ms);
  });
}

}  // namespace esp32
