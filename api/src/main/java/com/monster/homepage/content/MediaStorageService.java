package com.monster.homepage.content;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.HexFormat;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class MediaStorageService {
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/gif", ".gif",
            "image/webp", ".webp"
    );

    private final Path root;
    private final long maxSizeBytes;
    private final MediaAssetRepository repository;
    private final PostRepository posts;
    private final ProjectRepository projects;

    public MediaStorageService(@Value("${app.storage.path:./uploads}") String storagePath,
                               MediaAssetRepository repository,
                               PostRepository posts,
                               ProjectRepository projects,
                               @Value("${app.storage.max-file-size:20MB}") DataSize maxSize) {
        this.root = Path.of(storagePath).toAbsolutePath().normalize();
        this.repository = repository;
        this.posts = posts;
        this.projects = projects;
        this.maxSizeBytes = maxSize.toBytes();
        try {
            Files.createDirectories(root);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to initialize media storage", exception);
        }
    }

    public MediaAsset store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("请选择要上传的图片");
        if (file.getSize() > maxSizeBytes) throw new IllegalArgumentException("图片大小不能超过 " + DataSize.ofBytes(maxSizeBytes).toMegabytes() + "MB");
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length > maxSizeBytes) {
                throw new IllegalArgumentException("\u56fe\u7247\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc7 " + DataSize.ofBytes(maxSizeBytes).toMegabytes() + "MB");
            }
            String contentType = detectContentType(bytes);
            String extension = EXTENSIONS.get(contentType);
            if (extension == null) throw new IllegalArgumentException("仅支持 JPEG、PNG、GIF 和 WebP 图片");
            String storedName = UUID.randomUUID().toString().replace("-", "") + extension;
            Path target = safePath(storedName);
            Files.write(target, bytes, StandardOpenOption.CREATE_NEW);

            MediaAsset asset = new MediaAsset();
            String originalName = file.getOriginalFilename();
            String safeOriginalName = originalName == null ? "" : originalName.replace("\\", "/");
            int separator = safeOriginalName.lastIndexOf('/');
            asset.setOriginalName(safeOriginalName.isBlank() ? storedName : safeOriginalName.substring(separator + 1));
            asset.setStoredName(storedName);
            asset.setContentType(contentType);
            asset.setSizeBytes(bytes.length);
            asset.setUrl("/api/media/" + storedName);
            try {
                return repository.save(asset);
            } catch (RuntimeException exception) {
                Files.deleteIfExists(target);
                throw exception;
            }
        } catch (IOException exception) {
            throw new IllegalStateException("图片保存失败", exception);
        }
    }

    public Resource load(MediaAsset asset) {
        try {
            Resource resource = new UrlResource(safePath(asset.getStoredName()).toUri());
            if (!resource.exists() || !resource.isReadable()) throw new NoSuchElementException("图片文件不存在");
            return resource;
        } catch (MalformedURLException exception) {
            throw new NoSuchElementException("图片文件不存在");
        }
    }

    public void delete(UUID id) {
        MediaAsset asset = repository.findById(id).orElseThrow(() -> new NoSuchElementException("媒体文件不存在"));
        if (posts.existsByCoverImageUrl(asset.getUrl()) || projects.existsByImageUrl(asset.getUrl())) {
            throw new IllegalArgumentException("该图片仍被文章封面或项目引用，无法删除");
        }
        try {
            Files.deleteIfExists(safePath(asset.getStoredName()));
        } catch (IOException exception) {
            throw new IllegalStateException("图片删除失败", exception);
        }
        repository.delete(asset);
    }

    private Path safePath(String storedName) {
        Path target = root.resolve(storedName).normalize();
        if (!target.startsWith(root)) throw new IllegalArgumentException("非法文件路径");
        return target;
    }

    private static String detectContentType(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) return "image/jpeg";
        if (bytes.length >= 8 && HexFormat.of().formatHex(bytes, 0, 8).equals("89504e470d0a1a0a")) return "image/png";
        if (bytes.length >= 6) {
            String header = new String(bytes, 0, 6, java.nio.charset.StandardCharsets.US_ASCII);
            if (header.equals("GIF87a") || header.equals("GIF89a")) return "image/gif";
        }
        if (bytes.length >= 12) {
            String riff = new String(bytes, 0, 4, java.nio.charset.StandardCharsets.US_ASCII);
            String webp = new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII);
            if (riff.equals("RIFF") && webp.equals("WEBP")) return "image/webp";
        }
        return "application/octet-stream";
    }
}
