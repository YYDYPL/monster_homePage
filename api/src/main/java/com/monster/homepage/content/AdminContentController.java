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
        post.setTitle(request.title()); post.setSlug(SlugUtil.slugify(request.slug() == null || request.slug().isBlank() ? request.title() : request.slug()));
        post.setSummary(request.summary()); post.setContent(request.content()); post.setCoverImageUrl(request.coverImageUrl()); post.setTagsCsv(ContentDtos.join(request.tags())); post.setSeries(request.series()); post.setFeatured(request.featured());
        post.setStatus(request.status() == null ? DRAFT : request.status()); if (post.getStatus() == PUBLISHED && post.getPublishedAt() == null) post.setPublishedAt(Instant.now());
    }

    private void apply(Note note, ContentDtos.NoteRequest request) {
        note.setTitle(request.title()); note.setSlug(SlugUtil.slugify(request.slug() == null || request.slug().isBlank() ? request.title() : request.slug()));
        note.setSummary(request.summary()); note.setContent(request.content()); note.setCategory(request.category()); note.setTagsCsv(ContentDtos.join(request.tags())); note.setStatus(request.status() == null ? DRAFT : request.status());
        if (note.getStatus() == PUBLISHED && note.getPublishedAt() == null) note.setPublishedAt(Instant.now());
    }

    private void apply(Project project, ContentDtos.ProjectRequest request) {
        project.setName(request.name()); project.setSlug(SlugUtil.slugify(request.slug() == null || request.slug().isBlank() ? request.name() : request.slug()));
        project.setSummary(request.summary()); project.setDescription(request.description()); project.setTechStackCsv(ContentDtos.join(request.techStack())); project.setStatus(request.status() == null ? ProjectStatus.EXPERIMENTAL : request.status());
        project.setRepoUrl(request.repoUrl()); project.setDemoUrl(request.demoUrl()); project.setImageUrl(request.imageUrl()); project.setFeatured(request.featured()); project.setStartDate(request.startDate()); project.setEndDate(request.endDate());
    }
}
