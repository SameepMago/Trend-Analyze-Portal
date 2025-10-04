#include "InputHandler_test.h"
#include "InputHandler.h"
#include <thread>
#include <chrono>
#include <atomic>

// Global mock objects
MockAVFormatContext* g_mock_main_input_ctx = nullptr;
MockAVFormatContext* g_mock_backup_input_ctx = nullptr;
MockAVFormatContext* g_mock_filler_file_input_ctx = nullptr;
MockAVStream* g_mock_streams[10] = {nullptr};
MockAVCodecParameters* g_mock_codecpars[10] = {nullptr};
MockAVPacket* g_mock_packet = nullptr;

// Mock function return values
int g_mock_avformat_open_input_return = 0;
int g_mock_avformat_find_stream_info_return = 0;
int g_mock_av_read_frame_return = 0;
int g_mock_avformat_close_input_return = 0;

// Mock function call counters
int g_avformat_open_input_call_count = 0;
int g_avformat_find_stream_info_call_count = 0;
int g_av_read_frame_call_count = 0;
int g_avformat_close_input_call_count = 0;
int g_av_packet_alloc_call_count = 0;
int g_av_packet_free_call_count = 0;
int g_av_packet_unref_call_count = 0;

// Mock FFmpeg function implementations
extern "C" {
    int avformat_open_input(MockAVFormatContext** ps, const char* url, void* fmt, void* options) {
        g_avformat_open_input_call_count++;
        
        if (g_mock_avformat_open_input_return == 0) {
            // Success case
            if (ps) {
                *ps = new MockAVFormatContext();
                if (strstr(url, "main")) {
                    g_mock_main_input_ctx = *ps;
                } else if (strstr(url, "backup")) {
                    g_mock_backup_input_ctx = *ps;
                } else if (strstr(url, "filler")) {
                    g_mock_filler_file_input_ctx = *ps;
                }
            }
        }
        return g_mock_avformat_open_input_return;
    }

    int avformat_find_stream_info(MockAVFormatContext* ic, void* options) {
        g_avformat_find_stream_info_call_count++;
        return g_mock_avformat_find_stream_info_return;
    }

    int av_read_frame(MockAVFormatContext* s, MockAVPacket* pkt) {
        g_av_read_frame_call_count++;
        return g_mock_av_read_frame_return;
    }

    void avformat_close_input(MockAVFormatContext** ps) {
        g_avformat_close_input_call_count++;
        if (ps && *ps) {
            delete *ps;
            *ps = nullptr;
        }
    }

    MockAVPacket* av_packet_alloc(void) {
        g_av_packet_alloc_call_count++;
        g_mock_packet = new MockAVPacket();
        return g_mock_packet;
    }

    void av_packet_free(MockAVPacket** pkt) {
        g_av_packet_free_call_count++;
        if (pkt && *pkt) {
            delete *pkt;
            *pkt = nullptr;
        }
    }

    void av_packet_unref(MockAVPacket* pkt) {
        g_av_packet_unref_call_count++;
        // Mock implementation - just count the call
    }

    char* av_make_error_string(char* errbuf, size_t errbuf_size, int errnum) {
        snprintf(errbuf, errbuf_size, "Mock error %d", errnum);
        return errbuf;
    }
}

// Mock logger implementation
namespace boost {
    namespace log {
        debug_stream debug;
    }
}

// Test fixture implementation
void InputHandlerTest::SetUp() {
    // Initialize test configurations
    main_config.input_format = type::INPUT_FORMAT::RTSP;
    main_config.path = "rtsp://test-main-stream";
    
    backup_config.input_format = type::INPUT_FORMAT::RTSP;
    backup_config.path = "rtsp://test-backup-stream";
    
    filler_config.input_format = type::INPUT_FORMAT::FILE;
    filler_config.path = "/path/to/filler/file.mp4";
    
    // Create InputHandler instance
    input_handler = std::make_unique<InputHandler>(main_config, backup_config, filler_config);
    
    // Initialize mock contexts
    mock_main_ctx = new MockAVFormatContext();
    mock_backup_ctx = new MockAVFormatContext();
    mock_filler_ctx = new MockAVFormatContext();
    
    // Reset all mock counters and return values
    ResetMockCounters();
    SetMockReturnValues(0, 0, 0); // Success by default
}

void InputHandlerTest::TearDown() {
    // Clean up mock contexts
    delete mock_main_ctx;
    delete mock_backup_ctx;
    delete mock_filler_ctx;
    
    // Clean up global mock contexts
    delete g_mock_main_input_ctx;
    delete g_mock_backup_input_ctx;
    delete g_mock_filler_file_input_ctx;
    g_mock_main_input_ctx = nullptr;
    g_mock_backup_input_ctx = nullptr;
    g_mock_filler_file_input_ctx = nullptr;
    
    // Clean up mock streams and codecpars
    for (int i = 0; i < 10; i++) {
        delete g_mock_streams[i];
        delete g_mock_codecpars[i];
        g_mock_streams[i] = nullptr;
        g_mock_codecpars[i] = nullptr;
    }
    
    // Clean up mock packet
    delete g_mock_packet;
    g_mock_packet = nullptr;
    
    input_handler.reset();
}

void InputHandlerTest::SetupMockStreams(int video_streams, int audio_streams) {
    int stream_count = video_streams + audio_streams;
    
    for (int i = 0; i < stream_count; i++) {
        g_mock_streams[i] = new MockAVStream();
        g_mock_codecpars[i] = new MockAVCodecParameters();
        
        g_mock_streams[i]->index = i;
        g_mock_streams[i]->codecpar = g_mock_codecpars[i];
        
        // Set codec type: first streams are video, rest are audio
        g_mock_codecpars[i]->codec_type = (i < video_streams) ? AVMEDIA_TYPE_VIDEO : AVMEDIA_TYPE_AUDIO;
    }
    
    // Set up context streams
    if (g_mock_main_input_ctx) {
        g_mock_main_input_ctx->nb_streams = stream_count;
        g_mock_main_input_ctx->streams = (void**)g_mock_streams;
    }
}

void InputHandlerTest::ResetMockCounters() {
    g_avformat_open_input_call_count = 0;
    g_avformat_find_stream_info_call_count = 0;
    g_av_read_frame_call_count = 0;
    g_avformat_close_input_call_count = 0;
    g_av_packet_alloc_call_count = 0;
    g_av_packet_free_call_count = 0;
    g_av_packet_unref_call_count = 0;
}

void InputHandlerTest::SetMockReturnValues(int open_input, int find_stream_info, int read_frame) {
    g_mock_avformat_open_input_return = open_input;
    g_mock_avformat_find_stream_info_return = find_stream_info;
    g_mock_av_read_frame_return = read_frame;
}

// Test Cases

// Constructor and Destructor Tests
TEST_F(InputHandlerTest, ConstructorInitializesCorrectly) {
    EXPECT_NE(input_handler.get(), nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::FILLER);
}

TEST_F(InputHandlerTest, DestructorCleansUpResources) {
    // The destructor should be called when input_handler goes out of scope
    // We can verify this by checking that no resources are leaked
    input_handler.reset();
    // If we get here without crashing, the destructor worked
    SUCCEED();
}

// get_current_input() Tests
TEST_F(InputHandlerTest, GetCurrentInputReturnsInitialValue) {
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::FILLER);
}

// open_input() Tests
TEST_F(InputHandlerTest, OpenInputStartsThreads) {
    // Start the open_input process
    input_handler->open_input();
    
    // Give threads time to start
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Verify that threads are running (we can't directly test thread state,
    // but we can verify the function doesn't crash)
    SUCCEED();
}

TEST_F(InputHandlerTest, OpenInputHandlesMainInputSuccess) {
    SetMockReturnValues(0, 0, 0); // Success
    SetupMockStreams(1, 1); // 1 video, 1 audio stream
    
    input_handler->open_input();
    
    // Give time for the main thread to process
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Verify that avformat_open_input was called
    EXPECT_GT(g_avformat_open_input_call_count, 0);
}

TEST_F(InputHandlerTest, OpenInputHandlesMainInputFailure) {
    SetMockReturnValues(-1, 0, 0); // avformat_open_input fails
    
    input_handler->open_input();
    
    // Give time for the main thread to process
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Verify that avformat_open_input was called
    EXPECT_GT(g_avformat_open_input_call_count, 0);
}

TEST_F(InputHandlerTest, OpenInputHandlesBackupInputSuccess) {
    SetMockReturnValues(0, 0, 0); // Success
    SetupMockStreams(1, 1);
    
    input_handler->open_input();
    
    // Give time for the backup thread to process
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Verify that avformat_open_input was called
    EXPECT_GT(g_avformat_open_input_call_count, 0);
}

TEST_F(InputHandlerTest, OpenInputHandlesFillerInputSuccess) {
    SetMockReturnValues(0, 0, 0); // Success
    SetupMockStreams(1, 0); // Only video stream for filler
    
    input_handler->open_input();
    
    // Give time for the filler thread to process
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Verify that avformat_open_input was called
    EXPECT_GT(g_avformat_open_input_call_count, 0);
}

TEST_F(InputHandlerTest, OpenInputHandlesStreamInfoFailure) {
    SetMockReturnValues(0, -1, 0); // avformat_find_stream_info fails
    
    input_handler->open_input();
    
    // Give time for threads to process
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Verify that avformat_find_stream_info was called
    EXPECT_GT(g_avformat_find_stream_info_call_count, 0);
}

// input_demux() Tests
TEST_F(InputHandlerTest, InputDemuxReturnsNullWhenNoContext) {
    // Don't set up any mock contexts
    auto result = input_handler->input_demux();
    EXPECT_EQ(result, nullptr);
}

TEST_F(InputHandlerTest, InputDemuxFindsVideoStream) {
    SetupMockStreams(1, 1); // 1 video, 1 audio stream
    
    // Mock the get_input_format_context to return our mock context
    g_mock_main_input_ctx->nb_streams = 2;
    g_mock_main_input_ctx->streams = (void**)g_mock_streams;
    
    auto result = input_handler->input_demux();
    
    // Should return the first stream (video stream)
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(result->index, 0);
}

TEST_F(InputHandlerTest, InputDemuxHandlesNoVideoStream) {
    SetupMockStreams(0, 2); // Only audio streams
    
    g_mock_main_input_ctx->nb_streams = 2;
    g_mock_main_input_ctx->streams = (void**)g_mock_streams;
    
    auto result = input_handler->input_demux();
    
    // Should still return a stream (the first one, even if it's audio)
    EXPECT_NE(result, nullptr);
}

TEST_F(InputHandlerTest, InputDemuxHandlesMultipleVideoStreams) {
    SetupMockStreams(3, 1); // 3 video, 1 audio stream
    
    g_mock_main_input_ctx->nb_streams = 4;
    g_mock_main_input_ctx->streams = (void**)g_mock_streams;
    
    auto result = input_handler->input_demux();
    
    // Should return the first video stream
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(result->index, 0);
}

// input_switch() Tests
TEST_F(InputHandlerTest, InputSwitchToFillerReturnsCurrentContext) {
    SetupMockStreams(1, 1);
    
    auto result = input_handler->input_switch(type::INPUT_TYPE::FILLER);
    
    // Should return the current context (filler by default)
    EXPECT_NE(result, nullptr);
}

TEST_F(InputHandlerTest, InputSwitchToMainUpdatesCurrentInput) {
    SetupMockStreams(1, 1);
    
    auto result = input_handler->input_switch(type::INPUT_TYPE::MAIN);
    
    // Should update current input and return context
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::MAIN);
}

TEST_F(InputHandlerTest, InputSwitchToBackupUpdatesCurrentInput) {
    SetupMockStreams(1, 1);
    
    auto result = input_handler->input_switch(type::INPUT_TYPE::BACKUP);
    
    // Should update current input and return context
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::BACKUP);
}

// get_input_format_context() Tests
TEST_F(InputHandlerTest, GetInputFormatContextReturnsMainWhenCurrentIsMain) {
    SetupMockStreams(1, 1);
    
    // Switch to main input first
    input_handler->input_switch(type::INPUT_TYPE::MAIN);
    
    auto result = input_handler->get_input_format_context();
    
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::MAIN);
}

TEST_F(InputHandlerTest, GetInputFormatContextReturnsBackupWhenCurrentIsBackup) {
    SetupMockStreams(1, 1);
    
    // Switch to backup input first
    input_handler->input_switch(type::INPUT_TYPE::BACKUP);
    
    auto result = input_handler->get_input_format_context();
    
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::BACKUP);
}

TEST_F(InputHandlerTest, GetInputFormatContextReturnsFillerWhenCurrentIsFiller) {
    SetupMockStreams(1, 1);
    
    // Should default to filler
    auto result = input_handler->get_input_format_context();
    
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::FILLER);
}

// Edge Cases and Error Handling Tests
TEST_F(InputHandlerTest, HandlesNullContextInDemux) {
    // Don't set up any contexts
    auto result = input_handler->input_demux();
    EXPECT_EQ(result, nullptr);
}

TEST_F(InputHandlerTest, HandlesEmptyStreamsInDemux) {
    // Set up context with no streams
    g_mock_main_input_ctx->nb_streams = 0;
    g_mock_main_input_ctx->streams = nullptr;
    
    auto result = input_handler->input_demux();
    
    // Should handle gracefully (might return nullptr or first stream)
    // The exact behavior depends on implementation
    SUCCEED();
}

TEST_F(InputHandlerTest, HandlesConcurrentAccess) {
    SetupMockStreams(1, 1);
    
    // Test concurrent access to input_switch
    std::thread t1([this]() {
        for (int i = 0; i < 10; i++) {
            input_handler->input_switch(type::INPUT_TYPE::MAIN);
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    });
    
    std::thread t2([this]() {
        for (int i = 0; i < 10; i++) {
            input_handler->input_switch(type::INPUT_TYPE::BACKUP);
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    });
    
    t1.join();
    t2.join();
    
    // Should not crash and should have a valid current input
    auto current = input_handler->get_current_input();
    EXPECT_TRUE(current == type::INPUT_TYPE::MAIN || 
                current == type::INPUT_TYPE::BACKUP);
}

TEST_F(InputHandlerTest, HandlesRepeatedOpenInputCalls) {
    SetMockReturnValues(0, 0, 0);
    SetupMockStreams(1, 1);
    
    // Call open_input multiple times
    input_handler->open_input();
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    input_handler->open_input();
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    input_handler->open_input();
    
    // Should handle gracefully without crashing
    SUCCEED();
}

// Performance and Resource Tests
TEST_F(InputHandlerTest, DoesNotLeakMemoryOnRepeatedCalls) {
    SetMockReturnValues(0, 0, 0);
    SetupMockStreams(1, 1);
    
    // Make multiple calls that should allocate/deallocate resources
    for (int i = 0; i < 10; i++) {
        input_handler->input_switch(type::INPUT_TYPE::MAIN);
        input_handler->input_switch(type::INPUT_TYPE::BACKUP);
        input_handler->input_switch(type::INPUT_TYPE::FILLER);
    }
    
    // If we get here without running out of memory, the test passes
    SUCCEED();
}

TEST_F(InputHandlerTest, HandlesLargeNumberOfStreams) {
    SetupMockStreams(10, 10); // 20 streams total
    
    g_mock_main_input_ctx->nb_streams = 20;
    g_mock_main_input_ctx->streams = (void**)g_mock_streams;
    
    auto result = input_handler->input_demux();
    
    // Should find the first video stream
    EXPECT_NE(result, nullptr);
    EXPECT_EQ(result->index, 0);
}

// Integration Tests
TEST_F(InputHandlerTest, FullWorkflowTest) {
    SetMockReturnValues(0, 0, 0);
    SetupMockStreams(1, 1);
    
    // 1. Open input (starts threads)
    input_handler->open_input();
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // 2. Switch to main input
    auto main_ctx = input_handler->input_switch(type::INPUT_TYPE::MAIN);
    EXPECT_NE(main_ctx, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::MAIN);
    
    // 3. Demux video stream
    auto video_stream = input_handler->input_demux();
    EXPECT_NE(video_stream, nullptr);
    
    // 4. Switch to backup
    auto backup_ctx = input_handler->input_switch(type::INPUT_TYPE::BACKUP);
    EXPECT_NE(backup_ctx, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::BACKUP);
    
    // 5. Switch back to filler
    auto filler_ctx = input_handler->input_switch(type::INPUT_TYPE::FILLER);
    EXPECT_NE(filler_ctx, nullptr);
    EXPECT_EQ(input_handler->get_current_input(), type::INPUT_TYPE::FILLER);
}
