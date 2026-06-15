package com.news.backend.repository;

import com.news.backend.entity.Article;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByCategoryIgnoreCaseOrderByCreatedAtDesc(String category);

    List<Article> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCaseOrderByCreatedAtDesc(String title, String content);

    List<Article> findByCreatedByEmailOrderByCreatedAtDesc(String createdByEmail);

    List<Article> findAllByOrderByCreatedAtDesc();
}
