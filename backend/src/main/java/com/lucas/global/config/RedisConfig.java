package com.lucas.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/** Redis 설정을 담당하는 클래스입니다. 명령어 로그 저장을 위한 RedisTemplate을 빈으로 등록합니다. */
@Configuration
public class RedisConfig {

    /**
     * 문자열 기반의 명령어 로그를 저장하기 위한 RedisTemplate을 생성합니다. 키와 값을 모두 String으로 직렬화하도록 설정합니다.
     *
     * @param connectionFactory Redis 연결 팩토리
     * @return 설정된 RedisTemplate 객체
     */
    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, String> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(connectionFactory);

        // Key와 Value 모두 String 직렬화 방식을 사용합니다.
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(new StringRedisSerializer());

        return redisTemplate;
    }
}
