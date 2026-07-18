package com.monster.homepage.content;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static com.monster.homepage.content.ContentStatus.PUBLISHED;

@Service
public class NoteHierarchyService {
    private static final Comparator<Note> NOTE_ORDER = Comparator.comparingInt(Note::getSortOrder)
            .thenComparing(Note::getTitle, String.CASE_INSENSITIVE_ORDER);

    private final NoteRepository notes;

    public NoteHierarchyService(NoteRepository notes) {
        this.notes = notes;
    }

    @Transactional(readOnly = true)
    public List<ContentDtos.NoteTreeNode> publicTree() {
        return buildTree(notes.findAllByStatusOrderBySortOrderAscTitleAsc(PUBLISHED));
    }

    @Transactional(readOnly = true)
    public List<ContentDtos.NoteTreeNode> adminTree() {
        return buildTree(notes.findAllByOrderBySortOrderAscTitleAsc());
    }

    @Transactional
    public Note create(Note note, UUID parentId, Integer requestedPosition) {
        note.setParentId(null);
        note.setSortOrder(siblings(null).size());
        Note saved = notes.saveAndFlush(note);
        return move(saved.getId(), parentId, requestedPosition == null ? Integer.MAX_VALUE : requestedPosition);
    }

    @Transactional
    public Note update(Note note, UUID parentId, Integer requestedPosition) {
        UUID previousParent = note.getParentId();
        int previousPosition = note.getSortOrder();
        notes.save(note);
        if (!Objects.equals(previousParent, parentId) || (requestedPosition != null && requestedPosition != previousPosition)) {
            return move(note.getId(), parentId, requestedPosition == null ? Integer.MAX_VALUE : requestedPosition);
        }
        return note;
    }

    @Transactional
    public Note move(UUID noteId, UUID newParentId, int requestedPosition) {
        Note moving = notes.findById(noteId).orElseThrow(() -> new NoSuchElementException("Note does not exist"));
        validateParent(noteId, newParentId);

        UUID oldParentId = moving.getParentId();
        List<Note> oldSiblings = new ArrayList<>(siblings(oldParentId));
        oldSiblings.removeIf(item -> item.getId().equals(noteId));

        if (Objects.equals(oldParentId, newParentId)) {
            moving.setParentId(newParentId);
            int position = Math.max(0, Math.min(requestedPosition, oldSiblings.size()));
            oldSiblings.add(position, moving);
            normalize(oldSiblings);
            notes.saveAll(oldSiblings);
            return moving;
        }

        List<Note> newSiblings = new ArrayList<>(siblings(newParentId));
        newSiblings.removeIf(item -> item.getId().equals(noteId));
        normalize(oldSiblings);

        moving.setParentId(newParentId);
        int position = Math.max(0, Math.min(requestedPosition, newSiblings.size()));
        newSiblings.add(position, moving);
        normalize(newSiblings);

        List<Note> changed = new ArrayList<>(oldSiblings.size() + newSiblings.size());
        changed.addAll(oldSiblings);
        changed.addAll(newSiblings);
        notes.saveAll(changed);
        return moving;
    }

    @Transactional
    public void delete(UUID noteId) {
        Note note = notes.findById(noteId).orElseThrow(() -> new NoSuchElementException("Note does not exist"));
        if (notes.countByParentId(noteId) > 0) {
            throw new IllegalArgumentException("Move or delete child notes before deleting this note");
        }
        UUID parentId = note.getParentId();
        notes.delete(note);
        notes.flush();
        List<Note> remaining = new ArrayList<>(siblings(parentId));
        normalize(remaining);
        notes.saveAll(remaining);
    }

    private void validateParent(UUID noteId, UUID parentId) {
        if (parentId == null) return;
        if (noteId.equals(parentId)) throw new IllegalArgumentException("A note cannot be its own parent");

        Set<UUID> visited = new HashSet<>();
        UUID cursor = parentId;
        while (cursor != null) {
            if (!visited.add(cursor)) throw new IllegalArgumentException("The note hierarchy contains a cycle");
            if (noteId.equals(cursor)) throw new IllegalArgumentException("A note cannot be moved below one of its descendants");
            Note parent = notes.findById(cursor).orElseThrow(() -> new IllegalArgumentException("Parent note does not exist"));
            cursor = parent.getParentId();
        }
    }

    private List<Note> siblings(UUID parentId) {
        return parentId == null
                ? notes.findAllByParentIdIsNullOrderBySortOrderAscTitleAsc()
                : notes.findAllByParentIdOrderBySortOrderAscTitleAsc(parentId);
    }

    private void normalize(List<Note> siblings) {
        for (int index = 0; index < siblings.size(); index++) siblings.get(index).setSortOrder(index);
    }

    private List<ContentDtos.NoteTreeNode> buildTree(List<Note> source) {
        Map<UUID, Note> byId = new LinkedHashMap<>();
        source.stream().sorted(NOTE_ORDER).forEach(note -> byId.put(note.getId(), note));

        Map<UUID, List<Note>> children = new HashMap<>();
        List<Note> roots = new ArrayList<>();
        for (Note note : byId.values()) {
            UUID parentId = note.getParentId();
            if (parentId == null || !byId.containsKey(parentId)) roots.add(note);
            else children.computeIfAbsent(parentId, ignored -> new ArrayList<>()).add(note);
        }
        roots.sort(NOTE_ORDER);
        children.values().forEach(items -> items.sort(NOTE_ORDER));

        return roots.stream().map(note -> buildNode(note, children, new HashSet<>())).toList();
    }

    private ContentDtos.NoteTreeNode buildNode(Note note, Map<UUID, List<Note>> children, Set<UUID> ancestors) {
        if (!ancestors.add(note.getId())) {
            return treeNode(note, List.of());
        }
        Set<UUID> branch = new HashSet<>(ancestors);
        List<ContentDtos.NoteTreeNode> nested = children.getOrDefault(note.getId(), List.of()).stream()
                .map(child -> buildNode(child, children, branch))
                .toList();
        return treeNode(note, nested);
    }

    private ContentDtos.NoteTreeNode treeNode(Note note, List<ContentDtos.NoteTreeNode> children) {
        return new ContentDtos.NoteTreeNode(note.getId(), note.getTitle(), note.getSlug(), note.getSummary(), note.getCategory(), note.getStatus(), note.getParentId(), note.getSortOrder(), note.getUpdatedAt(), children);
    }
}