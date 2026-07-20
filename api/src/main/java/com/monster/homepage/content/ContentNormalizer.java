package com.monster.homepage.content;

import java.util.List;

/**
 * Normalizes text copied from rich text editors before it is persisted.
 * PostgreSQL TEXT values cannot contain NUL characters, and other clipboard
 * control characters can also make an otherwise valid request fail at save time.
 */
public final class ContentNormalizer {
    private ContentNormalizer() {}

    public static String required(String value, String fieldName) {
        String normalized = normalize(value);
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return normalized;
    }

    public static String optional(String value) {
        return normalize(value);
    }

    public static List<String> list(List<String> values) {
        if (values == null) return List.of();
        return values.stream()
                .map(ContentNormalizer::normalize)
                .filter(value -> value != null && !value.isBlank())
                .toList();
    }

    static String normalize(String value) {
        if (value == null || value.isEmpty()) return value;

        StringBuilder result = new StringBuilder(value.length());
        boolean previousWasCarriageReturn = false;
        for (int offset = 0; offset < value.length();) {
            int codePoint = value.codePointAt(offset);
            offset += Character.charCount(codePoint);

            if (codePoint == '\r') {
                result.append('\n');
                previousWasCarriageReturn = true;
                continue;
            }
            if (codePoint == '\n') {
                if (!previousWasCarriageReturn) result.append('\n');
                previousWasCarriageReturn = false;
                continue;
            }
            previousWasCarriageReturn = false;

            if (codePoint == 0x2028 || codePoint == 0x2029) {
                result.append('\n');
                continue;
            }
            if (codePoint == 0xFEFF || (Character.isISOControl(codePoint) && codePoint != '\t')) {
                continue;
            }
            result.appendCodePoint(codePoint);
        }
        return result.toString();
    }
}
