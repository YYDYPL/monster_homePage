package com.monster.homepage.content;

import java.text.Normalizer;
import java.util.Locale;

public final class SlugUtil {
    private SlugUtil() {}
    public static String slugify(String input) {
        if (input == null || input.isBlank()) return "item";
        String value = Normalizer.normalize(input.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFKD)
                .replaceAll("[^\\p{ASCII}]", "")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return value.isBlank() ? "item" : value;
    }
}
