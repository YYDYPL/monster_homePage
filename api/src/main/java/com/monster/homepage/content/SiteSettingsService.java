package com.monster.homepage.content;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SiteSettingsService {
    private final SiteSettingRepository repository;

    public SiteSettingsService(SiteSettingRepository repository) { this.repository = repository; }

    public OperationsDtos.SiteConfig getConfig() {
        Map<String, String> values = repository.findAll().stream()
                .collect(Collectors.toMap(SiteSetting::getKey, setting -> setting.getValue() == null ? "" : setting.getValue(), (a, b) -> b));
        return new OperationsDtos.SiteConfig(
                value(values, "siteName", "Monster"),
                value(values, "siteDescription", "个人技术品牌主页、博客、知识库与项目作品集"),
                value(values, "ownerName", "Monster"),
                value(values, "headline", "计算机专业 · Java / Web / 系统工程"),
                value(values, "location", "China"),
                value(values, "email", ""),
                value(values, "githubUrl", ""),
                value(values, "linkedinUrl", ""),
                value(values, "xUrl", ""),
                value(values, "footerText", "Build · Learn · Share"),
                value(values, "icpNumber", ""),
                value(values, "publicSecurityNumber", "")
        );
    }

    @Transactional
    public OperationsDtos.SiteConfig update(OperationsDtos.SiteConfig request) {
        Map<String, String> values = new LinkedHashMap<>();
        values.put("siteName", request.siteName());
        values.put("siteDescription", request.siteDescription());
        values.put("ownerName", request.ownerName());
        values.put("headline", request.headline());
        values.put("location", request.location());
        values.put("email", request.email());
        values.put("githubUrl", request.githubUrl());
        values.put("linkedinUrl", request.linkedinUrl());
        values.put("xUrl", request.xUrl());
        values.put("footerText", request.footerText());
        values.put("icpNumber", request.icpNumber());
        values.put("publicSecurityNumber", request.publicSecurityNumber());
        values.forEach((key, rawValue) -> {
            String value = rawValue == null ? "" : rawValue.trim();
            SiteSetting setting = repository.findById(key).orElseGet(() -> new SiteSetting(key, value));
            setting.setValue(value);
            repository.save(setting);
        });
        return getConfig();
    }

    private static String value(Map<String, String> values, String key, String fallback) {
        return values.getOrDefault(key, fallback);
    }
}
