package com.monster.homepage.content;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
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
                value(values, "publicSecurityNumber", ""),
                value(values, "avatarUrl", ""),
                value(values, "heroEyebrow", "Hello, world"),
                value(values, "heroTitleLine1", "构建系统，"),
                value(values, "heroTitleLine2", "沉淀知识，"),
                value(values, "heroTitleLine3", "持续进化。"),
                value(values, "heroDescription", "这里是我的技术博客、知识库、项目档案和线上实验场。"),
                value(values, "heroPrimaryText", "探索我的项目"),
                value(values, "heroPrimaryUrl", "/projects"),
                value(values, "heroSecondaryText", "了解更多"),
                value(values, "heroSecondaryUrl", "/about"),
                value(values, "heroImageUrl", ""),
                value(values, "wechat", ""),
                value(values, "wechatQrCodeUrl", ""),
                value(values, "qq", ""),
                value(values, "qqUrl", ""),
                value(values, "xiaohongshuUrl", ""),
                value(values, "douyinUrl", "")
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
        values.put("avatarUrl", request.avatarUrl());
        values.put("heroEyebrow", request.heroEyebrow());
        values.put("heroTitleLine1", request.heroTitleLine1());
        values.put("heroTitleLine2", request.heroTitleLine2());
        values.put("heroTitleLine3", request.heroTitleLine3());
        values.put("heroDescription", request.heroDescription());
        values.put("heroPrimaryText", request.heroPrimaryText());
        values.put("heroPrimaryUrl", request.heroPrimaryUrl());
        values.put("heroSecondaryText", request.heroSecondaryText());
        values.put("heroSecondaryUrl", request.heroSecondaryUrl());
        values.put("heroImageUrl", request.heroImageUrl());
        values.put("wechat", request.wechat());
        values.put("wechatQrCodeUrl", request.wechatQrCodeUrl());
        values.put("qq", request.qq());
        values.put("qqUrl", request.qqUrl());
        values.put("xiaohongshuUrl", request.xiaohongshuUrl());
        values.put("douyinUrl", request.douyinUrl());
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
