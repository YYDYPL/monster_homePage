package com.monster.homepage.content;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteHierarchyServiceTest {
    @Mock
    private NoteRepository notes;

    @Test
    void reordersNotesWithinTheSameParent() {
        Note first = note("First", null, 0);
        Note second = note("Second", null, 1);
        Note third = note("Third", null, 2);
        when(notes.findById(first.getId())).thenReturn(Optional.of(first));
        when(notes.findAllByParentIdIsNullOrderBySortOrderAscTitleAsc()).thenReturn(List.of(first, second, third));

        new NoteHierarchyService(notes).move(first.getId(), null, 2);

        ArgumentCaptor<Iterable<Note>> captor = iterableCaptor();
        verify(notes).saveAll(captor.capture());
        List<Note> saved = toList(captor.getValue());
        assertThat(saved).extracting(Note::getTitle).containsExactly("Second", "Third", "First");
        assertThat(saved).extracting(Note::getSortOrder).containsExactly(0, 1, 2);
    }

    @Test
    void movesANoteAcrossParentsAndNormalizesBothSiblingGroups() {
        Note oldParent = note("Old parent", null, 0);
        Note newParent = note("New parent", null, 1);
        Note moving = note("Moving", oldParent.getId(), 0);
        Note oldSibling = note("Old sibling", oldParent.getId(), 1);
        Note newSibling = note("New sibling", newParent.getId(), 0);
        Map<UUID, Note> byId = Map.of(
                oldParent.getId(), oldParent,
                newParent.getId(), newParent,
                moving.getId(), moving
        );
        when(notes.findById(any(UUID.class))).thenAnswer(invocation -> Optional.ofNullable(byId.get(invocation.getArgument(0))));
        when(notes.findAllByParentIdOrderBySortOrderAscTitleAsc(oldParent.getId())).thenReturn(List.of(moving, oldSibling));
        when(notes.findAllByParentIdOrderBySortOrderAscTitleAsc(newParent.getId())).thenReturn(List.of(newSibling));

        new NoteHierarchyService(notes).move(moving.getId(), newParent.getId(), 0);

        ArgumentCaptor<Iterable<Note>> captor = iterableCaptor();
        verify(notes).saveAll(captor.capture());
        List<Note> saved = toList(captor.getValue());
        assertThat(saved).containsExactly(oldSibling, moving, newSibling);
        assertThat(oldSibling.getSortOrder()).isZero();
        assertThat(moving.getParentId()).isEqualTo(newParent.getId());
        assertThat(moving.getSortOrder()).isZero();
        assertThat(newSibling.getSortOrder()).isEqualTo(1);
    }

    @Test
    void rejectsUsingTheNoteItselfAsParent() {
        Note moving = note("Moving", null, 0);
        when(notes.findById(moving.getId())).thenReturn(Optional.of(moving));

        assertThatThrownBy(() -> new NoteHierarchyService(notes).move(moving.getId(), moving.getId(), 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("own parent");
    }

    @Test
    void rejectsMovingAParentBelowItsDescendant() {
        Note parent = note("Parent", null, 0);
        Note child = note("Child", parent.getId(), 0);
        Map<UUID, Note> byId = Map.of(parent.getId(), parent, child.getId(), child);
        when(notes.findById(any(UUID.class))).thenAnswer(invocation -> Optional.ofNullable(byId.get(invocation.getArgument(0))));

        assertThatThrownBy(() -> new NoteHierarchyService(notes).move(parent.getId(), child.getId(), 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("descendants");
    }

    private Note note(String title, UUID parentId, int sortOrder) {
        Note note = new Note();
        note.onCreate();
        note.setTitle(title);
        note.setSlug(title.toLowerCase().replace(' ', '-'));
        note.setContent("content");
        note.setParentId(parentId);
        note.setSortOrder(sortOrder);
        return note;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private ArgumentCaptor<Iterable<Note>> iterableCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Iterable.class);
    }

    private List<Note> toList(Iterable<Note> source) {
        return ((List<Note>) source).stream().collect(Collectors.toList());
    }
}
