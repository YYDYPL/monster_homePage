package com.monster.homepage.content;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SlugUtilTest {
    @Test void createsUrlFriendlySlug() { assertThat(SlugUtil.slugify("Hello, Java World!")).isEqualTo("hello-java-world"); }
    @Test void fallsBackForEmptyText() { assertThat(SlugUtil.slugify("   ")).isEqualTo("item"); }
}
