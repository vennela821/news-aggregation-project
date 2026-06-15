package com.news.backend.config;

import com.news.backend.entity.Article;
import com.news.backend.repository.ArticleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {
    @Bean
    CommandLineRunner seedArticles(ArticleRepository articleRepository) {
        return args -> {
            if (articleRepository.count() > 0) {
                return;
            }
            articleRepository.save(sample(
                    "AI tools reshape campus projects",
                    "Students are building faster prototypes with modern AI tools while focusing more on problem framing and testing.",
                    "Technology",
                    "Campus Tech Desk",
                    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
            ));
            articleRepository.save(sample(
                    "Local teams prepare for finals",
                    "College sports teams are preparing for the final week with practice sessions, strategy reviews, and fitness checks.",
                    "Sports",
                    "Student Sports",
                    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80"
            ));
            articleRepository.save(sample(
                    "New library hours announced",
                    "The central library will extend evening hours during exam season to support student preparation.",
                    "Education",
                    "Campus Bulletin",
                    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80"
            ));
        };
    }

    private Article sample(String title, String content, String category, String source, String imageUrl) {
        Article article = new Article();
        article.setTitle(title);
        article.setContent(content);
        article.setCategory(category);
        article.setSource(source);
        article.setImageUrl(imageUrl);
        return article;
    }
}
