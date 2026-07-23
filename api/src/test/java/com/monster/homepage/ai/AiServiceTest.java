package com.monster.homepage.ai;

import com.monster.homepage.content.SiteSetting;
import com.monster.homepage.content.SiteSettingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class AiServiceTest {
    @Mock
    private SiteSettingRepository repository;

    private final Map<String, SiteSetting> settings = new HashMap<>();
    private MockRestServiceServer server;
    private AiService service;

    @BeforeEach
    void setUp() {
        lenient().when(repository.findById(any())).thenAnswer(invocation -> Optional.ofNullable(settings.get(invocation.getArgument(0))));
        lenient().when(repository.save(any(SiteSetting.class))).thenAnswer(invocation -> {
            SiteSetting setting = invocation.getArgument(0);
            settings.put(setting.getKey(), setting);
            return setting;
        });
        lenient().doAnswer(invocation -> {
            settings.remove(invocation.getArgument(0, String.class));
            return null;
        }).when(repository).deleteById(any());

        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new AiService(repository, builder.build(), new ObjectMapper());
    }

    @Test
    void savesSettingsWithoutReturningTheApiKey() {
        AiDtos.Settings result = service.update(new AiDtos.SettingsUpdate(
                " https://example.com/v1/ ", " demo-model ", " secret-key ", false
        ));

        assertThat(result.baseUrl()).isEqualTo("https://example.com/v1/");
        assertThat(result.model()).isEqualTo("demo-model");
        assertThat(result.apiKeyConfigured()).isTrue();
        assertThat(settings.get("aiApiKey").getValue()).isEqualTo("secret-key");
        assertThat(result.toString()).doesNotContain("secret-key");
    }

    @Test
    void blankKeyKeepsTheStoredKeyAndClearRemovesIt() {
        put("aiApiKey", "existing-key");

        service.update(new AiDtos.SettingsUpdate("https://example.com/v1", "model-a", " ", false));
        assertThat(settings.get("aiApiKey").getValue()).isEqualTo("existing-key");

        AiDtos.Settings cleared = service.update(new AiDtos.SettingsUpdate(
                "https://example.com/v1", "model-a", null, true
        ));
        assertThat(cleared.apiKeyConfigured()).isFalse();
        assertThat(settings).doesNotContainKey("aiApiKey");
    }

    @Test
    void normalizesBaseUrlsAndRejectsUnsupportedSchemes() {
        assertThat(AiService.endpoint("https://example.com/v1/").toString())
                .isEqualTo("https://example.com/v1/chat/completions");
        assertThat(AiService.endpoint("http://localhost:11434/v1/chat/completions").toString())
                .isEqualTo("http://localhost:11434/v1/chat/completions");
        assertThatThrownBy(() -> AiService.endpoint("file:///tmp/model"))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_INVALID_BASE_URL"));
    }

    @Test
    void rejectsInvalidBaseUrlBeforeSavingSettings() {
        assertThatThrownBy(() -> service.update(new AiDtos.SettingsUpdate(
                "file:///tmp/model", "model-a", "secret-key", false
        )))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_INVALID_BASE_URL"));

        assertThat(settings).isEmpty();
    }

    @Test
    void generatesAndNormalizesASummaryThroughChatCompletions() {
        configure();
        server.expect(once(), requestTo("https://example.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer secret-key"))
                .andExpect(jsonPath("$.model").value("demo-model"))
                .andExpect(jsonPath("$.stream").value(false))
                .andExpect(jsonPath("$.messages[1].content").value(org.hamcrest.Matchers.containsString("知识库笔记")))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"content":"摘要： **这是一段测试摘要。**\\n- 包含[核心事实](https://example.com)。"}}]}
                        """, MediaType.APPLICATION_JSON));

        AiDtos.TextResult result = service.summarize(new AiDtos.SummaryRequest(
                AiDtos.ContentType.NOTE, "测试笔记", "这里是正文"
        ));

        assertThat(result.text()).isEqualTo("这是一段测试摘要。 包含核心事实。");
        server.verify();
    }

    @Test
    void stripsAnOuterMarkdownFenceFromGeneratedPostBody() {
        configure();
        server.expect(requestTo("https://example.com/v1/chat/completions"))
                .andExpect(jsonPath("$.messages[1].content").value(org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("文章标题：标题"),
                        org.hamcrest.Matchers.containsString("写一篇文章")
                )))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"content":"```markdown\\n# 标题\\n\\n正文\\n```"}}]}
                        """, MediaType.APPLICATION_JSON));

        AiDtos.TextResult result = service.generatePostBody(new AiDtos.PostBodyRequest("标题", "写一篇文章"));

        assertThat(result.text()).isEqualTo("# 标题\n\n正文");
    }

    @Test
    void mapsAuthenticationAndUpstreamErrors() {
        configure();
        server.expect(requestTo("https://example.com/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> service.test(new AiDtos.TestRequest(null, null, null)))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_AUTH_FAILED"));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer secondServer = MockRestServiceServer.bindTo(builder).build();
        AiService secondService = new AiService(repository, builder.build(), new ObjectMapper());
        secondServer.expect(requestTo("https://example.com/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        assertThatThrownBy(() -> secondService.test(new AiDtos.TestRequest(null, null, null)))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_UPSTREAM_ERROR"));
    }

    @Test
    void rejectsEmptyResponsesAndMissingSettings() {
        assertThatThrownBy(() -> service.test(new AiDtos.TestRequest(null, null, null)))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_NOT_CONFIGURED"));

        configure();
        server.expect(requestTo("https://example.com/v1/chat/completions"))
                .andRespond(withSuccess("{\"choices\":[]}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> service.test(new AiDtos.TestRequest(null, null, null)))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_EMPTY_RESPONSE"));
    }

    @Test
    void rejectsSummaryThatIsEmptyAfterPlainTextNormalization() {
        configure();
        server.expect(requestTo("https://example.com/v1/chat/completions"))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"content":"***"}}]}
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.summarize(new AiDtos.SummaryRequest(
                AiDtos.ContentType.POST, "标题", "正文"
        )))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_EMPTY_RESPONSE"));
    }

    @Test
    void mapsSocketTimeouts() {
        configure();
        RestClient timeoutClient = RestClient.builder().requestFactory((URI uri, HttpMethod method) -> {
            throw new SocketTimeoutException("timed out");
        }).build();
        AiService timeoutService = new AiService(repository, timeoutClient, new ObjectMapper());

        assertThatThrownBy(() -> timeoutService.test(new AiDtos.TestRequest(null, null, null)))
                .isInstanceOfSatisfying(AiServiceException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AI_TIMEOUT"));
    }

    private void configure() {
        put("aiBaseUrl", "https://example.com/v1");
        put("aiModel", "demo-model");
        put("aiApiKey", "secret-key");
    }

    private void put(String key, String value) {
        settings.put(key, new SiteSetting(key, value));
    }
}
