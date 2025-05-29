const { createResponse } = require('../Utilities/createResponse');
const pool = require('../Database/dbManagement');

class BlogDAO {
    constructor() {

    }

    async create(blogData) {
        return new Promise((resolve, reject) => {
            const { user_id, title, content, date_of_visit, country_name } = blogData;
            
            pool.run(
                'INSERT INTO blogPost (user_id, title, content, date_of_visit, country_name) VALUES (?, ?, ?, ?, ?)',
                [user_id, title, content, date_of_visit, country_name],
                function(err) {
                    if(err) {
                        console.error('Error creating blog post:', err);
                        reject(createResponse(false, null, err));
                        return;
                    }
                    resolve(createResponse(true, { id: this.lastID }));
                }
            );
        });
    }

    async getAll(page = 1, limit = 10, sortBy = 'newest') {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * limit;
            
            let orderClause = 'ORDER BY b.date_visited DESC'; // default newest
            
            if (sortBy === 'most_liked') {
                orderClause = 'ORDER BY likes DESC';
            } else if (sortBy === 'most_commented') {
                orderClause = 'ORDER BY comment_count DESC';
            }
            
            const query = `
                SELECT b.*, u.name as author_name, u.surname as author_surname,
                       (SELECT COUNT(*) FROM likedPosts WHERE blog_post_id = b.id AND is_like = 1) as likes,
                       (SELECT COUNT(*) FROM likedPosts WHERE blog_post_id = b.id AND is_like = 0) as dislikes,
                       (SELECT COUNT(*) FROM comments WHERE blog_post_id = b.id) as comment_count
                FROM blogPost b
                JOIN users u ON b.user_id = u.id
                ${orderClause}
                LIMIT ? OFFSET ?
            `;
            
            pool.all(query, [limit, offset], (err, rows) => {
                if(err) {
                    reject(createResponse(false, null, err));
                    return;
                }
                
                // Get total count for pagination
                pool.get('SELECT COUNT(*) as total FROM blogPost', [], (countErr, countRow) => {
                    if(countErr) {
                        reject(createResponse(false, null, countErr));
                        return;
                    }
                    
                    const totalPages = Math.ceil(countRow.total / limit);
                    const result = {
                        posts: rows,
                        pagination: {
                            total: countRow.total,
                            page,
                            limit,
                            totalPages
                        }
                    };
                    
                    resolve(createResponse(true, result));
                });
            });
        });
    }

    async likePost(userId, postId, isLike = true) {
        return new Promise((resolve, reject) => {
            // Check if already liked/disliked
            pool.get(
                'SELECT * FROM likedPosts WHERE user_id = ? AND blog_post_id = ?', 
                [userId, postId], 
                (err, row) => {
                    if(err) {
                        reject(createResponse(false, null, err));
                        return;
                    }
                    
                    if(row) {
                        // Update like
                        pool.run(
                            'UPDATE likedPosts SET is_like = ? WHERE user_id = ? AND blog_post_id = ?',
                            [isLike ? 1 : 0, userId, postId],
                            function(err) {
                                if(err) {
                                    reject(createResponse(false, null, err));
                                    return;
                                }
                                resolve(createResponse(true, { message: 'Like updated' }));
                            }
                        );
                    } else {
                        // Create new like
                        pool.run(
                            'INSERT INTO likedPosts (user_id, blog_post_id, is_like) VALUES (?, ?, ?)',
                            [userId, postId, isLike ? 1 : 0],
                            function(err) {
                                if(err) {
                                    reject(createResponse(false, null, err));
                                    return;
                                }
                                resolve(createResponse(true, { id: this.lastID }));
                            }
                        );
                    }
                }
            );
        });
    }
}

module.exports = BlogDAO; 