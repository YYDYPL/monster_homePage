package com.monster.homepage.content;

import com.monster.homepage.common.ApiResponse;
import com.monster.homepage.common.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.monster.homepage.content.ContentStatus.DRAFT;
import static com.monster.homepage.content.ContentStatus.PUBLISHED;

@RestController
@RequestMapping("/api/admin")
public class AdminContentController {
    private final PostRepository posts;
    private final NoteRepository notes;
    private final NoteHierarchyService noteHierarchy;
    private final ProjectRepository projects;
    private final ContactMessageRepository messages;

    public AdminContentController(PostRepository posts, NoteRepository notes, NoteHierarchyService noteHierarchy, ProjectRepository projects, ContactMessageRepository messages) {
        this.posts = posts;
        this.notes = notes;
        this.noteHierarchy = noteHierarchy;
        this.projects = projects;
        this.messages = messages;
    }

    @GetMapping("/dashboard")
    public ApiResponse<ContentDtos.Dashboard> dashboard() { return ApiResponse.ok(new ContentDtos.Dashboard(posts.count(), notes.count(), projects.count(), messages.count())); }

    @GetMapping("/posts")
    public ApiResponse<PageResponse<ContentDtos.PostDetail>> postList(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "updatedAt"));
        return ApiResponse.ok(PageResponse.from(posts.findAll(pageable).map(ContentMapper::postDetail)));
    }

    @PostMapping("/posts") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ContentDtos.PostDetail> createPost(@Valid @RequestBody ContentDtos.PostRequest request) { Post post = new Post(); apply(post, request); return ApiResponse.ok(ContentMapper.postDetail(posts.save(post))); }

    @PatchMapping("/posts/{id}")
    public ApiResponse<ContentDtos.PostDetail> updatePost(@PathVariable UUID id, @Valid @RequestBody ContentDtos.PostRequest request) {
        Post post = posts.findById(id).orElseThrow(() -> new NoSuchElementException("文章不存在")); apply(post, request); return ApiResponse.ok(ContentMapper.postDetail(posts.save(post)));
    }

    @DeleteMapping("/posts/{id}")
    public ApiResponse<String> deletePost(@PathVariable UUID id) { if (!posts.existsById(id)) throw new NoSuchElementException("文章不存在"); posts.deleteById(id); return ApiResponse.ok("deleted"); }

    @PostMapping("/posts/{id}/publish")
    public ApiResponse<ContentDtos.PostDetail> publishPost(@PathVariable UUID id) {
        Post post = posts.findById(id).orElseThrow(() -> new NoSuchElementException("文章不存在")); post.setStatus(PUBLISHED); post.setPublishedAt(Instant.now()); return ApiResponse.ok(ContentMapper.postDetail(posts.save(post)));
    }

    @GetMapping("/notes")
    public ApiResponse<PageResponse<ContentDtos.NoteDetail>> noteList(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "updatedAt"));
        return ApiResponse.ok(PageResponse.from(notes.findAll(pageable).map(ContentMapper::noteDetail)));
    }

    @GetMapping("/notes/tree")
    public ApiResponse<java.util.List<ContentDtos.NoteTreeNode>> noteTree() {
        return ApiResponse.ok(noteHierarchy.adminTree());
    }

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ContentDtos.NoteDetail> createNote(@Valid @RequestBody ContentDtos.NoteRequest request) {
        Note note = new Note();
        apply(note, request);
        return ApiResponse.ok(ContentMapper.noteDetail(noteHierarchy.create(note, request.parentId(), request.sortOrder())));
    }

    @PatchMapping("/notes/{id}")
    public ApiResponse<ContentDtos.NoteDetail> updateNote(@PathVariable UUID id, @Valid @RequestBody ContentDtos.NoteRequest request) {
        Note note = notes.findById(id).orElseThrow(() -> new NoSuchElementException("Note does not exist"));
        apply(note, request);
        return ApiResponse.ok(ContentMapper.noteDetail(noteHierarchy.update(note, request.parentId(), request.sortOrder())));
    }

    @PatchMapping("/notes/{id}/move")
    public ApiResponse<ContentDtos.NoteDetail> moveNote(@PathVariable UUID id, @Valid @RequestBody ContentDtos.NoteMoveRequest request) {
        return ApiResponse.ok(ContentMapper.noteDetail(noteHierarchy.move(id, request.parentId(), request.position())));
    }

    @DeleteMapping("/notes/{id}")
    public ApiResponse<String> deleteNote(@PathVariable UUID id) {
        noteHierarchy.delete(id);
        return ApiResponse.ok("deleted");
    }

    @GetMapping("/projects")
    public ApiResponse<PageResponse<ContentDtos.ProjectDetail>> projectList(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "updatedAt"));
        return ApiResponse.ok(PageResponse.from(projects.findAll(pageable).map(ContentMapper::projectDetail)));
    }

    @PostMapping("/projects") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ContentDtos.ProjectDetail> createProject(@Valid @RequestBody ContentDtos.ProjectRequest request) { Project project = new Project(); apply(project, request); return ApiResponse.ok(ContentMapper.projectDetail(projects.save(project))); }

    @PatchMapping("/projects/{id}")
    public ApiResponse<ContentDtos.ProjectDetail> updateProject(@PathVariable UUID id, @Valid @RequestBody ContentDtos.ProjectRequest request) {
        Project project = projects.findById(id).orElseThrow(() -> new NoSuchElementException("项目不存在")); apply(project, request); return ApiResponse.ok(ContentMapper.projectDetail(projects.save(project)));
    }

    @DeleteMapping("/projects/{id}")
    public ApiResponse<String> deleteProject(@PathVariable UUID id) { if (!projects.existsById(id)) throw new NoSuchElementException("项目不存在"); projects.deleteById(id); return ApiResponse.ok("deleted"); }

    private void apply(Post post, ContentDtos.PostRequest request) {
        String title = ContentNormalizer.required(request.title(), "title");
        String requestedSlug = ContentNormalizer.optional(request.slug());
        post.setTitle(title);
        post.setSlug(uniquePostSlug(SlugUtil.slugify(requestedSlug == null || requestedSlug.isBlank() ? title : requestedSlug), post.getId()));
        post.setSummary(ContentNormalizer.optional(request.summary()));
        post.setContent(ContentNormalizer.required(request.content(), "content"));
        post.setCoverImageUrl(ContentNormalizer.optional(request.coverImageUrl()));
        post.setTagsCsv(ContentDtos.join(normalizeTags(request.tags())));
        post.setSeries(ContentNormalizer.optional(request.series()));
        post.setFeatured(request.featured());
        post.setStatus(request.status() == null ? DRAFT : request.status());
        if (post.getStatus() == PUBLISHED && post.getPublishedAt() == null) post.setPublishedAt(Instant.now());
    }

    private void apply(Note note, ContentDtos.NoteRequest request) {
        String title = ContentNormalizer.required(request.title(), "title");
        String requestedSlug = ContentNormalizer.optional(request.slug());
        note.setTitle(title);
        note.setSlug(uniqueNoteSlug(SlugUtil.slugify(requestedSlug == null || requestedSlug.isBlank() ? title : requestedSlug), note.getId()));
        note.setSummary(ContentNormalizer.optional(request.summary()));
        note.setContent(ContentNormalizer.required(request.content(), "content"));
        note.setCategory(ContentNormalizer.optional(request.category()));
        note.setTagsCsv(ContentDtos.join(normalizeTags(request.tags())));
        note.setStatus(request.status() == null ? DRAFT : request.status());
        if (note.getStatus() == PUBLISHED && note.getPublishedAt() == null) note.setPublishedAt(Instant.now());
    }

    private java.util.List<String> normalizeTags(java.util.List<String> values) {
        java.util.List<String> tags = ContentNormalizer.list(values);
        if (tags.size() > 10) throw new IllegalArgumentException("\u6587\u7ae0\u6216\u7b14\u8bb0\u6700\u591a\u652f\u6301 10 \u4e2a\u6807\u7b7e");
        return tags;
    }

    private String uniquePostSlug(String base, UUID currentId) {
        return uniqueSlug(base, currentId, posts::existsBySlug, posts::existsBySlugAndIdNot);
    }

    private String uniqueNoteSlug(String base, UUID currentId) {
        return uniqueSlug(base, currentId, notes::existsBySlug, notes::existsBySlugAndIdNot);
    }

    private String uniqueSlug(String base, UUID currentId, java.util.function.Predicate<String> exists, java.util.function.BiPredicate<String, UUID> existsForOtherId) {
        String candidate = base;
        if (currentId != null ? !existsForOtherId.test(candidate, currentId) : !exists.test(candidate)) return candidate;
        int suffix = 2;
        while (true) {
            candidate = base + "-" + suffix++;
            if (currentId != null ? !existsForOtherId.test(candidate, currentId) : !exists.test(candidate)) return candidate;
        }
    }

    private void apply(Project project, ContentDtos.ProjectRequest request) {
        String name = ContentNormalizer.required(request.name(), "name");
        String requestedSlug = ContentNormalizer.optional(request.slug());
        project.setName(name);
        project.setSlug(SlugUtil.slugify(requestedSlug == null || requestedSlug.isBlank() ? name : requestedSlug));
        project.setSummary(ContentNormalizer.optional(request.summary()));
        project.setDescription(ContentNormalizer.optional(request.description()));
        project.setTechStackCsv(ContentDtos.join(ContentNormalizer.list(request.techStack())));
        project.setStatus(request.status() == null ? ProjectStatus.EXPERIMENTAL : request.status());
        project.setRepoUrl(ContentNormalizer.optional(request.repoUrl()));
        project.setDemoUrl(ContentNormalizer.optional(request.demoUrl()));
        project.setImageUrl(ContentNormalizer.optional(request.imageUrl()));
        project.setFeatured(request.featured());
        project.setStartDate(request.startDate());
        project.setEndDate(request.endDate());
    }
}
