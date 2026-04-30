package com.lucas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class LucasApplication {

  public static void main(String[] args) {
    SpringApplication.run(LucasApplication.class, args);
  }
}
