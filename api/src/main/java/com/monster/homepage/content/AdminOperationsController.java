package com.monster.homepage.content;

import com.monster.homepage.common.ApiResponse;
import com.monster.homepage.common.PageResponse;
import jakarta.validation.Valid;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminOperationsController {
    private final MediaAssetRepository media;
    private final MediaStorageService mediaStorage;
    private final ContactMessageRepository messages;
    private final SiteSettingsService settings;
    private final PageViewService analytics;
    private final TaxonomyService taxonomy;
    private final AuditLogRepository auditLogs;

    public AdminOperationsController(MediaAssetRepository media, MediaStorageService mediaStorage,
                                     ContactMessageRepository messages, SiteSettingsService settings,
                                     PageViewService analytics, TaxonomyService taxonomy,
                                     AuditLogRepository auditLogs) {
        this.media = media;
        this.mediaStorage = mediaStorage;
        this.messages = messages;
        this.settings = settings;
        this.analytics = analytics;
        this.taxonomy = taxonomy;
        this.auditLogs = auditLogs;
    }

    @GetMapping("/media")
    public ApiResponse<PageResponse<OperationsDtos.MediaItem>> media(@RequestParam(defaultValue = "1") int page,
                                                                     @RequestParam(defaultValue = "24") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return ApiResponse.ok(PageResponse.from(media.findAll(pageable).map(AdminOperationsController::mediaItem)));
    }

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OperationsDtos.MediaItem> upload(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(mediaItem(mediaStorage.store(file)));
    }

    @DeleteMapping("/media/{id}")
    public ApiResponse<String> deleteMedia(@PathVariable UUID id) {
        mediaStorage.delete(id);
        return ApiResponse.ok("deleted");
    }

    @GetMapping("/messages")
    public ApiResponse<PageResponse<OperationsDtos.MessageItem>> messages(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) ContactMessage.MessageStatus status) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ContactMessage> result = status == null ? messages.findAll(pageable) : messages.findAllByStatus(status, pageable);
        return ApiResponse.ok(PageResponse.from(result.map(AdminOperationsController::messageItem)));
    }

    @PatchMapping("/messages/{id}")
    public ApiResponse<OperationsDtos.MessageItem> updateMessage(@PathVariable UUID id,
                                                                  @RequestBody OperationsDtos.MessageStatusRequest request) {
        if (request.status() == null) throw new IllegalArgumentException("请选择消息状态");
        ContactMessage message = messages.findById(id).orElseThrow(() -> new NoSuchElementException("联系消息不存在"));
        message.setStatus(request.status());
        return ApiResponse.ok(messageItem(messages.save(message)));
    }

    @DeleteMapping("/messages/{id}")
    public ApiResponse<String> deleteMessage(@PathVariable UUID id) {
        if (!messages.existsById(id)) throw new NoSuchElementException("联系消息不存在");
        messages.deleteById(id);
        return ApiResponse.ok("deleted");
    }

    @GetMapping("/settings")
    public ApiResponse<OperationsDtos.SiteConfig> settings() { return ApiResponse.ok(settings.getConfig()); }

    @PatchMapping("/settings")
    public ApiResponse<OperationsDtos.SiteConfig> updateSettings(@Valid @RequestBody OperationsDtos.SiteConfig request) {
        return ApiResponse.ok(settings.update(request));
    }

    @GetMapping("/analytics")
    public ApiResponse<OperationsDtos.AnalyticsSummary> analytics(@RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(analytics.summary(days));
    }

    @GetMapping("/taxonomy")
    public ApiResponse<OperationsDtos.TaxonomySummary> taxonomy() {
        return ApiResponse.ok(taxonomy.summary());
    }

    @PatchMapping("/taxonomy/{kind}")
    public ApiResponse<OperationsDtos.TaxonomySummary> renameTaxonomy(
            @PathVariable String kind,
            @Valid @RequestBody OperationsDtos.TaxonomyRenameRequest request) {
        return ApiResponse.ok(taxonomy.rename(kind, request.from(), request.to()));
    }

    @DeleteMapping("/taxonomy/{kind}")
    public ApiResponse<OperationsDtos.TaxonomySummary> deleteTaxonomy(
            @PathVariable String kind,
            @RequestParam String name) {
        return ApiResponse.ok(taxonomy.remove(kind, name));
    }

    @GetMapping("/audit-logs")
    public ApiResponse<PageResponse<OperationsDtos.AuditLogItem>> auditLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int size) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page - 1),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return ApiResponse.ok(PageResponse.from(
                auditLogs.findAll(pageable).map(AdminOperationsController::auditLogItem)
        ));
    }

    private static OperationsDtos.MediaItem mediaItem(MediaAsset asset) {
        return new OperationsDtos.MediaItem(asset.getId(), asset.getOriginalName(), asset.getContentType(), asset.getSizeBytes(), asset.getUrl(), asset.getCreatedAt());
    }

    private static OperationsDtos.MessageItem messageItem(ContactMessage message) {
        return new OperationsDtos.MessageItem(message.getId(), message.getName(), message.getEmail(), message.getSubject(), message.getMessage(), message.getStatus(), message.getCreatedAt());
    }

    private static OperationsDtos.AuditLogItem auditLogItem(AuditLog log) {
        return new OperationsDtos.AuditLogItem(
                log.getId(),
                log.getUsername(),
                log.getAction(),
                log.getResourceType(),
                log.getResourceId(),
                log.getIpAddress(),
                log.getCreatedAt()
        );
    }
}
