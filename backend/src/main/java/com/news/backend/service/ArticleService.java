package com.news.backend.service;

import com.news.backend.entity.Article;
import com.news.backend.entity.User;
import com.news.backend.repository.ArticleRepository;
import com.news.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ArticleService {
    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;

    public ArticleService(ArticleRepository articleRepository, UserRepository userRepository) {
        this.articleRepository = articleRepository;
        this.userRepository = userRepository;
    }

    public List<Article> findArticles(String category, String query) {
        if (query != null && !query.isBlank()) {
            return articleRepository.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCaseOrderByCreatedAtDesc(query, query);
        }
        if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
            return articleRepository.findByCategoryIgnoreCaseOrderByCreatedAtDesc(category);
        }
        return articleRepository.findAllByOrderByCreatedAtDesc();
    }

    public Article getArticle(Long id) {
        return articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Article not found"));
    }

    public List<Article> findMyArticles() {
        return articleRepository.findByCreatedByEmailOrderByCreatedAtDesc(currentUserEmail());
    }

    public Article createArticle(Article article) {
        User user = currentUser();
        article.setCreatedByName(user.getName());
        article.setCreatedByEmail(user.getEmail());
        return articleRepository.save(article);
    }

    public Article updateArticle(Long id, Article updatedArticle) {
        Article article = getArticle(id);
        article.setTitle(updatedArticle.getTitle());
        article.setContent(updatedArticle.getContent());
        article.setSource(updatedArticle.getSource());
        article.setCategory(updatedArticle.getCategory());
        article.setImageUrl(updatedArticle.getImageUrl());
        return articleRepository.save(article);
    }

    public void deleteArticle(Long id) {
        articleRepository.delete(getArticle(id));
    }

    private User currentUser() {
        return userRepository.findByEmail(currentUserEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private String currentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Login required");
        }
        return authentication.getName();
    }
}
