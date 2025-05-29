const BlogDAO = require('../DAOs/blogDAO');
const { createResponse } = require('../Utilities/createResponse');

class BlogService {
    constructor() {
        this.blogDAO = new BlogDAO();
    }

    async createPost(userId, postData) {
        try {
            const blogData = {
                user_id: userId,
                title: postData.title,
                content: postData.content, 
                date_of_visit: postData.date_of_visit,
                country_name: postData.country_name
            };
            
            const result = await this.blogDAO.create(blogData);
            return result;
        } catch (ex) {
            console.error('Error creating blog post:', ex);
            return createResponse(false, null, ex);
        }
    }

    async getAllPosts(page, limit, sortBy) {
        try {
            const result = await this.blogDAO.getAll(page, limit, sortBy);
            return result;
        } catch (ex) {
            console.error('Error fetching all posts:', ex);
            return createResponse(false, null, ex);
        }
    }

    async likePost(userId, postId) {
        try {
            const result = await this.blogDAO.likePost(userId, postId, true);
            return result;
        } catch (ex) {
            console.error('Error liking post:', ex);
            return createResponse(false, null, ex);
        }
    }

    async dislikePost(userId, postId) {
        try {
            const result = await this.blogDAO.likePost(userId, postId, false);
            return result;
        } catch (ex) {
            console.error('Error disliking post:', ex);
            return createResponse(false, null, ex);
        }
    }
}

module.exports = BlogService; 