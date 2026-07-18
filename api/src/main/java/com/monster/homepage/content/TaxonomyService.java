package com.monster.homepage.content;

import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TaxonomyService {
    private final PostRepository posts;
    private final NoteRepository notes;
    private final ProjectRepository projects;

    public TaxonomyService(PostRepository posts, NoteRepository notes, ProjectRepository projects) {
        this.posts = posts;
        this.notes = notes;
        this.projects = projects;
    }

    public OperationsDtos.TaxonomySummary summary() {
        Map<String, Long> tags = new LinkedHashMap<>();
        Map<String, Long> series = new LinkedHashMap<>();
        Map<String, Long> categories = new LinkedHashMap<>();
        Map<String, Long> technologies = new LinkedHashMap<>();
        posts.findAll().forEach(post -> {
            ContentDtos.split(post.getTagsCsv()).forEach(tag -> increment(tags, tag));
            increment(series, post.getSeries());
        });
        notes.findAll().forEach(note -> {
            ContentDtos.split(note.getTagsCsv()).forEach(tag -> increment(tags, tag));
            increment(categories, note.getCategory());
        });
        projects.findAll().forEach(project -> ContentDtos.split(project.getTechStackCsv()).forEach(tech -> increment(technologies, tech)));
        return new OperationsDtos.TaxonomySummary(items(tags), items(series), items(categories), items(technologies));
    }

    @Transactional
    public OperationsDtos.TaxonomySummary rename(String kind, String from, String to) {
        validateNames(from, to);
        switch (normalizeKind(kind)) {
            case "tags" -> {
                posts.findAll().forEach(post -> post.setTagsCsv(renameCsv(post.getTagsCsv(), from, to)));
                notes.findAll().forEach(note -> note.setTagsCsv(renameCsv(note.getTagsCsv(), from, to)));
            }
            case "series" -> posts.findAll().forEach(post -> { if (same(post.getSeries(), from)) post.setSeries(to.trim()); });
            case "categories" -> notes.findAll().forEach(note -> { if (same(note.getCategory(), from)) note.setCategory(to.trim()); });
            case "technologies" -> projects.findAll().forEach(project -> project.setTechStackCsv(renameCsv(project.getTechStackCsv(), from, to)));
            default -> throw new IllegalArgumentException("不支持的分类类型");
        }
        return summary();
    }

    @Transactional
    public OperationsDtos.TaxonomySummary remove(String kind, String name) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("名称不能为空");
        switch (normalizeKind(kind)) {
            case "tags" -> {
                posts.findAll().forEach(post -> post.setTagsCsv(removeCsv(post.getTagsCsv(), name)));
                notes.findAll().forEach(note -> note.setTagsCsv(removeCsv(note.getTagsCsv(), name)));
            }
            case "series" -> posts.findAll().forEach(post -> { if (same(post.getSeries(), name)) post.setSeries(null); });
            case "categories" -> notes.findAll().forEach(note -> { if (same(note.getCategory(), name)) note.setCategory(null); });
            case "technologies" -> projects.findAll().forEach(project -> project.setTechStackCsv(removeCsv(project.getTechStackCsv(), name)));
            default -> throw new IllegalArgumentException("不支持的分类类型");
        }
        return summary();
    }

    private String normalizeKind(String kind) { return kind == null ? "" : kind.toLowerCase(Locale.ROOT); }
    private void validateNames(String from, String to) {
        if (from == null || from.isBlank() || to == null || to.isBlank()) throw new IllegalArgumentException("原名称和新名称不能为空");
        if (to.trim().length() > 120) throw new IllegalArgumentException("名称不能超过 120 个字符");
    }
    private boolean same(String left, String right) { return left != null && right != null && left.trim().equalsIgnoreCase(right.trim()); }
    private void increment(Map<String, Long> values, String value) {
        if (value == null || value.isBlank()) return;
        String clean = value.trim();
        values.merge(clean, 1L, Long::sum);
    }
    private List<OperationsDtos.TaxonomyItem> items(Map<String, Long> values) {
        return values.entrySet().stream()
                .map(entry -> new OperationsDtos.TaxonomyItem(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingLong(OperationsDtos.TaxonomyItem::usageCount).reversed().thenComparing(OperationsDtos.TaxonomyItem::name))
                .toList();
    }
    private String renameCsv(String csv, String from, String to) {
        List<String> values = new ArrayList<>(ContentDtos.split(csv));
        List<String> renamed = values.stream().map(value -> same(value, from) ? to.trim() : value).toList();
        return ContentDtos.join(renamed);
    }
    private String removeCsv(String csv, String name) {
        return ContentDtos.join(ContentDtos.split(csv).stream().filter(value -> !same(value, name)).toList());
    }
}