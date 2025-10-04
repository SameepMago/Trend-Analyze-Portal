#pragma once

#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <memory>
#include <atomic>
#include <thread>
#include <mutex>
#include <chrono>

// Mock FFmpeg functions
extern "C" {
    // Mock AVFormatContext
    struct MockAVFormatContext {
        int nb_streams = 0;
        void** streams = nullptr;
        int64_t duration = 0;
        int bit_rate = 0;
        char* filename = nullptr;
    };

    // Mock AVStream
    struct MockAVStream {
        int index = 0;
        void* codecpar = nullptr;
    };

    // Mock AVCodecParameters
    struct MockAVCodecParameters {
        int codec_type = 0; // AVMEDIA_TYPE_VIDEO = 0, AVMEDIA_TYPE_AUDIO = 1
    };

    // Mock AVPacket
    struct MockAVPacket {
        int64_t pts = 0;
        int64_t dts = 0;
        uint8_t* data = nullptr;
        int size = 0;
    };

    // Global mock objects
    extern MockAVFormatContext* g_mock_main_input_ctx;
    extern MockAVFormatContext* g_mock_backup_input_ctx;
    extern MockAVFormatContext* g_mock_filler_file_input_ctx;
    extern MockAVStream* g_mock_streams[10];
    extern MockAVCodecParameters* g_mock_codecpars[10];
    extern MockAVPacket* g_mock_packet;

    // Mock function return values
    extern int g_mock_avformat_open_input_return;
    extern int g_mock_avformat_find_stream_info_return;
    extern int g_mock_av_read_frame_return;
    extern int g_mock_avformat_close_input_return;

    // Mock function call counters
    extern int g_avformat_open_input_call_count;
    extern int g_avformat_find_stream_info_call_count;
    extern int g_av_read_frame_call_count;
    extern int g_avformat_close_input_call_count;
    extern int g_av_packet_alloc_call_count;
    extern int g_av_packet_free_call_count;
    extern int g_av_packet_unref_call_count;

    // Mock FFmpeg function declarations
    int avformat_open_input(MockAVFormatContext** ps, const char* url, void* fmt, void* options);
    int avformat_find_stream_info(MockAVFormatContext* ic, void* options);
    int av_read_frame(MockAVFormatContext* s, MockAVPacket* pkt);
    void avformat_close_input(MockAVFormatContext** ps);
    MockAVPacket* av_packet_alloc(void);
    void av_packet_free(MockAVPacket** pkt);
    void av_packet_unref(MockAVPacket* pkt);
    char* av_make_error_string(char* errbuf, size_t errbuf_size, int errnum);

    // Constants
    #define AVMEDIA_TYPE_VIDEO 0
    #define AVMEDIA_TYPE_AUDIO 1
    #define AV_ERROR_MAX_STRING_SIZE 64
}

// Mock InputHandler dependencies
namespace type {
    enum class INPUT_TYPE {
        MAIN,
        BACKUP,
        FILLER
    };

    enum class INPUT_FORMAT {
        RTSP,
        FILE,
        UDP
    };
}

// Mock InputConfig
struct InputConfig {
    type::INPUT_FORMAT input_format;
    std::string path;
};

// Mock logger
namespace boost {
    namespace log {
        class debug_stream {
        public:
            template<typename T>
            debug_stream& operator<<(const T& value) {
                return *this;
            }
        };
        extern debug_stream debug;
    }
}

// Forward declaration of InputHandler
class InputHandler;

// Test fixture class
class InputHandlerTest : public ::testing::Test {
protected:
    void SetUp() override;
    void TearDown() override;
    
    // Helper methods
    void SetupMockStreams(int video_streams, int audio_streams);
    void ResetMockCounters();
    void SetMockReturnValues(int open_input, int find_stream_info, int read_frame);
    
    // Test data
    std::unique_ptr<InputHandler> input_handler;
    InputConfig main_config;
    InputConfig backup_config;
    InputConfig filler_config;
    
    // Mock contexts
    MockAVFormatContext* mock_main_ctx;
    MockAVFormatContext* mock_backup_ctx;
    MockAVFormatContext* mock_filler_ctx;
};
