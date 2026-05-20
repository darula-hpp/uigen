#include "api_routes.hpp"

#include <atomic>
#include <chrono>
#include <csignal>
#include <iostream>
#include <string>
#include <thread>

namespace {

std::atomic<bool> g_running{true};

void handle_signal(int) {
  g_running = false;
}

std::string display_host(const std::string& bind_host) {
  if (bind_host == "0.0.0.0" || bind_host == "::" || bind_host.empty()) {
    return "localhost";
  }
  return bind_host;
}

}  // namespace

int main(int argc, char* argv[]) {
  std::string host = "0.0.0.0";
  int port = 8080;
  std::string openapi_path = "openapi.yaml";
  std::string web_root = "web";

  for (int i = 1; i < argc; ++i) {
    const std::string arg = argv[i];
    if (arg == "--host" && i + 1 < argc) {
      host = argv[++i];
    } else if (arg == "--port" && i + 1 < argc) {
      port = std::stoi(argv[++i]);
    } else if (arg == "--openapi" && i + 1 < argc) {
      openapi_path = argv[++i];
    } else if (arg == "--web" && i + 1 < argc) {
      web_root = argv[++i];
    }
  }

  std::signal(SIGINT, handle_signal);
  std::signal(SIGTERM, handle_signal);

  esp32::BoardSimulator simulator;
  httplib::Server server;

  server.set_default_headers({
      {"Access-Control-Allow-Origin", "*"},
      {"Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS"},
      {"Access-Control-Allow-Headers", "Content-Type"},
  });

  server.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
    res.status = 204;
  });

  esp32::register_static_routes(server, web_root);
  esp32::register_api_routes(server, simulator, openapi_path);

  server.new_task_queue = [] {
    return new httplib::ThreadPool(8);
  };

  std::thread telemetry_thread([&simulator]() {
    while (g_running.load()) {
      simulator.tick();
      std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }
  });

  const std::string url_host = display_host(host);

  std::cout << "ESP32 simulator listening on http://" << url_host << ":" << port << std::endl;
  std::cout << "Visual demo: http://" << url_host << ":" << port << "/" << std::endl;
  std::cout << "OpenAPI spec: http://" << url_host << ":" << port << "/openapi.yaml" << std::endl;

  server.listen(host, port);

  g_running = false;
  telemetry_thread.join();
  return 0;
}
