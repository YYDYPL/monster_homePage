package com.monster.homepage.config;

import com.monster.homepage.auth.AdminUser;
import com.monster.homepage.auth.AdminUserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() { return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8(); }

    @Bean
    UserDetailsService userDetailsService(AdminUserRepository repository) {
        return username -> repository.findByUsername(username).map(this::toUserDetails).orElseThrow(() -> new UsernameNotFoundException("admin not found"));
    }

    private org.springframework.security.core.userdetails.UserDetails toUserDetails(AdminUser user) {
        return User.withUsername(user.getUsername()).password(user.getPasswordHash()).roles(user.getRole()).disabled(!user.isEnabled()).build();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository csrf = CookieCsrfTokenRepository.withHttpOnlyFalse();
        http
            .csrf(c -> c.csrfTokenRepository(csrf).ignoringRequestMatchers(
                    "/api/auth/login",
                    "/api/auth/logout",
                    "/api/contact",
                    "/api/analytics/page-view",
                    "/api/health"))
            .authorizeHttpRequests(a -> a
                    .requestMatchers("/api/health", "/api/auth/**", "/api/posts/**", "/api/notes/**", "/api/projects/**", "/api/search", "/api/site-config", "/api/contact", "/actuator/health").permitAll()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().permitAll())
            .formLogin(f -> f
                    .loginProcessingUrl("/api/auth/login")
                    .successHandler((request, response, authentication) -> {
                        response.setStatus(200);
                        response.setContentType("application/json;charset=UTF-8");
                        response.getWriter().write("{\"success\":true}");
                    })
                    .failureHandler((request, response, exception) -> {
                        response.setStatus(401);
                        response.setContentType("application/json;charset=UTF-8");
                        response.getWriter().write("{\"success\":false,\"error\":{\"code\":\"AUTH_FAILED\",\"message\":\"\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef\"}}");
                    }).permitAll())
            .logout(l -> l.logoutUrl("/api/auth/logout")
                    .logoutSuccessHandler((request, response, authentication) -> {
                        response.setStatus(200);
                        response.setContentType("application/json;charset=UTF-8");
                        response.getWriter().write("{\"success\":true}");
                    }))
            .exceptionHandling(e -> e.authenticationEntryPoint((request, response, exception) -> {
                response.setStatus(401);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"\u8bf7\u5148\u767b\u5f55\"}}");
            }))
            .sessionManagement(s -> s.sessionFixation(sessionFixation -> sessionFixation.migrateSession()));
        return http.build();
    }
}


