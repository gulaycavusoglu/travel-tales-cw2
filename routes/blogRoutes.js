const express = require('express');
const router = express.Router();
const BlogService = require('../Services/blogService');
const CommentService = require('../Services/commentService');
const UserService = require('../Services/userService');
const { authenticate, isAuthenticated, isResourceOwner } = require('../Utilities/authMiddleware');
const pool = require('../Database/dbManagement');
const { createResponse } = require('../Utilities/createResponse');
const axios = require('axios');

const blogService = new BlogService();
const commentService = new CommentService();
const userService = new UserService();

// Helper function to get a blog post by ID
const getPostById = (postId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT b.*, u.name as author_name, u.surname as author_surname,
                  (SELECT COUNT(*) FROM likedPosts WHERE blog_post_id = b.id AND is_like = 1) as likes,
                  (SELECT COUNT(*) FROM likedPosts WHERE blog_post_id = b.id AND is_like = 0) as dislikes
            FROM blogPost b
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        `;
        pool.get(query, [postId], (err, row) => {
            if(err) {
                reject(createResponse(false, null, err));
                return;
            }
            if(!row) {
                resolve(createResponse(false, null, 'Blog post not found'));
                return;
            }
            resolve(createResponse(true, row));
        });
    });
};

// Get all blog posts (homepage)
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sort || 'newest';
    const countryName = req.query.country || '';
    
    let result = await blogService.getAllPosts(page, limit, sortBy);
    
    // If country filter is applied, filter posts client-side
    if (countryName && result.success) {
        const filteredPosts = result.data.posts.filter(post => 
            post.country_name && post.country_name.toLowerCase().includes(countryName.toLowerCase())
        );
        
        // Update pagination for filtered results
        const total = filteredPosts.length;
        const totalPages = Math.ceil(total / limit);
        
        result.data.posts = filteredPosts;
        result.data.pagination = {
            total,
            page,
            limit,
            totalPages
        };
    }

    // Determine which authors the current user is following
    let followingAuthors = {};
    if (req.session.user && result.success && result.data.posts.length > 0) {
        const following = await userService.getFollowing(req.session.user.id);
        if (following.success) {
            for (const post of result.data.posts) {
                followingAuthors[post.user_id] = following.data.some(u => u.id === post.user_id);
            }
        }
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    res.render('home', { 
        posts: result.success ? result.data.posts : [],
        pagination: result.success ? result.data.pagination : { page: 1, totalPages: 1 },
        sortBy,
        user: req.session.user,
        followingAuthors,
        selectedCountry: countryName
    });
});

// Create blog post form
router.get('/post/create', isAuthenticated, async (req, res) => {
    res.render('createPost', {
        user: req.session.user,
        formData: {}
    });
});

// Submit new blog post
router.post('/post', authenticate, async (req, res) => {
    const userId = req.session.user ? req.session.user.id : req.user.id;
    const { title, content, country_name, date_of_visit } = req.body;

    const result = await blogService.createPost(userId, { title, content, country_name, date_of_visit });

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }

    if (result.success) {
        return res.redirect(`/post/${result.data.id}`);
    } else {
        return res.render('createPost', {
            error: result.error || 'Failed to create post',
            formData: { title, content, country_name, date_of_visit },
            user: req.session.user
        });
    }
});

// View single blog post
router.get('/post/:id', async (req, res) => {
    const postId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const commentsLimit = parseInt(req.query.commentsLimit) || 10;
    
    const post = await getPostById(postId);
    if (!post.success) {
        return res.status(404).render('error', { message: 'Post not found' });
    }
    
    const comments = await commentService.getCommentsByPostId(postId, page, commentsLimit);
    
    // Fetch country details if country_name is available
    let countryDetails = null;
    if (post.data && post.data.country_name) {
        try {
            const API_KEY = process.env.CW1_API_KEY || 'demo-api-key';
            const baseUrl = `http://country-info:7000/api/v3.1/name/${encodeURIComponent(post.data.country_name)}`;
            
            console.log('Fetching country details for post:', baseUrl);
            
            const response = await axios.get(baseUrl, {
                headers: {
                    Authorization: `Bearer ${API_KEY}`
                }
            });
            
            if (response.data && response.data.success && response.data.data) {
                const c = response.data.data;
                
                // Format languages as a readable string
                let languages = 'N/A';
                if (c.languages && typeof c.languages === 'object') {
                    languages = Object.values(c.languages).join(', ');
                }
                
                countryDetails = {
                    name: c.name,
                    flag: c.flags,
                    capital: c.capital,
                    languages: languages
                };
            }
        } catch (err) {
            console.error('Error fetching country details:', err.message);
            // Continue rendering even if country details fetch fails
        }
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({
            success: true,
            data: {
                post: post.data,
                comments: comments.success ? comments.data : { comments: [], pagination: {} },
                countryDetails
            }
        });
    }
    
    // Check if current user is the author
    const isAuthor = req.session.user && req.session.user.id === post.data.user_id;
    
    res.render('viewPost', {
        post: post.data,
        comments: comments.success ? comments.data.comments : [],
        commentsPagination: comments.success ? comments.data.pagination : { page: 1, totalPages: 1 },
        isAuthor,
        user: req.session.user,
        countryDetails
    });
});

// Edit blog post form
router.get('/post/:id/edit', isAuthenticated, isResourceOwner('post', 'id'), async (req, res) => {
    const postId = req.params.id;
    const post = await getPostById(postId);
    
    if (!post.success) {
        return res.status(404).render('error', { message: 'Post not found' });
    }
    
    res.render('editPost', {
        post: post.data,
        user: req.session.user
    });
});

// Update blog post
router.put('/post/:id', authenticate, isResourceOwner('post', 'id'), async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.user ? req.session.user.id : req.user.id;
    const { title, content, date_of_visit, country_name } = req.body;
    
    // Direct database update since updatePost was removed
    const result = await new Promise((resolve, reject) => {
        // First check if user is the owner of the post
        pool.get('SELECT user_id FROM blogPost WHERE id = ?', [postId], (err, row) => {
            if(err) {
                reject(createResponse(false, null, err));
                return;
            }
            
            if(!row) {
                resolve(createResponse(false, null, 'Blog post not found'));
                return;
            }
            
            if(row.user_id !== userId) {
                resolve(createResponse(false, null, 'Not authorized to edit this post'));
                return;
            }
            
            // Update the post
            pool.run(
                `UPDATE blogPost 
                 SET title = ?, content = ?, date_of_visit = ?, country_name = ? 
                 WHERE id = ?`,
                [title, content, date_of_visit, country_name, postId],
                function(err) {
                    if(err) {
                        reject(createResponse(false, null, err));
                        return;
                    }
                    resolve(createResponse(true, { id: postId }));
                }
            );
        });
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    if (result.success) {
        return res.redirect(`/post/${postId}`);
    } else {
        return res.render('editPost', {
            error: result.error || 'Failed to update post',
            post: { id: postId, title, content, date_of_visit, country_name },
            user: req.session.user
        });
    }
});

// Delete blog post
router.delete('/post/:id', authenticate, isResourceOwner('post', 'id'), async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.user ? req.session.user.id : req.user.id;
    
    // Direct database delete since deletePost was removed
    const result = await new Promise((resolve, reject) => {
        // First check if user is the owner of the post
        pool.get('SELECT user_id FROM blogPost WHERE id = ?', [postId], (err, row) => {
            if(err) {
                reject(createResponse(false, null, err));
                return;
            }
            
            if(!row) {
                resolve(createResponse(false, null, 'Blog post not found'));
                return;
            }
            
            if(row.user_id !== userId) {
                resolve(createResponse(false, null, 'Not authorized to delete this post'));
                return;
            }
            
            // Delete the post
            pool.run('DELETE FROM blogPost WHERE id = ?', [postId], function(err) {
                if(err) {
                    reject(createResponse(false, null, err));
                    return;
                }
                resolve(createResponse(true, { message: 'Blog post deleted successfully' }));
            });
        });
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    if (result.success) {
        return res.redirect('/');
    } else {
        return res.status(400).render('error', { message: result.error || 'Failed to delete post' });
    }
});

// Add comment to a blog post
router.post('/post/:id/comment', authenticate, async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.user ? req.session.user.id : req.user.id;
    const { content } = req.body;
    
    const result = await commentService.createComment(userId, postId, content);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    if (result.success) {
        return res.redirect(`/post/${postId}`);
    } else {
        return res.status(400).render('error', { message: result.error || 'Failed to add comment' });
    }
});

// Like a blog post
router.post('/post/:id/like', authenticate, async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.user ? req.session.user.id : req.user.id;
    
    const result = await blogService.likePost(userId, postId);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    return res.redirect(`/post/${postId}`);
});

// Dislike a blog post
router.post('/post/:id/dislike', authenticate, async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.user ? req.session.user.id : req.user.id;
    
    const result = await blogService.dislikePost(userId, postId);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    return res.redirect(`/post/${postId}`);
});

module.exports = router; 