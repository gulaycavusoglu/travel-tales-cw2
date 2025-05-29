const { createResponse } = require('../Utilities/createResponse');
const pool = require('../Database/dbManagement');

class CommentDAO {
    constructor() {

    }

    async create(commentData) {
        return new Promise((resolve, reject) => {
            const { blog_post_id, user_id, content } = commentData;
            
            pool.run(
                'INSERT INTO comments (blog_post_id, user_id, content) VALUES (?, ?, ?)',
                [blog_post_id, user_id, content],
                function(err) {
                    if(err) {
                        console.error('Error creating comment:', err);
                        reject(createResponse(false, null, err));
                        return;
                    }
                    resolve(createResponse(true, { id: this.lastID }));
                }
            );
        });
    }
}

module.exports = CommentDAO; 