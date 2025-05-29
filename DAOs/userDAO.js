const {createResponse} = require('../Utilities/createResponse')
const pool = require('../Database/dbManagement');


class UserDAO{


    constructor(){

    }
    async create(req){
       return new Promise((resolve, reject) =>{
         pool.run('INSERT INTO users (name, surname, email, password) VALUES (?, ?, ?, ?)', [req.body.name, req.body.surname, req.body.email, req.body.password], function(err) {
            if(err) {
                console.error('Error creating user:', err);
                reject(createResponse(false, null, err));
                return;
            }
            resolve(createResponse(true, { id: this.lastID }, null));
         })
       })
    }
    async getByEmail(req){
       try{
            return new Promise((resolve, reject) =>{
                pool.get('SELECT * FROM users WHERE email = ?', [req.body.email], (err, row) => {
                    if(err) {
                        reject(createResponse(false, null, err));
                        return;
                    }
                    if(!row) {
                        resolve(createResponse(false, null, 'User not found'));
                        return;
                    }
                    resolve(createResponse(true, row));
                })
            })
       }catch(ex)
       {
            console.error(ex)
            return createResponse(false, null, ex);
       }
    }

    async getFollowers(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT u.id, u.name, u.surname, u.email
                FROM users u
                JOIN follows f ON u.id = f.follower_id
                WHERE f.followed_id = ?
            `;
            
            pool.all(query, [userId], (err, rows) => {
                if(err) {
                    reject(createResponse(false, null, err));
                    return;
                }
                resolve(createResponse(true, rows));
            });
        });
    }

    async getFollowing(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT u.id, u.name, u.surname, u.email
                FROM users u
                JOIN follows f ON u.id = f.followed_id
                WHERE f.follower_id = ?
            `;
            
            pool.all(query, [userId], (err, rows) => {
                if(err) {
                    reject(createResponse(false, null, err));
                    return;
                }
                resolve(createResponse(true, rows));
            });
        });
    }

    async followUser(followerId, followedId) {
        return new Promise((resolve, reject) => {
            // Check if already following
            pool.get('SELECT id FROM follows WHERE follower_id = ? AND followed_id = ?', 
                [followerId, followedId], 
                (err, row) => {
                    if(err) {
                        reject(createResponse(false, null, err));
                        return;
                    }

                    if(row) {
                        resolve(createResponse(true, { message: 'Already following this user' }));
                        return;
                    }

                    // Create follow relationship
                    pool.run('INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)', 
                        [followerId, followedId], 
                        function(err) {
                            if(err) {
                                reject(createResponse(false, null, err));
                                return;
                            }
                            resolve(createResponse(true, { id: this.lastID }));
                        }
                    );
                }
            );
        });
    }
}

module.exports = UserDAO;