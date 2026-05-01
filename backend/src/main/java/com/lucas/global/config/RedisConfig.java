package com.lucas.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

  @Value("${spring.data.redis.host}")
  private String host;

  @Value("${spring.data.redis.port}")
  private int port;

  @Value("${spring.data.redis.password}")
  private String password;

  /**
   * application 설정값을 사용해 Redis 연결 팩토리를 생성한다.
   *
   * @return Lettuce 기반 Redis 연결 팩토리
   */
  @Bean
  public RedisConnectionFactory redisConnectionFactory() {
    // 호스트와 포트를 포함한 독립형 Redis 설정을 생성한다.
    RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(host, port);

    // 비밀번호가 설정된 환경에서는 Redis 인증 정보를 추가한다.
    if (password != null && !password.isBlank()) {
      // RedisStandaloneConfiguration에 비밀번호를 반영한다.
      config.setPassword(password);
    }

    // Lettuce client가 사용할 RedisConnectionFactory를 반환한다.
    return new LettuceConnectionFactory(config);
  }

  /**
   * 문자열 기반 key/value/hash 직렬화를 사용하는 RedisTemplate을 생성한다.
   *
   * @return String RedisTemplate
   */
  @Bean
  public RedisTemplate<String, String> redisTemplate() {
    // 애플리케이션에서 주입받을 String RedisTemplate 인스턴스를 생성한다.
    RedisTemplate<String, String> redisTemplate = new RedisTemplate<>();

    // 위에서 만든 RedisConnectionFactory를 template에 연결한다.
    redisTemplate.setConnectionFactory(redisConnectionFactory());

    // Key를 사람이 읽을 수 있는 String으로 저장하도록 직렬화 방식을 설정한다.
    redisTemplate.setKeySerializer(new StringRedisSerializer());

    // Value를 JSON 문자열 또는 일반 문자열 그대로 저장하도록 직렬화 방식을 설정한다.
    redisTemplate.setValueSerializer(new StringRedisSerializer());

    // Redis Hash를 사용하는 recent-actions context도 문자열 field/value로 저장한다.
    redisTemplate.setHashKeySerializer(new StringRedisSerializer());

    // Redis Hash value도 String serializer로 맞춰 context 조회 시 역직렬화 차이를 없앤다.
    redisTemplate.setHashValueSerializer(new StringRedisSerializer());

    // 모든 serializer 설정이 끝난 template을 Spring bean으로 반환한다.
    return redisTemplate;
  }
}
