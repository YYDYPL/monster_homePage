package com.monster.homepage.content;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SiteSettingsServiceTest {
    @Mock
    private SiteSettingRepository repository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private SiteSettingsService service;

    @BeforeEach
    void setUp() {
        service = new SiteSettingsService(repository, passwordEncoder);
    }

    @Test
    void hashesAndTrimsANewExportKey() {
        when(repository.findAll()).thenReturn(List.of());
        when(repository.findById(anyString())).thenReturn(Optional.empty());
        when(repository.save(any(SiteSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode("strong-secret")).thenReturn("argon-hash");

        OperationsDtos.SiteConfig config = service.getConfig();
        service.update(new OperationsDtos.SiteSettingsUpdate(config, "  strong-secret  "));

        verify(passwordEncoder).encode("strong-secret");
        ArgumentCaptor<SiteSetting> captor = ArgumentCaptor.forClass(SiteSetting.class);
        verify(repository, atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues())
                .anySatisfy(setting -> {
                    assertThat(setting.getKey()).isEqualTo("exportKeyHash");
                    assertThat(setting.getValue()).isEqualTo("argon-hash");
                });
    }

    @Test
    void verifiesTheCandidateAgainstTheStoredHash() {
        when(repository.findById("exportKeyHash"))
                .thenReturn(Optional.of(new SiteSetting("exportKeyHash", "argon-hash")));
        when(passwordEncoder.matches("strong-secret", "argon-hash")).thenReturn(true);

        assertThat(service.isExportKeyConfigured()).isTrue();
        assertThat(service.verifyExportKey("  strong-secret  ")).isTrue();
    }

    @Test
    void rejectsMissingOrInvalidExportKeys() {
        when(repository.findById("exportKeyHash")).thenReturn(Optional.empty());

        assertThat(service.verifyExportKey("")).isFalse();
        assertThat(service.verifyExportKey("wrong-key")).isFalse();
        assertThat(service.isExportKeyConfigured()).isFalse();
    }
}
