cmake_minimum_required(VERSION 3.20)
project(stm32_nucleo_simulator VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)

FetchContent_Declare(
  json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.3
)

FetchContent_Declare(
  httplib
  GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
  GIT_TAG v0.18.3
)

FetchContent_MakeAvailable(json httplib)

add_executable(stm32_nucleo_simulator
  src/main.cpp
  src/board_simulator.cpp
)

target_include_directories(stm32_nucleo_simulator
  PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(stm32_nucleo_simulator
  PRIVATE
    nlohmann_json::nlohmann_json
    httplib::httplib
)

if (MSVC)
  target_compile_options(stm32_nucleo_simulator PRIVATE /W4)
else()
  target_compile_options(stm32_nucleo_simulator PRIVATE -Wall -Wextra -Wpedantic)
endif()

enable_testing()

add_test(
  NAME stm32_api_smoke
  COMMAND ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_api.sh
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

set_tests_properties(stm32_api_smoke PROPERTIES
  ENVIRONMENT "STM32_API_BASE=http://localhost:8081"
  RUN_SERIAL TRUE
)
