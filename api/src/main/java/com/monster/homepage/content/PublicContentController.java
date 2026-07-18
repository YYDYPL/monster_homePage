package com.monster.homepage.content;

import com.monster.homepage.common.ApiResponse;
import com.monster.homepage.common.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

import static com.monster.homepage.content.ContentStatus.PUBLISHED;

@RestController
@RequestMapping("/api")
public class PublicContentController {
    private final PostRepository posts;
    private final NoteRepository notes;
    private final NoteHierarchyService noteHierarchy;
    private final ProjectRepository projects;
    private final ContactMessageRepository messages;

    public PublicContentController(PostRepository posts, NoteRepository notes, NoteHierarchyService noteHierarchy, ProjectRepository projects, ContactMessageRepository messages) {
        this.posts = posts;
        this.notes = notes;
        this.noteHierarchy = noteHierarchy;
        this.projects = projects;
        this.messages = messages;
    }

    @GetMapping("/health") public ApiResponse<String> health() { return ApiResponse.ok("ok"); }

    @GetMapping("/posts")
    public ApiResponse<PageResponse<ContentDtos.PostSummary>> postList(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="12") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 50), Sort.by(Sort.Direction.DESC, "publishedAt"));
        return ApiResponse.ok(PageResponse.from(posts.findAllByStatus(PUBLISHED, pageable).map(ContentMapper::postSummary)));
    }

    @GetMapping("/posts/{slug}")
    public ApiResponse<ContentDtos.PostDetail> post(@PathVariable String slug) {
        return ApiResponse.ok(ContentMapper.postDetail(posts.findBySlugAndStatus(slug, PUBLISHED).orElseThrow(() -> new NoSuchElementException("文章不存在"))));
    }

    @GetMapping("/notes")
    public ApiResponse<PageResponse<ContentDtos.NoteSummary>> noteList(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 50), Sort.by(Sort.Direction.DESC, "updatedAt"));
        return ApiResponse.ok(PageResponse.from(notes.findAllByStatus(PUBLISHED, pageable).map(ContentMapper::noteSummary)));
    }

    @GetMapping("/notes/tree")
    public ApiResponse<List<ContentDtos.NoteTreeNode>> noteTree() {
        return ApiResponse.ok(noteHierarchy.publicTree());
    }

    @GetMapping("/notes/{slug}")
    public ApiResponse<ContentDtos.NoteDetail> note(@PathVariable String slug) {
        return ApiResponse.ok(ContentMapper.noteDetail(notes.findBySlugAndStatus(slug, PUBLISHED).orElseThrow(() -> new NoSuchElementException("笔记不存在"))));
    }

    @GetMapping("/projects")
    public ApiResponse<PageResponse<ContentDtos.ProjectSummary>> projectList(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 50));
        return ApiResponse.ok(PageResponse.from(projects.findAllByOrderByFeaturedDescCreatedAtDesc(pageable).map(ContentMapper::projectSummary)));
    }

    @GetMapping("/projects/{slug}")
    public ApiResponse<ContentDtos.ProjectDetail> project(@PathVariable String slug) {
        return ApiResponse.ok(ContentMapper.projectDetail(projects.findBySlug(slug).orElseThrow(() -> new NoSuchElementException("项目不存在"))));
    }

    @GetMapping("/search")
    public ApiResponse<List<ContentDtos.SearchResult>> search(@RequestParam String q, @RequestParam(defaultValue="all") String type) {
        if (q == null || q.isBlank()) return ApiResponse.ok(List.of());
        Pageable limit = PageRequest.of(0, 20);
        List<ContentDtos.SearchResult> result = new ArrayList<>();
        if ("all".equals(type) || "post".equals(type)) posts.search(q.trim(), PUBLISHED, limit).forEach(p -> result.add(new ContentDtos.SearchResult("post", p.getTitle(), p.getSlug(), p.getSummary(), "/blog/" + p.getSlug())));
        if ("all".equals(type) || "note".equals(type)) notes.search(q.trim(), PUBLISHED, limit).forEach(n -> result.add(new ContentDtos.SearchResult("note", n.getTitle(), n.getSlug(), n.getSummary(), "/notes/" + n.getSlug())));
        if ("all".equals(type) || "project".equals(type)) projects.search(q.trim(), limit).forEach(p -> result.add(new ContentDtos.SearchResult("project", p.getName(), p.getSlug(), p.getSummary(), "/projects/" + p.getSlug())));
        return ApiResponse.ok(result);
    }

    @PostMapping("/contact")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<String> contact(@Valid @RequestBody ContentDtos.ContactRequest request) {
        ContactMessage message = new ContactMessage();
        message.setName(request.name()); message.setEmail(request.email()); message.setSubject(request.subject()); message.setMessage(request.message());
        messages.save(message);
        return ApiResponse.ok("消息已收到");
    }
}
