// comment added by usama
const express = require("express");
const app = express();
const { pool } = require("./app/config/db.config");
const cron = require("node-cron");
const uuidv4 = require("uuid").v4;
const axios = require("axios");
const socket = require("socket.io");
const http = require("http");
const server = http.createServer(app);

// Cron jobs
const PORT = 3016;
const bodyParser = require("body-parser");
const paypal = require("paypal-rest-sdk");

const {
  user_name_auth,
  password_auth,
  mode,
  getAccessToken,
  PaypalSandBoxUrlmV2,
  PaypalSandBoxUrl,
} = require("./app/paypal_keys");

paypal.configure({
  mode: mode, //sandbox or live
  client_id: user_name_auth,
  client_secret: password_auth,
});
require("dotenv").config();
const cors = require("cors");
const PaymentSuccess = require("./app/paymentSuccessEmail");

app.use(
  cors({
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    origin: "*",
  })
);

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

//app.use(
//cors({
//  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
// })
//);

app.use("/uploads", express.static("uploads"));

app.use("/upload-image", require("./app/upload-image"));

app.use("/user", require("./app/routes/Users/customerRoute"));
app.use("/game", require("./app/routes/Games/gamesRoute"));
app.use("/feedback", require("./app/routes/Feedback/feedbackRoute"));

app.use("/game_user", require("./app/routes/Game_Users/gamesUsersRoute"));
app.use(
  "/transaction_history",
  require("./app/routes/TransactionHistory/transactionHistoryRoute")
);
app.use("/contact_us", require("./app/routes/Contact_Us/contact_usRoute"));
app.use(
  "/privacy_policy",
  require("./app/routes/Privacy_Policy/privacy_policyRoute")
);

// Delete user account after 90 days
// week ago  59 is minutes 0 is hours and it takes 24 hour format
cron.schedule("59 0 * * *", async function () {
  const client = await pool.connect();
  try {
    console.log("Cron job started");
    const query =
      "DELETE FROM users WHERE deleted_user = $1 AND CURRENT_DATE - deleted_at > $2";
    const result = await pool.query(query, [true, 90]);
    console.log(`Deleted ${result.rowCount} users`);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
  }
});
// Paypal Add Money as an game entry fee
app.post("/create_payment_paypal-db", async (req, res) => {
  const { user_id, game_id } = req.body;
  console.log(user_id);
  console.log(game_id);
  // check game id and user id
  const game_status = "completed";
  const userDataCheck = await pool.query(
    "SELECT * FROM games WHERE game_id=$1 AND game_status <> $2",
    [game_id, game_status]
  );
  if (userDataCheck.rows.length === 0) {
    console.log("zero");
    res.json({
      error: true,
      message: "Game Not Found OR Game status will be completed!",
    });
  } else {
    console.log("one");
    console.log(userDataCheck.rows[0].entry_fee);
    let entry_fee = userDataCheck.rows[0].entry_fee;
    const gameUserCheck = await pool.query(
      "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
      [game_id, user_id]
    );
    // let game_participants = gameUserCheck.rows.length;
    // let jackpot = parseInt(game_participants) * parseInt(entry_fee);

    if (gameUserCheck.rows.length === 0) {
      console.log("zero");
      const gameUser = await pool.query(
        "INSERT INTO game_users (game_id, user_id) VALUES ($1, $2) RETURNING *",
        [game_id, user_id]
      );
      if (gameUser.rows.length > 0) {
        console.log("Game User Added Successfully");
        // payment success
        // get payed games of user
        const playedGames = await pool.query(
          "SELECT * FROM users WHERE user_id=$1",
          [user_id]
        );
        let user_email;
        if (playedGames.rows.length > 0) {
          user_email = playedGames.rows[0].email;
          const playedGame = await pool.query(
            "UPDATE users SET played_games=$1 WHERE user_id=$2 RETURNING *",
            [parseInt(playedGames.rows[0].played_games) + parseInt(1), user_id]
          );
        }

        // const approval_url = payment.links.find(link => link.rel === 'approval_url').href;
        // email for success payment
        const date = new Date();
        const month = date.toLocaleString("default", { month: "short" });
        const day = date.getDate();
        const year = date.getFullYear();
        const dateToday = month + " " + day + "," + year;
        const subject = "Payment Successfull";

        const gameUserTotal = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        let game_participants = gameUserTotal.rows.length;
        let jackpot = parseInt(game_participants) * parseInt(entry_fee);
        console.log("game_participants", game_participants);
        console.log("jackpot", jackpot);

        PaymentSuccess(
          user_email,
          subject,
          game_id,
          entry_fee,
          game_participants,
          jackpot,
          dateToday
        );
        res.json({
          error: false,
          data: gameUser.rows,
          message: "Game User Added Successfully",
        });
      } else {
        console.log("Game User Not Added Successfully");
      }
      // res.json({ error: false, data: gameUser.rows, message: "Game User Added Successfully" });
    } else {
      console.log("one");
      // const approval_url = payment.links.find(link => link.rel === 'approval_url').href;

      res.json({ error: true, message: "Game User Already Exist" });
    }
    // res.json({ error: true, message: "Game already exist" });
  }
});
app.post("/create_payment_paypal-db-v1", async (req, res) => {
  const { user_id, game_id } = req.body;
  console.log(user_id);
  console.log(game_id);
  // check wallet have enough money for play game or not ?
  const userWallet = await pool.query("SELECT * FROM wallet WHERE user_id=$1", [
    user_id,
  ]);
  if (userWallet.rows.length > 0) {
    // console.log(userWallet.rows)
    let Balance = userWallet.rows[0].balance;
    console.log(Balance);
    // check game amount
    const gameAountCheck = await pool.query(
      "SELECT * FROM games WHERE game_id=$1",
      [game_id]
    );
    if (gameAountCheck.rows.length > 0) {
      // console.log(gameAountCheck.rows)
      let EntryFee = gameAountCheck.rows[0].entry_fee;
      console.log(EntryFee);
      if (parseFloat(Balance) < parseFloat(EntryFee)) {
        console.log("less");
        res.json({
          error: true,
          insufficientBalnace: true,
          data: [],
          message: "Insufficient Balance",
        });
      } else {
        console.log("big");
        // Charge
        const gameUserCheck = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
          [game_id, user_id]
        );
        if (gameUserCheck.rows.length === 0) {
          console.log("zero");
          const gameUser = await pool.query(
            "INSERT INTO game_users (game_id, user_id) VALUES ($1, $2) RETURNING *",
            [game_id, user_id]
          );
          if (gameUser.rows.length > 0) {
            console.log("Game User Added Successfully");
            // Minus amount from wallet
            const wallet = await pool.query(
              "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
              [parseFloat(Balance) - parseFloat(EntryFee), user_id]
            );
            if (wallet.rows.length > 0) {
              console.log(" Minus amount from wallet ");
              //     res.json({
              //      error: false,
              //      wallet: wallet.rows[0],
              //      message: "Amount Added to Wallet Successfully"
              //  });
            }
            // payment success
            // get payed games of user
            const playedGames = await pool.query(
              "SELECT * FROM users WHERE user_id=$1",
              [user_id]
            );
            let user_email;
            if (playedGames.rows.length > 0) {
              user_email = playedGames.rows[0].email;
              const playedGame = await pool.query(
                "UPDATE users SET played_games=$1 WHERE user_id=$2 RETURNING *",
                [
                  parseInt(playedGames.rows[0].played_games) + parseInt(1),
                  user_id,
                ]
              );
            }

            // const approval_url = payment.links.find(link => link.rel === 'approval_url').href;
            // email for success payment
            const date = new Date();
            const month = date.toLocaleString("default", { month: "short" });
            const day = date.getDate();
            const year = date.getFullYear();
            const dateToday = month + " " + day + "," + year;
            const subject = "Payment Successfull";

            const gameUserTotal = await pool.query(
              "SELECT * FROM game_users WHERE game_id=$1",
              [game_id]
            );
            let game_participants = gameUserTotal.rows.length;
            let jackpot = parseInt(game_participants) * parseInt(EntryFee);
            console.log("game_participants", game_participants);
            console.log("jackpot", jackpot);

            PaymentSuccess(
              user_email,
              subject,
              game_id,
              EntryFee,
              game_participants,
              jackpot,
              dateToday
            );
            res.json({
              error: false,
              data: gameUser.rows,
              message: "Game User Added Successfully",
            });
          } else {
            console.log("Game User Not Added Successfully");
            res.json({
              error: true,
              message: "Game User Not Added Successfully",
            });
          }
          // res.json({ error: false, data: gameUser.rows, message: "Game User Added Successfully" });
        } else {
          console.log("one");
          // const approval_url = payment.links.find(link => link.rel === 'approval_url').href;

          res.json({ error: true, message: "Game User Already Exist" });
        }
      }
    } else {
      console.log("Error amount ");
      res.json({ error: true, data: [], message: "Not Found Game Entry Fee" });
    }
  } else {
    console.log("Not Found");

    console.log(userWallet.rows);
    res.json({ error: true, data: [], message: "Not Found user Wallet" });
  }
});
// Paypal add money to wallet
app.post("/create_payment_paypal-db-wallet", async (req, res) => {
  const { user_id, amount } = req.body;
  console.log(user_id);
  console.log(amount);
  const userDataCheck = await pool.query(
    "SELECT * FROM users WHERE user_id=$1",
    [user_id]
  );

  if (userDataCheck.rows.length === 0) {
    res.json({ error: true, data: [], message: "User Not Found" });
  } else {
    // add winning_amount_single to user wallet
    const userWallet = await pool.query(
      "SELECT * FROM wallet WHERE user_id=$1",
      [user_id]
    );
    if (userWallet.rows.length > 0) {
      const wallet = await pool.query(
        "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
        [parseFloat(userWallet.rows[0].balance) + parseFloat(amount), user_id]
      );
      if (wallet.rows.length > 0) {
        const type = "deposit";
        const userDataTransaction = await pool.query(
          "INSERT INTO transaction_history(user_id,amount,type) VALUES($1,$2,$3) returning *",
          [user_id, amount, type]
        );
        if (userDataTransaction.rows.length > 0) {
          console.log("wallet updated");
          res.json({
            error: false,
            wallet: wallet.rows[0],
            message: "Amount Added to Wallet Successfully",
          });
        } else {
          res.json({
            error: true,
            data: [],
            message: "Can't Update Transaction History",
          });
        }
      } else {
        res.json({ error: true, data: [], message: "Something went wrong" });
      }
    }
  }
});
// payout check
app.post("/payout-check", async (req, res) => {
  const { payoutBatchId } = req.body;
  try {
    // Obtain the access token again
    const accessToken = await getAccessToken();

    // Execute the payment
    const response = await fetch(
      `${PaypalSandBoxUrl}/payments/payouts/${payoutBatchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        // body: JSON.stringify(response),
      }
    );

    const payment = await response.json();
    console.log("payment");

    console.log(payment);
    res.json({ error: false, payment: payment });
    // if (response.ok) {
    //   res.json({ error: false, payment: payment });
    // } else {
    //   res.json({ error: true, message: payment });
    // }
  } catch (error) {
    console.log(error);
    res.json({ error: true, message: error.message });
  }
});
// execute check
app.post("/execute-payment", async (req, res) => {
  const { paymentId, payerId } = req.body;

  try {
    // Obtain the access token again
    const accessToken = await getAccessToken();

    // Execute the payment
    const response = await fetch(
      `${PaypalSandBoxUrlmV2}/payments/payment/${paymentId}/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ payer_id: payerId }),
      }
    );

    const payment = await response.json();
    console.log("payment");

    console.log(payment);
    if (response.ok) {
      res.json({ error: false, payment: payment });
    } else {
      res.json({ error: true, message: payment });
    }
  } catch (error) {
    res.json({ error: true, message: error.message });
  }
});

// end point for paypal
app.post("/pay", async (req, res) => {
  const { items, amount, description, redirect_urls, user_id, game_id } =
    req.body;
  try {
    // Obtain the access token
    const accessToken = await getAccessToken();
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: redirect_urls,
      transactions: [
        {
          item_list: {
            items: items,
          },
          amount: amount,
          description: description,
        },
      ],
    };
    // Set up PayPal payment request
    const response = await fetch(`${PaypalSandBoxUrlmV2}/payments/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(create_payment_json),
    });

    const payment = await response.json();

    if (response.ok) {
      const approval_url = payment.links.find(
        (link) => link.rel === "approval_url"
      ).href;
      res.json({ error: false, approval_url: approval_url });
    } else {
      res.json({ error: true, message: payment });
    }
    //not correct below
    // paypal.payment.create(create_payment_json, async function (error, payment) {
    //   if (error) {
    //     // throw error;
    //     res.json({ error: true, message: error });
    //   } else {
    //     console.log(payment);
    //     console.log("Create Payment JSON");

    //     console.log(create_payment_json);
    //     console.log("Create Payment Response");
    //     const approval_url = payment.links.find(
    //       (link) => link.rel === "approval_url"
    //     ).href;
    //     // const paymentID = payment.id; // Payment ID to be saved for future reference

    //     // If you want to save the user's payment method for future transactions
    //     // const payerID = payment.payer.payer_info.payer_id; // Payer ID to be saved for future reference
    //     res.json({ error: false, approval_url: approval_url });
    // }
    // });
  } catch (error) {
    res.json({ error: true, message: error.message });
  }
});
// withdraw amount
app.post("/payout", async (req, res) => {
  // const { amount, receiver } = req.body;
  // try {
  //   // Get an access token
  //   const {
  //     data: { access_token },
  //   } = await axios.post(API_TOKEN_REQ, null, {
  //     headers: {
  //       Accept: "application/json",
  //       "Accept-Language": "en_US",
  //       "content-type": "application/x-www-form-urlencoded",
  //     },
  //     auth: {
  //       username: user_name_auth,
  //       password: password_auth,
  //     },
  //     params: {
  //       grant_type: "client_credentials",
  //     },
  //   });
  //   // Create a payout
  //   const { data } = await axios.post(
  //     API_URL,
  //     {
  //       sender_batch_header: {
  //         email_subject: Email_Subject_Paypal,
  //       },
  //       items: [
  //         {
  //           recipient_type: "EMAIL",
  //           amount: {
  //             value: amount,
  //             currency: "USD",
  //           },
  //           receiver: receiver,
  //           note: email_note,
  //           sender_item_id: "item_1",
  //         },
  //       ],
  //     },
  //     {
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${access_token}`,
  //       },
  //     }
  //   );
  //   res.json(data);
  // } catch (error) {
  //   console.error("Error:", error);
  //   res
  //     .status(500)
  //     .json({ error: "An error occurred while creating the payout." });
  // }
});

// Products
// make api for just say server is running when runs localhost:5000 on google
app.get("/", (req, res) => {
  const serverTime = new Date();
  res.status(200).json({ error: false, message: "Server is running" });
  console.log(
    `Hours: ${serverTime.getHours()}, Minutes: ${serverTime.getMinutes()}, Seconds: ${serverTime.getSeconds()}`
  );
});

const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const connectedClients = new Set();
global.onlineUsers = new Map();
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);
  connectedClients.add(socket.id);
  if (connectedClients.has(socket.id)) {
    // socket.join('room1');
    // socket.on("test-message", (data) => {
    //   console.log(data);
    // });
    socket.on("game-created", (data) => {
      const userId = socket.id; // Assuming `data` includes a `userId`
      // Implement logic to update unread messages count for the clicked contact/user.
      console.log("game-created", data);

      // comment
      setTimeout(() => {
        io.emit("received-data", data);
        // io.to(userId).emit("received-data", data);
        console.log("emitted received-data", data);
      }, 1000);

      // Once the unread messages are updated, you can emit an event to inform the client.
    });
    socket.on("received-data", (data) => {
      // Implement logic to update unread messages count for the clicked contact/user.
      console.log("received-data", data);

      // Once the unread messages are updated, you can emit an event to inform the client.
    });
    console.log("Client is connected");
  } else {
    console.log("Client is not connected");
  }

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
    connectedClients.delete(socket.id);
  });
});
// make api to get romm1 users connected
app.get("/room1", (req, res) => {
  const serverTime = new Date();
  res.status(200).json({ error: false, message: "Server is running" });
  console.log(
    `Hours: ${serverTime.getHours()}, Minutes: ${serverTime.getMinutes()}, Seconds: ${serverTime.getSeconds()}`
  );
  console.log(connectedClients);
  console.log(onlineUsers);
});

server.listen(PORT, () =>
  console.log(`
 ################################################
       Server listening on port: ${PORT}
 ################################################
 `)
);
module.exports = io;
