/* Throughput of uWS::protocol::isValidUtf8, the only code UWS_USE_SIMDUTF changes.
 *
 * scalar: clang++ -O3 -std=c++20 -I uWebSockets/uSockets/src -I uWebSockets/src benchmarks/utf8.cpp -o utf8-scalar
 * simd:   clang++ -O3 -std=c++20 -I uWebSockets/uSockets/src -I uWebSockets/src -DUWS_USE_SIMDUTF -I simdutf benchmarks/utf8.cpp simdutf/simdutf.cpp -o utf8-simd
 */

#include "WebSocketProtocol.h"

#include <chrono>
#include <cstdio>
#include <string>

static std::string fill(const char *unit, size_t size) {
    std::string s;
    while (s.size() + strlen(unit) <= size) s += unit;
    s.append(size - s.size(), 'a');
    return s;
}

int main() {
    /* mixed: JSON-like, one 3-byte character per ~40 bytes */
    const char *kinds[][2] = {{"ascii", "a"}, {"mixed", "{\"name\":\"value\",\"text\":\"hello \xe4\xb8\xad\"},"}, {"cjk", "\xe4\xb8\xad"}};
    size_t sizes[] = {128, 4096, 65536};

    printf("%-6s %8s %12s\n", "kind", "bytes", "MB/s");
    for (auto &kind : kinds) {
        for (size_t size : sizes) {
            std::string s = fill(kind[1], size);
            size_t iterations = (256u << 20) / size, bytes = 0;
            bool valid = true;

            auto start = std::chrono::steady_clock::now();
            for (size_t i = 0; i < iterations; i++) {
                valid &= uWS::protocol::isValidUtf8((unsigned char *) s.data(), s.size());
                bytes += s.size();
            }
            double seconds = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();

            if (!valid) {
                printf("%s payload failed validation\n", kind[0]);
                return 1;
            }
            printf("%-6s %8zu %12.0f\n", kind[0], size, bytes / seconds / (1 << 20));
        }
    }
}
