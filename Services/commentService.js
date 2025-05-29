const CommentDAO = require('../DAOs/commentDAO');
const { createResponse } = require('../Utilities/createResponse');
const pool = require('../Database/dbManagement');

class CommentService {
    constructor() {
        this.commentDAO = new CommentDAO();
    }

    async createComment(userId, postId, content) {
        try {
            const commentData = {
                user_id: userId,
                blog_post_id: postId,
                content
            };
            
            const result = await this.commentDAO.create(commentData);
            return result;
        } catch (ex) {
            console.error('Error creating comment:', ex);
            return createResponse(false, null, ex);
        }
    }

    async getCommentsByPostId(postId, page, limit) {
        try {
            // Direct database query since getByPostId was removed from DAO
            return new Promise((resolve, reject) => {
                const offset = (page - 1) * limit;
                
                const query = `
                    SELECT c.*, u.name as user_name, u.surname as user_surname
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.blog_post_id = ?
                    ORDER BY c.created_at DESC
                    LIMIT ? OFFSET ?
                `;
                
                pool.all(query, [postId, limit, offset], (err, rows) => {
                    if(err) {
                        reject(createResponse(false, null, err));
                        return;
                    }
                    
                    // Get total count for pagination
                    pool.get('SELECT COUNT(*) as total FROM comments WHERE blog_post_id = ?', [postId], (countErr, countRow) => {
                        if(countErr) {
                            reject(createResponse(false, null, countErr));
                            return;
                        }
                        
                        const totalPages = Math.ceil(countRow.total / limit);
                        const result = {
                            comments: rows,
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
        } catch (ex) {
            console.error('Error fetching comments:', ex);
            return createResponse(false, null, ex);
        }
    }
}

module.exports = CommentService; 