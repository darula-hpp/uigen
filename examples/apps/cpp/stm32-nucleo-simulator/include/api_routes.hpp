#pragma once

#include "board_simulator.hpp"
#include "json_utils.hpp"

#include <httplib.h>
#include <fstream>
#include <sstream>
#include <string>

namespace stm32 {

inline void register_api_routes(httplib::Server& server, BoardSimulator& simulator, const std::string& openapi_path) {
  server.Get("/health", [](const httplib::Request&, httplib::Response& res) {
    res.set_content(R"({"status":"ok"})", "application/json");
  });

  server.Get("/openapi.yaml", [openapi_path](const httplib::Request&, httplib::Response& res) {
    std::ifstream file(openapi_path);
    if (!file.is_open()) {
      res.status = 404;
      res.set_content(json_util::error_json("OpenAPI spec not found", 404).dump(2), "application/json");
      return;
    }

    std::ostringstream buffer;
    buffer << file.rdbuf();
    res.set_content(buffer.str(), "application/yaml");
  });

  server.Get("/api/v1/state", [&simulator](const httplib::Request& req, httplib::Response& res) {
    int limit = 30;
    if (req.has_param("limit")) {
      limit = std::stoi(req.get_param_value("limit"));
    }
    res.set_content(json_util::to_json(simulator.get_snapshot(limit)).dump(2), "application/json");
  });

  server.Get("/api/v1/board", [&simulator](const httplib::Request&, httplib::Response& res) {
    res.set_content(json_util::to_json(simulator.get_board_info()).dump(2), "application/json");
  });

  server.Get("/api/v1/config", [&simulator](const httplib::Request&, httplib::Response& res) {
    res.set_content(json_util::to_json(simulator.get_config()).dump(2), "application/json");
  });

  server.Put("/api/v1/config", [&simulator](const httplib::Request& req, httplib::Response& res) {
    try {
      const auto body = nlohmann::json::parse(req.body);
      simulator.update_config(json_util::config_from_json(body, simulator.get_config()));
      res.set_content(json_util::to_json(simulator.get_config()).dump(2), "application/json");
    } catch (const std::exception& ex) {
      res.status = 400;
      res.set_content(json_util::error_json(ex.what(), 400).dump(2), "application/json");
    }
  });

  server.Get("/api/v1/pins", [&simulator](const httplib::Request&, httplib::Response& res) {
    nlohmann::json payload = nlohmann::json::array();
    for (const auto& pin : simulator.list_pins()) {
      payload.push_back(json_util::to_json(pin));
    }
    res.set_content(payload.dump(2), "application/json");
  });

  server.Get(R"(/api/v1/pins/(\d+))", [&simulator](const httplib::Request& req, httplib::Response& res) {
    const int pin_id = std::stoi(req.matches[1]);
    const auto pin = simulator.get_pin(pin_id);
    if (!pin.has_value()) {
      res.status = 404;
      res.set_content(json_util::error_json("Pin not found", 404).dump(2), "application/json");
      return;
    }

    res.set_content(json_util::to_json(pin.value()).dump(2), "application/json");
  });

  server.Put(R"(/api/v1/pins/(\d+))", [&simulator](const httplib::Request& req, httplib::Response& res) {
    const int pin_id = std::stoi(req.matches[1]);

    try {
      const auto body = nlohmann::json::parse(req.body);
      const auto mode = json_util::pin_mode_from_string(body.at("mode").get<std::string>());
      std::optional<PinState> state;
      if (body.contains("state")) {
        state = json_util::pin_state_from_string(body.at("state").get<std::string>());
      }

      if (!simulator.update_pin(pin_id, mode, state)) {
        res.status = 404;
        res.set_content(json_util::error_json("Pin not found", 404).dump(2), "application/json");
        return;
      }

      const auto updated = simulator.get_pin(pin_id);
      res.set_content(json_util::to_json(updated.value()).dump(2), "application/json");
    } catch (const std::exception& ex) {
      res.status = 400;
      res.set_content(json_util::error_json(ex.what(), 400).dump(2), "application/json");
    }
  });

  server.Get("/api/v1/sensors", [&simulator](const httplib::Request&, httplib::Response& res) {
    nlohmann::json payload = nlohmann::json::array();
    for (const auto& sensor : simulator.list_sensors()) {
      payload.push_back(json_util::to_json(sensor));
    }
    res.set_content(payload.dump(2), "application/json");
  });

  server.Get(R"(/api/v1/sensors/(\d+))", [&simulator](const httplib::Request& req, httplib::Response& res) {
    const int sensor_id = std::stoi(req.matches[1]);
    const auto sensor = simulator.get_sensor(sensor_id);
    if (!sensor.has_value()) {
      res.status = 404;
      res.set_content(json_util::error_json("Sensor not found", 404).dump(2), "application/json");
      return;
    }

    res.set_content(json_util::to_json(sensor.value()).dump(2), "application/json");
  });

  server.Get(R"(/api/v1/sensors/(\d+)/readings)", [&simulator](const httplib::Request& req, httplib::Response& res) {
    const int sensor_id = std::stoi(req.matches[1]);
    if (!simulator.get_sensor(sensor_id).has_value()) {
      res.status = 404;
      res.set_content(json_util::error_json("Sensor not found", 404).dump(2), "application/json");
      return;
    }

    int limit = 100;
    if (req.has_param("limit")) {
      limit = std::stoi(req.get_param_value("limit"));
    }

    nlohmann::json payload = nlohmann::json::array();
    for (const auto& reading : simulator.list_readings(sensor_id, limit)) {
      payload.push_back(json_util::to_json(reading));
    }
    res.set_content(payload.dump(2), "application/json");
  });

  server.Post(R"(/api/v1/sensors/(\d+)/readings)", [&simulator](const httplib::Request& req, httplib::Response& res) {
    const int sensor_id = std::stoi(req.matches[1]);

    try {
      const auto reading = simulator.take_reading(sensor_id);
      res.status = 201;
      res.set_content(json_util::to_json(reading).dump(2), "application/json");
    } catch (const std::exception&) {
      res.status = 404;
      res.set_content(json_util::error_json("Sensor not found", 404).dump(2), "application/json");
    }
  });

  server.Get("/api/v1/readings", [&simulator](const httplib::Request& req, httplib::Response& res) {
    int sensor_id = 0;
    int limit = 100;

    if (req.has_param("sensor_id")) {
      sensor_id = std::stoi(req.get_param_value("sensor_id"));
    }
    if (req.has_param("limit")) {
      limit = std::stoi(req.get_param_value("limit"));
    }

    nlohmann::json payload = nlohmann::json::array();
    for (const auto& reading : simulator.list_readings(sensor_id, limit)) {
      payload.push_back(json_util::to_json(reading));
    }
    res.set_content(payload.dump(2), "application/json");
  });

  server.Post("/api/v1/actions/blink", [&simulator](const httplib::Request& req, httplib::Response& res) {
    int times = 3;
    int interval_ms = 200;

    if (!req.body.empty()) {
      try {
        const auto body = nlohmann::json::parse(req.body);
        if (body.contains("times")) {
          times = body.at("times").get<int>();
        }
        if (body.contains("interval_ms")) {
          interval_ms = body.at("interval_ms").get<int>();
        }
      } catch (const std::exception& ex) {
        res.status = 400;
        res.set_content(json_util::error_json(ex.what(), 400).dump(2), "application/json");
        return;
      }
    }

    if (!simulator.blink_led(times, interval_ms)) {
      res.status = 409;
      res.set_content(json_util::error_json("LED blink already in progress", 409).dump(2), "application/json");
      return;
    }

    res.status = 202;
    res.set_content(R"({"status":"blinking","pin_id":13})", "application/json");
  });

  server.Post("/api/v1/actions/reset", [&simulator](const httplib::Request&, httplib::Response& res) {
    simulator.reset();
    res.set_content(R"({"status":"reset_complete"})", "application/json");
  });
}

inline bool ends_with(const std::string& value, const std::string& suffix) {
  return value.size() >= suffix.size() &&
         value.compare(value.size() - suffix.size(), suffix.size(), suffix) == 0;
}

inline std::string guess_mime_type(const std::string& path) {
  if (ends_with(path, ".html")) {
    return "text/html; charset=utf-8";
  }
  if (ends_with(path, ".css")) {
    return "text/css; charset=utf-8";
  }
  if (ends_with(path, ".js")) {
    return "application/javascript; charset=utf-8";
  }
  if (ends_with(path, ".svg")) {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

inline void register_static_routes(httplib::Server& server, const std::string& web_root) {
  server.Get("/", [web_root](const httplib::Request&, httplib::Response& res) {
    std::ifstream file(web_root + "/index.html");
    if (!file.is_open()) {
      res.status = 404;
      res.set_content("Simulator UI not found", "text/plain");
      return;
    }

    std::ostringstream buffer;
    buffer << file.rdbuf();
    res.set_content(buffer.str(), "text/html; charset=utf-8");
  });

  server.Get("/simulator", [](const httplib::Request&, httplib::Response& res) {
    res.set_redirect("/");
  });

  server.Get(R"(/assets/(.*))", [web_root](const httplib::Request& req, httplib::Response& res) {
    const std::string relative_path = req.matches[1];
    const std::string file_path = web_root + "/assets/" + relative_path;
    std::ifstream file(file_path, std::ios::binary);
    if (!file.is_open()) {
      res.status = 404;
      res.set_content("Asset not found", "text/plain");
      return;
    }

    std::ostringstream buffer;
    buffer << file.rdbuf();
    res.set_content(buffer.str(), guess_mime_type(file_path));
  });
}

}  // namespace stm32
