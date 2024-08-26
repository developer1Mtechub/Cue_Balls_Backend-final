const { pool } = require("../../config/db.config");
const crypto = require("crypto");
const WelcomeEmail = require("../../welcomeEmail");
const VerificationEmail = require("../../emailVerification");

// user Registration 
exports.registerCustomer = async (req, res, next) => {
    const client = await pool.connect();
    try {
          // Email 
        //   const subject="Welcome Email"
        
        //   const date = new Date()
        //   const month = date.toLocaleString('default', { month: 'short' });
        //   const day = date.getDate()
        //   const year = date.getFullYear()
        //   const dateToday = month+" "+day+","+year
        

        //   PaymentSuccess('rimshanimo22@gmail.com', subject,443,200,44,33,dateToday)
        //   res.json({ error: true, data: [], message: "Catch eror" });
      
          const {
            email,
            user_name,
            password,
            signup_type,
            access_token

        } = req.body;
        // const company_user = false;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide User Email" });

        } else {
            const userDataCheck = await pool.query("SELECT * FROM users WHERE email=$1",
                [email]);

            if (userDataCheck.rows.length === 0) {
                let hashedPassword = null
                if (password === null || password === "" || password === undefined) {
                } else {
                    const salt = "mySalt";
                    hashedPassword = crypto
                        .createHash("sha256")
                        .update(password + salt)
                        .digest("hex");
                }
                const deleted_user = false;
                const account_status = "active";
                const played_games = 0;
                const win_games = 0;

                const userData = await pool.query("INSERT INTO users(user_name,email,password,signup_type,access_token,deleted_user,account_status,played_games,win_games) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",
                    [
                        user_name || null,
                        email,
                        hashedPassword || null,
                        signup_type,
                        access_token || null,
                        deleted_user,
                        account_status,
                        played_games,
                        win_games
                    ])
                if (userData.rows.length === 0) {
                    res.json({ error: true, data: [], message: "Can't Create User" });


                } else {
                    const data = userData.rows[0]
                    const user_id = userData.rows[0].user_id
                    const balance = 0;
                    // create wallet
                    const walletData = await pool.query("INSERT INTO wallet(user_id,balance) VALUES($1,$2) returning *",
                        [
                            user_id,
                            balance
                        ])

                        // Email 
                        const subject="Welcome Email"
                        WelcomeEmail(email, subject)

                    res.json({
                        error: false,
                        data,
                        wallet: walletData.rows[0],
                        message: "User Created Successfully"
                    });


                }




            } else {
                console.log(userDataCheck.rows[0].deleted_user)
                const deletedStatus = userDataCheck.rows[0].deleted_user
                if (deletedStatus === true || deletedStatus === "true") {
                    // user has been deleted response 
                    res.json({ error: true, data: [], message: "This email has account deleted" });

                } else {
                    const data = userDataCheck.rows[0]
                    res.json({ error: true, data, message: "Email Already Exist" });
                }


            }
        }

    }
    catch (err) {
        console.log(err)
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }

}
exports.signinCustomer = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
            password,
            signin_type,
            access_token

        } = req.body;
        // const company_user = false;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const userDataCheck = await pool.query("SELECT * FROM users WHERE email=$1",
                [email]);

            if (userDataCheck.rows.length === 0) {
                res.json({ error: true, data: [], message: "No User exist for this email" });


            } else {
                if (userDataCheck.rows[0].account_status === "inactive") {
                    res.json({ error: true, data: [], message: "Your account is inactive" });
                } else {
                    const signup_type = userDataCheck.rows[0].signup_type
                    const user_id = userDataCheck.rows[0].user_id


                    if (signin_type === "google" || signin_type === "apple") {
                        if (signup_type === signin_type) {
                            let query = 'UPDATE users SET ';
                            let index = 2;
                            let values = [user_id];

                            if (access_token) {
                                query += `access_token = $${index} , `;
                                values.push(access_token)
                                index++
                            }
                            query += 'WHERE user_id = $1 RETURNING*'
                            query = query.replace(/,\s+WHERE/g, " WHERE");


                            const result = await pool.query(query, values)
                            if (result.rows.length === 0) {
                                res.json({ error: true, data: [], message: "Something went wrong" });

                            } else {
                                res.json({ error: false, data: result.rows[0], message: "User Login Successfully" });

                            }
                        } else {
                            if (signin_type === "google" || signin_type === "apple") {
                                let query = 'UPDATE users SET ';
                                let index = 2;
                                let values = [user_id];

                                if (access_token) {
                                    query += `access_token = $${index} , `;
                                    values.push(access_token)
                                    index++
                                }
                                if (signin_type) {
                                    query += `signup_type = $${index} , `;
                                    values.push(signin_type)
                                    index++
                                }
                                query += 'WHERE user_id = $1 RETURNING*'
                                query = query.replace(/,\s+WHERE/g, " WHERE");


                                const result = await pool.query(query, values)
                                if (result.rows.length === 0) {
                                    res.json({ error: true, data: [], message: "Something went wrong" });

                                } else {
                                    res.json({ error: false, data: result.rows[0], message: "User Login Successfully" });

                                }
                            } else {
                                res.json({ error: true, data: userDataCheck.rows[0], message: "Required Verification User has sign up with different Sign up type" });

                            }
                            // not signed up with google 

                        }
                    } else {
                        if (signup_type === "google" || signup_type === "apple") {
                            // sign up with email but login with google
                            res.json({ error: true, data: userDataCheck.rows[0], message: "Required Verification User has sign up with different Sign up type" });
                        } else {
                            // login 
                            const salt = "mySalt";
                            const hashedPasswordFromDb = userDataCheck.rows[0].password;
                            const hashedUserEnteredPassword = crypto
                                .createHash("sha256")
                                .update(password + salt)
                                .digest("hex");


                            if (hashedPasswordFromDb === hashedUserEnteredPassword) {
                                res.json({
                                    error: false,
                                    data: userDataCheck.rows[0],
                                    message: "Login Successfully",
                                });
                            } else {
                                res.json({ error: true, message: "Invalid Credentials" });

                            }

                        }
                    }
                }
            }
        }
    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
exports.verifyEmail = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
        } = req.body;
        // const company_user = false;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const userDataCheck = await pool.query("SELECT * FROM users WHERE email=$1",
                [email]);

            if (userDataCheck.rows.length === 0) {
                res.json({ error: true, message: "Email is not Registered" });
            } else {


                const resetLink = Math.floor(100000 + Math.random() * 900000).toString();
                const user_name = email.split("@")[0];
                const subject = "Verify Email"
                const message = "You have requested to reset your password. Here is your OTP code for password reset."
                const userDataEmailCheck = await pool.query("SELECT * FROM otp_verification_user WHERE email=$1",
                    [email]);
                if (userDataEmailCheck.rows.length === 0) {
                    // res.json({ error: true, message: "Email is not Registered" });
                    const userData = await pool.query("INSERT INTO otp_verification_user(email,otp) VALUES($1,$2) returning *",
                        [
                            email,
                            resetLink
                        ])
                    if (userData.rows.length === 0) {
                        // res.json({ error: true, data: [], message: "Can't Save OTP" });
                        res.json({ error: true, otp: resetLink, message: "Cant Verify Right Now!" });
                        // Emailtemplate(email, resetLink, subject, message, user_name)
                    } else {
                        res.json({ error: false, otp: resetLink, message: "Email sent successfully!" });
                        VerificationEmail(email, subject,resetLink)
                    }

                } else {
                    const userData = await pool.query("UPDATE otp_verification_user SET otp=$1, created_at=CURRENT_TIMESTAMP WHERE email=$2 returning *",
                        [
                            resetLink,
                            email
                        ])
                    if (userData.rows.length === 0) {
                        // res.json({ error: true, data: [], message: "Can't Save OTP" });
                        res.json({ error: true, otp: resetLink, message: "Cant Verify Right Now!" });
                        // Emailtemplate(email, resetLink, subject, message, user_name)
                    } else {
                        res.json({ error: false, otp: resetLink, message: "Email sent successfully!" });
                        VerificationEmail(email, subject,resetLink)
                    }

                }

            }
        }

    }
    catch (err) {
        res.json({ error: true, data: err, message: "Catch eror" });

    } finally {
        client.release();
    }
}
exports.verificationOtp = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
            otp
        } = req.body;
        // const company_user = false;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const userDataCheck = await pool.query("SELECT * FROM otp_verification_user WHERE email=$1",
                [email]);

            if (userDataCheck.rows.length === 0) {
                res.json({ error: true, message: "Didn't Get any OTP for this email!" });
            } else {


                const resetLink = userDataCheck.rows[0].otp;
                const createdAt = userDataCheck.rows[0].created_at;
                const currentTime = new Date();
                const timeDifference = (currentTime - createdAt) / 1000 / 60; // difference in minutes

                if (timeDifference > 15) {
                    res.json({ error: true, message: "OTP has expired!" });
                } else if (resetLink === otp) {
                    res.json({ error: false, otp: resetLink, message: "OTP Verified Successfully!" });
                } else {
                    res.json({ error: true, otp: resetLink, message: "OTP is not Correct!" });
                }

            }
        }

    }
    catch (err) {
        res.json({ error: true, data: err, message: "Catch eror" });

    } finally {
        client.release();
    }
}
exports.resetPassword = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
            password
        } = req.body;
        const salt = "mySalt";
        const hashedPassword = crypto
            .createHash("sha256")
            .update(password + salt)
            .digest("hex");
        // const company_user = false;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const query1 = 'SELECT * FROM users WHERE email =$1'
            const result1 = await pool.query(query1, [email]);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "Email Doesnot Exist" });

            } else {
                const signup_type = result1.rows[0].signup_type;
                if (signup_type === "email") {
                    // if email 
                    let query = 'UPDATE users SET ';
                    let index = 2;
                    let values = [email];

                    if (hashedPassword) {
                        query += `password = $${index} , `;
                        values.push(hashedPassword)
                        index++
                    }
                    query += 'WHERE email = $1 RETURNING*'
                    query = query.replace(/,\s+WHERE/g, " WHERE");
                    const result = await pool.query(query, values)

                    if (result.rows.length === 0) {
                        res.json({ error: true, data: [], message: "Something went wrong" });

                    } else {
                        res.json({ error: false, data: result.rows, message: "Password reset successfully!" });

                    }
                } else {
                    // if google and apple 
                    let query = 'UPDATE users SET ';
                    let signup_type = "email"

                    let index = 2;
                    let values = [email];

                    if (hashedPassword) {
                        query += `password = $${index} , `;
                        values.push(hashedPassword)
                        index++
                    }
                    if (signup_type) {
                        query += `signup_type = $${index} , `;
                        values.push(signup_type)
                        index++
                    }
                    query += 'WHERE email = $1 RETURNING*'
                    query = query.replace(/,\s+WHERE/g, " WHERE");
                    const result = await pool.query(query, values)

                    if (result.rows.length === 0) {
                        res.json({ error: true, data: [], message: "Something went wrong" });

                    } else {
                        res.json({ error: false, data: result.rows, message: "Password reset successfully!" });

                    }

                }




            }


        }

    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
exports.resetPasswordProfile = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
            old_password,
            new_password,
        } = req.body;
        const salt = "mySalt";
        const hashedOldPassword = crypto
            .createHash("sha256")
            .update(old_password + salt)
            .digest("hex");
        const hashedPassword = crypto
            .createHash("sha256")
            .update(new_password + salt)
            .digest("hex");
        // const company_user = false;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const query1 = 'SELECT * FROM users WHERE email =$1'
            const result1 = await pool.query(query1, [email]);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "Email Doesnot Exist" });

            } else {
                const signup_type = result1.rows[0].signup_type;
                if (signup_type === "email") {
                    // if email 
                    // check old password 
                    const hashedPasswordFromDb = result1.rows[0].password;
                    if (hashedPasswordFromDb === hashedOldPassword) {

                        let query = 'UPDATE users SET ';
                        let index = 2;
                        let values = [email];

                        if (hashedPassword) {
                            query += `password = $${index} , `;
                            values.push(hashedPassword)
                            index++
                        }
                        query += 'WHERE email = $1 RETURNING*'
                        query = query.replace(/,\s+WHERE/g, " WHERE");
                        const result = await pool.query(query, values)

                        if (result.rows.length === 0) {
                            res.json({ error: true, data: [], message: "Something went wrong" });

                        } else {
                            res.json({ error: false, data: result.rows, message: "Password reset successfully!" });

                        }
                    } else {
                        res.json({ error: true, message: "Old Password is not correct" });
                    }
                } else {
                    // if google and apple 
                    let query = 'UPDATE users SET ';
                    let signup_type = "email"

                    let index = 2;
                    let values = [email];

                    if (hashedPassword) {
                        query += `password = $${index} , `;
                        values.push(hashedPassword)
                        index++
                    }
                    if (signup_type) {
                        query += `signup_type = $${index} , `;
                        values.push(signup_type)
                        index++
                    }
                    query += 'WHERE email = $1 RETURNING*'
                    query = query.replace(/,\s+WHERE/g, " WHERE");
                    const result = await pool.query(query, values)

                    if (result.rows.length === 0) {
                        res.json({ error: true, data: [], message: "Something went wrong" });

                    } else {
                        res.json({ error: false, data: result.rows, message: "Password reset successfully!" });

                    }

                }




            }


        }

    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// admin sign in 
exports.signinAdmin = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
            password,

        } = req.body;
        // const company_user = false;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const userDataCheck = await pool.query("SELECT * FROM users WHERE email=$1 AND signup_type=$2",
                [email, 'admin']);

            if (userDataCheck.rows.length === 0) {
                res.json({ error: true, data: [], message: "No Admin exist for this email" });


            } else {
                // login 
                const hashedPasswordFromDb = userDataCheck.rows[0].password;
                if (hashedPasswordFromDb === password) {
                    res.json({
                        error: false,
                        data: userDataCheck.rows[0],
                        message: "Login Successfully",
                    });
                } else {
                    res.json({ error: true, message: "Invalid Credentials" });

                }



            }
        }
    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
exports.resetPasswordAdmin = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
            password
        } = req.body;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const query1 = 'SELECT * FROM users WHERE email =$1 AND signup_type=$2'
            const result1 = await pool.query(query1, [email, 'admin']);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "Email Doesnot Exist for ADMIN" });

            } else {
                // if email 
                let query = 'UPDATE users SET ';
                let index = 2;
                let values = [email];

                if (password) {
                    query += `password = $${index} , `;
                    values.push(password)
                    index++
                }
                query += 'WHERE email = $1 RETURNING*'
                query = query.replace(/,\s+WHERE/g, " WHERE");
                const result = await pool.query(query, values)

                if (result.rows.length === 0) {
                    res.json({ error: true, data: [], message: "Something went wrong" });

                } else {
                    res.json({ error: false, data: result.rows, message: "Password reset successfully!" });

                }
            }

        }

    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// Profile Update Password 
exports.resetPasswordAdminLoggedUser = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email,
            old_password,
            new_password,
        } = req.body;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const query1 = 'SELECT * FROM users WHERE email =$1 AND signup_type=$2'
            const result1 = await pool.query(query1, [email, 'admin']);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "Email Doesnot Exist for ADMIN" });

            } else {
                // check old password 
                const hashedPasswordFromDb = result1.rows[0].password;
                if (hashedPasswordFromDb === old_password) {
                    // if email 
                    let query = 'UPDATE users SET ';
                    let index = 2;
                    let values = [email];

                    if (new_password) {
                        query += `password = $${index} , `;
                        values.push(new_password)
                        index++
                    }
                    query += 'WHERE email = $1 RETURNING*'
                    query = query.replace(/,\s+WHERE/g, " WHERE");
                    const result = await pool.query(query, values)

                    if (result.rows.length === 0) {
                        res.json({ error: true, data: [], message: "Something went wrong" });

                    } else {
                        res.json({ error: false, data: result.rows, message: "Password reset successfully!" });

                    }
                } else {
                    res.json({ error: true, message: "Old Password is not correct" });
                }

            }

        }

    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
//Profile Update User Name 
exports.updateUserName = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            user_id,
            user_name
        } = req.body;
        if (user_id === null || user_id === "" || user_id === undefined) {
            res.json({ error: true, message: "Please Provide user_id" });

        } else {
            const query1 = 'SELECT * FROM users WHERE user_id =$1'
            const result1 = await pool.query(query1, [user_id]);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "User Doesnot Exist" });

            } else {
                // if user_id 
                let query = 'UPDATE users SET ';
                let index = 2;
                let values = [user_id];

                if (user_name) {
                    query += `user_name = $${index} , `;
                    values.push(user_name)
                    index++
                }
                query += 'WHERE user_id = $1 RETURNING*'
                query = query.replace(/,\s+WHERE/g, " WHERE");
                const result = await pool.query(query, values)

                if (result.rows.length === 0) {
                    res.json({ error: true, data: [], message: "Something went wrong" });

                } else {
                    res.json({ error: false, data: result.rows, message: "User Name Updated successfully!" });

                }
            }

        }

    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// get all users 
exports.getAllUsers = async (req, res) => {
    const client = await pool.connect();
    try {
        // const query1 = 'SELECT * FROM users WHERE deleted_user=$1 AND signup_type != $2 ORDER BY created_at DESC'
        const query1 = 'SELECT * FROM users WHERE deleted_user=$1 ORDER BY created_at DESC'

        // const result1 = await pool.query(query1, [false,'admin']);
        const result1 = await pool.query(query1,[false]);

        if (result1.rows.length === 0) {
            res.json({ error: true, message: "No Users Found" });

        } else {
            res.json({ error: false, data: result1.rows, message: "Users Found" });

        }
    }
    catch (err) {
        console.log(err)
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// get all deleted users 
exports.getAllDeletedUsers = async (req, res) => {
    const client = await pool.connect();
    try {
        const query1 = 'SELECT *, EXTRACT(DAY FROM CURRENT_DATE - deleted_at) AS days_since_deleted FROM users WHERE deleted_user=$1 ORDER BY created_at DESC';
        const result1 = await pool.query(query1, [true]);
        if (result1.rows.length === 0) {
            res.json({ error: true, message: "No Users Found" });
        } else {
            res.json({ error: false, data: result1.rows, message: "Users Found" });
        }
    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// get all deleted users pagination 
exports.getAllDeletedUsersPagination = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            page,
            limit
        } = req.query;
        const query1 = 'SELECT *, EXTRACT(DAY FROM CURRENT_DATE - deleted_at) AS days_since_deleted FROM users WHERE deleted_user=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3'
        const result1 = await pool.query(query1, [true, limit, page]);
        if (result1.rows.length === 0) {
            res.json({ error: true, message: "No Users Found" });

        } else {
            const query2 = 'SELECT * FROM users WHERE deleted_user=$1'
            const result2 = await pool.query(query2, [true]);
            const total = result2.rows.length
            res.json({ error: false, data: result1.rows, total_users: total, message: "Users Found" });

        }
    }
    catch (err) {
        console.log(err)
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// delete user api and make delete status of user true after 90 days delete user from db
exports.deleteUser = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            email
        } = req.body;
        if (email === null || email === "" || email === undefined) {
            res.json({ error: true, message: "Please Provide Email" });

        } else {
            const query1 = 'SELECT * FROM users WHERE email =$1'
            const result1 = await pool.query(query1, [email]);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "Email Doesnot Exist" });

            } else {
                const deleted_at = new Date();
                // if email 
                let query = 'UPDATE users SET ';
                let index = 2;
                let values = [email];

                if (true) {
                    query += `deleted_user = $${index} , `;
                    values.push(true)
                    index++
                }
                if (deleted_at) {
                    query += `deleted_at = $${index} , `;
                    values.push(deleted_at)
                    index++
                }
                query += 'WHERE email = $1 RETURNING*'
                query = query.replace(/,\s+WHERE/g, " WHERE");
                const result = await pool.query(query, values)

                if (result.rows.length === 0) {
                    res.json({ error: true, data: [], message: "Something went wrong" });

                } else {
                    res.json({ error: false, data: result.rows, message: "User Deleted successfully!" });

                }
            }

        }

    }
    catch (err) {
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}


// get all users pagination 
exports.getAllUsersPagination = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            page,
            limit
        } = req.query;
        const offset = (page - 1) * limit;
        const query1 = 'SELECT * FROM users WHERE deleted_user=$1 AND signup_type != $2 ORDER BY user_id DESC LIMIT $3 OFFSET $4'
        const result1 = await pool.query(query1, [false,'admin', limit, offset]);
        if (result1.rows.length === 0) {
            res.json({ error: true, message: "No Users Found" });

        } else {
            const query2 = 'SELECT * FROM users WHERE deleted_user=$1 AND signup_type != $2'
            const result2 = await pool.query(query2, [false,'admin']);
            const total = result2.rows.length
            res.json({ error: false, data: result1.rows, total_users: total, message: "Users Found" });

        }
    }
    catch (err) {
        console.log(err)
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
//update user account status
exports.updateUserAccountStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            user_id,
            account_status
        } = req.body;
        if (user_id === null || user_id === "" || user_id === undefined) {
            res.json({ error: true, message: "Please Provide user_id" });

        } else {
            const query1 = 'SELECT * FROM users WHERE user_id =$1'
            const result1 = await pool.query(query1, [user_id]);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "User Doesnot Exist" });

            } else {
                // if user_id 
                let query = 'UPDATE users SET ';
                let index = 2;
                let values = [user_id];

                if (account_status) {
                    query += `account_status = $${index} , `;
                    values.push(account_status)
                    index++
                }
                query += 'WHERE user_id = $1 RETURNING*'
                query = query.replace(/,\s+WHERE/g, " WHERE");
                const result = await pool.query(query, values)

                if (result.rows.length === 0) {
                    res.json({ error: true, data: [], message: "Something went wrong" });

                } else {
                    res.json({ error: false, data: result.rows, message: "Account Status Updated successfully!" });

                }
            }

        }

    }
    catch (err) {
        console.log(err)
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// get user by year 
exports.getUsersByYear = async (req, res) => {
    const client = await pool.connect();
    try {
        const year = req.query.year; // assuming the year is passed as a URL parameter
        const query = `
            SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
            FROM users
            WHERE EXTRACT(YEAR FROM created_at) = $1 AND signup_type != $2
            GROUP BY month
            ORDER BY month ASC
        `;
        const result = await pool.query(query, [year,'admin']);
        const counts = Array(12).fill(0); // initialize an array with 12 zeros
        for (const row of result.rows) {
            counts[row.month - 1] = row.count; // subtract 1 because months are 1-indexed
        }
        res.json({
            error: false,
            data: {
                January: counts[0],
                February: counts[1],
                March: counts[2],
                April: counts[3],
                May: counts[4],
                June: counts[5],
                July: counts[6],
                August: counts[7],
                September: counts[8],
                October: counts[9],
                November: counts[10],
                December: counts[11]
            },
            message: "Users Found"
        });
    } catch (err) {
        res.json({ error: true, data: [], message: "Catch error" });
    } finally {
        client.release();
    }
}
// get top 5 recent registered users 
exports.getTop5RecentRegisteredUsers = async (req, res) => {
    const client = await pool.connect();
    try {
        const query1 = 'SELECT * FROM users WHERE deleted_user=$1 ORDER BY created_at DESC LIMIT 5'
        const result1 = await pool.query(query1, [false]);
        if (result1.rows.length === 0) {
            res.json({ error: true, message: "No Users Found" });

        } else {
            res.json({ error: false, data: result1.rows, message: "Users Found" });

        }
    }
    catch (err) {
        console.log(err)
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}
// get specific user by user id 
exports.getSpecificUserById = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            user_id
        } = req.query;
        if (user_id === null || user_id === "" || user_id === undefined) {
            res.json({ error: true, message: "Please Provide User Id" });

        } else {
            const query1 = 'SELECT * FROM users WHERE user_id =$1'
            const result1 = await pool.query(query1, [user_id]);
            const query2 = 'SELECT * FROM wallet WHERE user_id =$1'
            const result2 = await pool.query(query2, [user_id]);
            if (result1.rows.length === 0) {
                res.json({ error: true, message: "User Id Doesnot Exist" });

            } else {
                res.json({ error: false, 
                    data: result1.rows,
                    wallet: Number(result2.rows[0].balance||0) % 1 === 0 ? Number(result2.rows[0].balance||0) : Number(result2.rows[0].balance||0).toFixed(2)
        //   wallet:result2.rows[0].balance||0

                    , message: "User Found" });

            }

        }

    }
    catch (err) {
        console.log(err)
        res.json({ error: true, data: [], message: "Catch eror" });

    } finally {
        client.release();
    }
}