package com.monster.homepage.content;

import com.monster.homepage.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
public class PublicOperationsController {
    private final MediaAssetRepository media;
    private final MediaStorageService storage;
    private final SiteSettingsService settings;
    private final PageViewService pageViews;

    public PublicOperationsController(MediaAssetRepository media, MediaStorageService storage,
                                      SiteSettingsService settings, PageViewService pageViews) {
        this.media = media;
        this.storage = storage;
        this.settings = settings;
        this.pageViews = pageViews;
    }

    @GetMapping("/site-config")
    public ApiResponse<OperationsDtos.SiteConfig> siteConfig() { return ApiResponse.ok(settings.getConfig()); }

    @GetMapping("/media/{storedName:.+}")
    public ResponseEntity<Resource> media(@PathVariable String storedName) {
        MediaAsset asset = media.findByStoredName(storedName).orElseThrow(() -> new NoSuchElementException("图片不存在"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .contentLength(asset.getSizeBytes())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + asset.getStoredName() + "\"")
                .body(storage.load(asset));
    }

    @PostMapping("/analytics/page-view")
    public ApiResponse<Boolean> pageView(@Valid @RequestBody OperationsDtos.PageViewRequest request,
                                         HttpServletRequest servletRequest) {
        return ApiResponse.ok(pageViews.record(request.path(), servletRequest));
    }
}
