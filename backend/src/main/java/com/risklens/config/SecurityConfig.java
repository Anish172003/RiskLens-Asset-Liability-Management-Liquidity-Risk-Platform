package com.risklens.config;

import com.risklens.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Explicitly allow preflight OPTIONS requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                
                // Public endpoints
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                
                // Admin-only endpoints
                .requestMatchers("/api/v1/users/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/audit-logs/**").hasRole("ADMIN")
                
                // Instrument Management: Risk managers & Admins can write, Viewers can read
                .requestMatchers(HttpMethod.POST, "/api/v1/instruments", "/api/v1/instruments/**").hasAnyRole("ADMIN", "RISK_MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/v1/instruments", "/api/v1/instruments/**").hasAnyRole("ADMIN", "RISK_MANAGER")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/instruments", "/api/v1/instruments/**").hasAnyRole("ADMIN", "RISK_MANAGER")
                .requestMatchers(HttpMethod.GET, "/api/v1/instruments", "/api/v1/instruments/**").hasAnyRole("ADMIN", "RISK_MANAGER", "VIEWER")

                // Other endpoints
                .requestMatchers("/api/v1/counterparties", "/api/v1/counterparties/**").hasAnyRole("ADMIN", "RISK_MANAGER", "VIEWER")
                .requestMatchers("/api/v1/cashflows", "/api/v1/cashflows/**").hasAnyRole("ADMIN", "RISK_MANAGER", "VIEWER")
                .requestMatchers("/api/v1/liquidity-gap", "/api/v1/liquidity-gap/**").hasAnyRole("ADMIN", "RISK_MANAGER", "VIEWER")
                .requestMatchers("/api/v1/ai", "/api/v1/ai/**").hasAnyRole("ADMIN", "RISK_MANAGER", "VIEWER")
                
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
