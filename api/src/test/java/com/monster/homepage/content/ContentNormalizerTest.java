package com.monster.homepage.content;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContentNormalizerTest {
    @Test
    void removesDatabaseUnsafeClipboardCharactersAndKeepsUnicode() {
        String source = "yuque\u0000 content\u0007\r\n```java\rSystem.out.println(\"hello\");\r```";

        assertThat(ContentNormalizer.normalize(source))
                .isEqualTo("yuque content\n```java\nSystem.out.println(\"hello\");\n```");
    }

    @Test
    void preservesTabsAndNormalizesUnicodeLineSeparators() {
        assertThat(ContentNormalizer.normalize("a\tb\u2028c\u2029d"))
                .isEqualTo("a\tb\nc\nd");
    }

    @Test
    void rejectsRequiredTextThatOnlyContainsUnsafeCharacters() {
        assertThatThrownBy(() -> ContentNormalizer.required("\u0000\u0007", "content"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("content must not be blank");
    }

    @Test
    void normalizesListsAndDropsEmptyEntries() {
        assertThat(ContentNormalizer.list(List.of(" Java ", "\u0000", "PostgreSQL\u0007")))
                .containsExactly(" Java ", "PostgreSQL");
    }
}
