const { pool, getBallImages } = require("../../config/db.config");
const crypto = require("crypto");
const express = require("express");
const io = require("../../../server");

// const {
//     white_ball,
//     ball_1,
//     ball_2,
//     ball_3,
//     ball_4,
//     ball_5,
//     ball_6,
//     ball_7,
//     ball_8,
//     ball_9,
//     ball_10,
//     ball_11,
//     ball_12,
//     ball_13,
//     ball_14,
//     ball_15
// } = require("../../socialIcons");
const fetchBallImages = require("../../utils/ball_images_urls");
// make an api call to get the ball images and it would be used in below apis
// const ballImageUrls = getBallImages();
// const ballImageUrls =  fetchBallImages();

// const ballImageUrls = {
//     0: white_ball,
//     1: ball_1,
//     2: ball_2,
//     3: ball_3,
//     4: ball_4,
//     5: ball_5,
//     6: ball_6,
//     7: ball_7,
//     8: ball_8,
//     9: ball_9,
//     10: ball_10,
//     11: ball_11,
//     12: ball_12,
//     13: ball_13,
//     14: ball_14,
//     15: ball_15
// };
// Game
exports.createGame = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    //    io.emit('game-created', {
    //     message:'dshjdshfhjf'
    //    })
    //
    const { entry_fee, commission } = req.body;
    // const company_user = false;
    if (entry_fee === null || entry_fee === "" || entry_fee === undefined) {
      res.json({ error: true, message: "Please Provide Entry Fee" });
    } else {
      const game_status = "completed";
      const userDataCheck = await pool.query(
        "SELECT * FROM games WHERE game_status <> $1",
        [game_status]
      );
      if (userDataCheck.rows.length === 0) {
        // console.log("zero")
        const game_status = "scheduled";
        const game_id = Math.floor(Math.random() * 90000) + 10000;
        const userData = await pool.query(
          "INSERT INTO games(game_id,entry_fee,commission,game_status) VALUES($1,$2,$3,$4) returning *",
          [game_id, entry_fee, commission, game_status]
        );
        if (userData.rows.length === 0) {
          res.json({ error: true, data: [], message: "Can't Create Game" });
        } else {
          // socket call
          // io.emit('game-created', { message: 'Some API endpoint was hit' });
          // io.emit('game-created', {
          //     game_id,mess
          // });
          res.json({
            error: false,
            data: userData.rows[0],
            message: "Game Created Successfully",
          });
        }
      } else {
        res.json({ error: true, message: "Game already exist" });
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// change status
exports.changeStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { game_id, game_status } = req.body;
    const userData = await pool.query(
      "UPDATE games SET game_status = $1 WHERE game_id = $2 returning *",
      [game_status, game_id]
    );
    if (userData.rows.length === 0) {
      res.json({ error: true, data: [], message: "Can't Update Game Status" });
    } else {
      res.json({
        error: false,
        data: userData.rows[0],
        message: "Game Status Updated Successfully",
      });
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// delete game
exports.deleteGame = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { game_id } = req.body;
    const userData = await pool.query(
      "DELETE FROM games WHERE game_id = $1 returning *",
      [game_id]
    );
    if (userData.rows.length === 0) {
      res.json({ error: true, data: [], message: "Can't Delete Game" });
    } else {
      res.json({
        error: false,
        data: userData.rows[0],
        message: "Game Deleted Successfully",
      });
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// get All Games
exports.getAllGames = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const userData = await pool.query(
      "SELECT * FROM games ORDER BY created_at DESC"
    );
    if (userData.rows.length === 0) {
      res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    } else {
      const total_games = userData.rows.length;
      let resulting_data = [];
      // console.log("total_games", userData.rows)
      for (let i = 0; i < total_games; i++) {
        const game_id = userData.rows[i].game_id;
        const winners = userData.rows[i].winners;
        const winning_amount = userData.rows[i].winning_amount;
        const winning_amount_single = userData.rows[i].winning_amount_single;

        const game_users = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants = game_users.rows.length;
        const game_details = {
          game_id: game_id,
          entry_fee: userData.rows[i].entry_fee,
          commission: userData.rows[i].commission,
          game_status: userData.rows[i].game_status,
          total_participants: total_participants,
          winners: winners === null ? 0 : winners,
          winning_amount:
            winning_amount === null ? 0 : parseFloat(winning_amount).toFixed(2),
          winning_amount_single:
            winning_amount_single === null
              ? 0
              : parseFloat(winning_amount_single).toFixed(2),
        };
        resulting_data.push(game_details);
        // console.log(resulting_data);
      }
      res.json({
        error: false,
        data: resulting_data,
        message: "Games Get Successfully",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
//get all user games in which user participated
exports.getGameUserByGameId = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { user_id } = req.query;
    const userData = await pool.query(
      "SELECT * FROM game_users WHERE user_id=$1",
      [user_id]
    );
    if (userData.rows.length === 0) {
      res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    } else {
      // get games with game game_details
      const total_games = userData.rows.length;
      // console.log("total_games", userData.rows)
      let resulting_data = [];
      for (let i = 0; i < total_games; i++) {
        let user_selected_winning_ball = userData.rows[i].winning_ball;
        if (user_selected_winning_ball == null) {
          continue;
        }
        const game_id = userData.rows[i].game_id;
        const game_details = await pool.query(
          "SELECT * FROM games WHERE game_id=$1",
          [game_id]
        );
        // console.log(game_details)
        if (game_details.rows.length === 0) {
          console.log(`Game with id ${game_id} doesn't exist`);
          continue; // Skip the current iteration and move to the next game
        }
        let game_statusData = game_details.rows[0].game_status;
        // console.log("new game_statusData", game_statusData)
        let winner_ball = game_details.rows[0].winner_ball;
        let played_at = game_details.rows[0].played_at;
        let winning_amount =Number(game_details.rows[0].winning_amount) % 1 === 0 ? Number(game_details.rows[0].winning_amount) : Number(game_details.rows[0].winning_amount).toFixed(2);
        let winning_amount_single = Number(game_details.rows[0].winning_amount_single) % 1 === 0 ? Number(game_details.rows[0].winning_amount_single) : Number(game_details.rows[0].winning_amount_single).toFixed(2);
        let UserStatus = "Win";
        // console.log("winner_ball", winner_ball)
        if (parseInt(user_selected_winning_ball) === parseInt(winner_ball)) {
          UserStatus = "Win";
        } else if (parseInt(winner_ball) === parseInt(0)) {
          UserStatus = "House Wins";
        } else if (parseInt(winner_ball) === parseInt(8)) {
          // if user selected winning ball is in 1 to 8 then user win
          if (
            parseInt(user_selected_winning_ball) >= parseInt(1) &&
            parseInt(user_selected_winning_ball) <= parseInt(8)
          ) {
            UserStatus = "Win";
          } else {
            UserStatus = "Lost";
          }
        } else if (parseInt(winner_ball) === parseInt(9)) {
          //  if user selected winning ball is in 9 to 15 then user win
          if (
            parseInt(user_selected_winning_ball) >= parseInt(9) &&
            parseInt(user_selected_winning_ball) <= parseInt(15)
          ) {
            UserStatus = "Win";
          } else {
            UserStatus = "Lost";
          }
        } else {
          UserStatus = "Lost";
        }
        // get total participants
        const game_users = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants = game_users.rows.length;

        if (game_statusData == "completed") {
          const game_details_data = game_details.rows[0];

          const game_details_final = {
            game_id: game_id,
            entry_fee: game_details_data.entry_fee,
            commission: game_details_data.commission,
            game_status: UserStatus,
            total_participants: total_participants,
            winner_ball: winner_ball,
            winner_ball_image_url: ballImageUrls[winner_ball], // Add the URL of the winner ball
            user_selected_winning_ball: user_selected_winning_ball,
            user_selected_ball_image_url:
              ballImageUrls[user_selected_winning_ball], // Add the URL of the user selected ball
            played_at: played_at,
            winning_amount: Number(winning_amount) % 1 === 0 ? Number(winning_amount) : Number(winning_amount).toFixed(2),
            winning_amount_single: Number(winning_amount_single) % 1 === 0 ? Number(winning_amount_single) : Number(winning_amount_single).toFixed(2),
          };
          resulting_data.push(game_details_final);
        }
      }
      res.json({
        error: false,
        data: resulting_data,
        message: "Games Get Successfully",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
// get game whose status is scheduled
exports.getScheduledGames = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const user_id = req.query.user_id;
    const userData = await pool.query(
      "SELECT * FROM games WHERE game_status != 'completed' ORDER BY game_id DESC LIMIT 1"
    );
    if (userData.rows.length === 0) {
      res.json({
        error: true,
        winnerScreen: true,
        data: [],
        message: "No Current game ",
      });
    } else {
      const total_games = userData.rows.length;
      const game_status = userData.rows[0].game_status;
      let resulting_data = [];
      for (let i = 0; i < total_games; i++) {
        const game_id = userData.rows[i].game_id;
        const game_users = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants = game_users.rows.length;
        let jackpot = 0;
        if (game_status === "scheduled") {
          jackpot =
            parseFloat(userData.rows[i].entry_fee) *
            parseFloat(total_participants);
        } else {
          // substract commision amount from jackpot
          const commisssion = userData.rows[i].commission;
          const entry_fee = userData.rows[i].entry_fee;
          jackpot = parseFloat(entry_fee) * parseFloat(total_participants);
          const commission_amount =
            parseFloat(jackpot) * (parseFloat(commisssion) / 100);
          // deduct commission from jackpot
          jackpot = jackpot - commission_amount;
        }
        // Query to get the count of each winning_ball selected
        const ball_counts_result = await pool.query(
          "SELECT winning_ball, COUNT(*) FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
          [game_id]
        );

        // Initialize ball_counts object with keys from 1 to 15, each set to 0
        let ball_counts = {};
        for (let j = 1; j <= 15; j++) {
          // ball_counts[j] = 0;
          console.log(ballImageUrls[j]);
          ball_counts[j] = {
            count: 0,
            imageUrl: ballImageUrls[j], // Get the URL from the mapping
          };
        }

        // Update ball_counts with the actual counts
        for (let row of ball_counts_result.rows) {
          ball_counts[row.winning_ball] = {
            count: parseInt(row.count),
            imageUrl: ballImageUrls[row.winning_ball], // Get the URL from the mapping}
          };
        }

        const game_user_current = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
          [game_id, user_id]
        );
        let user_participated = false;
        let user_selcted_ball = 0;
        let user_selceted_ball_image_url = ballImageUrls[0];
        let user_selcted_ball_game_user_id = 0;
        if (game_user_current.rows.length > 0) {
          user_participated = true;
          user_selcted_ball = game_user_current.rows[0].winning_ball;
          user_selceted_ball_image_url =
            ballImageUrls[game_user_current.rows[0].winning_ball];
          user_selcted_ball_game_user_id =
            game_user_current.rows[0].game_users_id;
        }

        const game_details = {
          game_id: game_id,
          entry_fee: userData.rows[i].entry_fee,
          commission: userData.rows[i].commission,
          game_status: userData.rows[i].game_status,
          total_participants: total_participants,
          ball_counts_participants: ball_counts,
          user_participated: user_participated,
          user_selcted_ball: user_selcted_ball,
          user_selceted_ball_image_url: user_selceted_ball_image_url,
          user_selcted_ball_game_user_id: user_selcted_ball_game_user_id,

          jackpot: Number(jackpot) % 1 === 0 ? Number(jackpot) : Number(jackpot).toFixed(2),
        };
        resulting_data.push(game_details);
      }
      res.json({
        error: false,
        data: resulting_data,
        message: "Games Get Successfully",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
// get latest game details if its completed by user id
exports.getCompletedGameLatestByUserId = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { user_id } = req.query;
    const userData = await pool.query(
      "SELECT * FROM game_users WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
      [user_id]
    );
    if (userData.rows.length === 0) {
      res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    } else {
      // get games with game game_details
      const total_games = userData.rows.length;
      console.log(userData.rows);
      let resulting_data = [];
      for (let i = 0; i < total_games; i++) {
        let user_selected_winning_ball = userData.rows[0].winning_ball;

        console.log(user_selected_winning_ball);

        const game_id = userData.rows[0].game_id;
        const game_details = await pool.query(
          "SELECT * FROM games WHERE game_id=$1",
          [game_id]
        );
        console.log(game_details.rows[0]);
        let winners = game_details?.rows[0]?.winners;
        const game_statusData = game_details.rows[0].game_status;
        const winner_ball = game_details.rows[0].winner_ball;
        const played_at = game_details.rows[0].played_at;
        const winning_amount = game_details.rows[0].winning_amount;
        const winning_amount_single =
          game_details.rows[0].winning_amount_single;
        let UserStatus = "Win";
        if (parseInt(user_selected_winning_ball) === parseInt(winner_ball)) {
          UserStatus = "Win";
        } else if (parseInt(winner_ball) === parseInt(0)) {
          UserStatus = "House Wins";
        } else if (parseInt(winner_ball) === parseInt(8)) {
          // if user selected winning ball is in 1 to 8 then user win
          if (
            parseInt(user_selected_winning_ball) >= parseInt(1) &&
            parseInt(user_selected_winning_ball) <= parseInt(8)
          ) {
            UserStatus = "Win";
          } else {
            UserStatus = "Lost";
          }
        } else if (parseInt(winner_ball) === parseInt(9)) {
          //  if user selected winning ball is in 9 to 15 then user win
          if (
            parseInt(user_selected_winning_ball) >= parseInt(9) &&
            parseInt(user_selected_winning_ball) <= parseInt(15)
          ) {
            UserStatus = "Win";
          } else {
            UserStatus = "Lost";
          }
        } else {
          UserStatus = "Lost";
        }
        // get total participants
        const game_users = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants = game_users.rows.length;

        if (game_statusData === "completed") {
          const game_details_data = game_details.rows[0];
          console.log("game_details_data", game_details_data);
          const game_details_final = {
            game_id: game_id,
            entry_fee: game_details_data.entry_fee,
            commission: game_details_data.commission,
            game_status: UserStatus,
            total_participants: total_participants,
            winner_ball: winner_ball,
            winner_ball_image_url: ballImageUrls[winner_ball], // Add the URL of the winner ball
            user_selected_winning_ball: winners,
            user_selected_ball_image_url:
              ballImageUrls[user_selected_winning_ball], // Add the URL of the user selected ball
            played_at: played_at,
            winning_amount: Number(winning_amount) % 1 === 0 ? Number(winning_amount) : Number(winning_amount).toFixed(2),
            winning_amount_single: Number(winning_amount_single) % 1 === 0 ? Number(winning_amount_single) : Number(winning_amount_single).toFixed(2),
          };
          resulting_data.push(game_details_final);
        }
      }
      res.json({
        error: false,
        data: resulting_data,
        message: "Games Get Successfully",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};

// get all games pagination
exports.getAllGamesPagination = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;
    const userData = await pool.query(
      "SELECT * FROM games ORDER BY game_id ASC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    if (userData.rows.length === 0) {
      res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    } else {
      const total_games = userData.rows.length;
      let resulting_data = [];
      for (let i = 0; i < total_games; i++) {
        const game_id = userData.rows[i].game_id;
        const game_users = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants = game_users.rows.length;
        const game_details = {
          game_id: game_id,
          entry_fee: userData.rows[i].entry_fee,
          commission: userData.rows[i].commission,
          game_status: userData.rows[i].game_status,
          total_participants: total_participants,
        };
        resulting_data.push(game_details);
      }
      const Total_games = await pool.query("SELECT * FROM games");

      res.json({
        error: false,
        total_games: Total_games.rows.length,
        data: resulting_data,
        page_no: page,
        limit: limit,
        message: "Games Get Successfully",
      });
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
// anounce result
exports.announceResult = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { game_id, winning_ball } = req.body;
    const gameUser = await pool.query("SELECT * FROM games WHERE game_id=$1", [
      game_id,
    ]);
    console.log("winning_ball", winning_ball);
    if (gameUser.rows.length > 0) {
      // save game details
      let game_details = gameUser.rows[0];
      let entry_fee = gameUser.rows[0].entry_fee;
      let commisssion = gameUser.rows[0].commission;
      let game_statusData = "completed";
      let jackpot = 0;
      let commision_winning_amount = 0;
      // get all users count participated in this game
      const gameUsersAll = await pool.query(
        "SELECT * FROM game_users WHERE game_id=$1",
        [game_id]
      );
      let participated_users = gameUsersAll.rows.length;
      console.log("users ");
      // console.log(gameUsersAll)

      // if winning_ball is 0
      if (parseInt(winning_ball) === parseInt(0)) {
        jackpot = 0;
        commision_winning_amount =
          parseFloat(entry_fee) * parseInt(participated_users);

        const played_at = new Date();
        const gameUserWinner = await pool.query(
          "UPDATE games SET winner_ball=$1, game_status=$2,winning_amount=$3,commision_winning_amount=$4,participants=$5,winners=$6,played_at=$7 WHERE game_id=$8 RETURNING *",
          [
            winning_ball,
            game_statusData,
            jackpot,
            commision_winning_amount,
            participated_users,
            0,
            played_at,
            game_id,
          ]
        );
        if (gameUserWinner.rows.length > 0) {
          res.json({
            error: false,
            winner_ball_image_url: ballImageUrls[winning_ball], // Add the URL of the winner ball
            game_details: gameUserWinner.rows[0],
            participated_users: participated_users,
            winners: 0,
            message: "Result Announced Successfully",
          });
        } else {
          res.json({
            error: true,
            again_start_game: true,
            message: "Cant Announce Winner Ball Right Now !",
          });
        }
      } else if (parseInt(winning_ball) === parseInt(8)) {
        // if winning ball is 8
        const gameUsersWinners = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
          [game_id, [1, 2, 3, 4, 5, 6, 7, 8]]
        );
        // No record then no winner
        if (gameUsersWinners.rows.length === 0) {
          res.json({
            error: true,
            game_details: game_details,
            again_start_game: true,
            message: "No User Winner",
          });
        } else {
          const participated_usersWinner = gameUsersWinners.rows.length;
          // get jackpot
          jackpot = parseFloat(entry_fee) * parseFloat(participated_users);
          // deduct commision from jackpot
          const commission_amount =
            parseFloat(jackpot) * (parseFloat(commisssion) / 100);
          // deduct commission from jackpot
          jackpot = jackpot - commission_amount;
          let winning_amount_single =
            parseFloat(jackpot) / parseFloat(participated_usersWinner);
          // add winning_amount_single to user wallet
          for (let i = 0; i < participated_usersWinner; i++) {
            const user_id = gameUsersWinners.rows[i].user_id;
            const userWinGames = await pool.query(
              "SELECT * FROM users WHERE user_id=$1",
              [user_id]
            );
            if (userWinGames.rows.length > 0) {
              const playedGame = await pool.query(
                "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
                [
                  parseFloat(userWinGames.rows[0].win_games) + parseFloat(1),
                  user_id,
                ]
              );
              // add winning_amount_single to user wallet
              const userWallet = await pool.query(
                "SELECT * FROM wallet WHERE user_id=$1",
                [user_id]
              );
              if (userWallet.rows.length > 0) {
                const wallet = await pool.query(
                  "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
                  [
                    parseFloat(userWallet.rows[0].balance) +
                      parseFloat(winning_amount_single),
                    user_id,
                  ]
                );
                if (wallet.rows.length > 0) {
                  console.log("wallet updated");
                }
              }
              // end
            }
          }

          // Update the game lastly
          const played_at = new Date();
          const gameUserWinner = await pool.query(
            "UPDATE games SET winner_ball=$1, game_status=$2,winning_amount=$3,commision_winning_amount=$4,participants=$5,winners=$6,played_at=$7,winning_amount_single=$8 WHERE game_id=$9 RETURNING *",
            [
              winning_ball,
              game_statusData,
              jackpot,
              commission_amount,
              participated_users,
              participated_usersWinner,
              played_at,
              winning_amount_single,
              game_id,
            ]
          );
          if (gameUserWinner.rows.length > 0) {
            res.json({
              error: false,
              winner_ball_image_url: ballImageUrls[winning_ball], // Add the URL of the winner ball

              game_details: gameUserWinner.rows[0],
              participated_users: participated_users,
              winners: participated_usersWinner,
              message: "Result Announced Successfully",
            });
          } else {
            res.json({
              error: true,
              message: "Cant Announce Winner Ball Right Now !",
            });
          }
        }
      } else if (parseInt(winning_ball) === parseInt(9)) {
        console.log("winning_ball", winning_ball);
        // if winning ball is 9
        const gameUsersWinners = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
          [game_id, [9, 10, 11, 12, 13, 14, 15]]
        );
        // No record then no winner
        if (gameUsersWinners.rows.length === 0) {
          res.json({
            error: true,
            game_details: game_details,
            again_start_game: true,
            message: "No User Winner",
          });
        } else {
          const participated_usersWinner = gameUsersWinners.rows.length;
          // get jackpot
          jackpot = parseFloat(entry_fee) * parseFloat(participated_users);
          // deduct commision from jackpot
          const commission_amount =
            parseFloat(jackpot) * (parseFloat(commisssion) / 100);
          // deduct commission from jackpot
          jackpot = jackpot - commission_amount;
          let winning_amount_single =
            parseFloat(jackpot) / parseFloat(participated_usersWinner);

          // add winning_amount_single to user wallet
          for (let i = 0; i < participated_usersWinner; i++) {
            const user_id = gameUsersWinners.rows[i].user_id;
            const userWinGames = await pool.query(
              "SELECT * FROM users WHERE user_id=$1",
              [user_id]
            );
            if (userWinGames.rows.length > 0) {
              const playedGame = await pool.query(
                "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
                [
                  parseFloat(userWinGames.rows[0].win_games) + parseFloat(1),
                  user_id,
                ]
              );
              // add winning_amount_single to user wallet
              const userWallet = await pool.query(
                "SELECT * FROM wallet WHERE user_id=$1",
                [user_id]
              );
              if (userWallet.rows.length > 0) {
                const wallet = await pool.query(
                  "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
                  [
                    parseFloat(userWallet.rows[0].balance) +
                      parseFloat(winning_amount_single),
                    user_id,
                  ]
                );
                if (wallet.rows.length > 0) {
                  console.log("wallet updated");
                }
              }
            }
            // end
          }

          // end

          // Update the game lastly
          const played_at = new Date();
          const gameUserWinner = await pool.query(
            "UPDATE games SET winner_ball=$1, game_status=$2,winning_amount=$3,commision_winning_amount=$4,participants=$5,winners=$6,played_at=$7,winning_amount_single=$8 WHERE game_id=$9 RETURNING *",
            [
              winning_ball,
              game_statusData,
              jackpot,
              commission_amount,
              participated_users,
              participated_usersWinner,
              played_at,
              winning_amount_single,
              game_id,
            ]
          );
          if (gameUserWinner.rows.length > 0) {
            console.log("image", ballImageUrls[winning_ball]);

            res.json({
              error: false,
              winner_ball_image_url: ballImageUrls[winning_ball], // Add the URL of the winner ball

              game_details: gameUserWinner.rows[0],
              participated_users: participated_users,
              winners: participated_usersWinner,
              message: "Result Announced Successfully",
            });
          } else {
            res.json({
              error: true,
              message: "Cant Announce Winner Ball Right Now !",
            });
          }
        }
      } else {
        // if winning ball is other than 9,8 and white 0
        console.log(winning_ball);
        // const gameUsersWinners = await pool.query("SELECT * FROM game_users WHERE game_id=$1", [game_id]);

        const gameUsersWinners = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball=$2",
          [game_id, winning_ball]
        );
        // No record then no winner
        console.log(gameUsersWinners);
        if (gameUsersWinners.rows.length === 0) {
          console.log("dshjdsh");
          res.json({
            error: true,
            game_details: game_details,
            again_start_game: true,
            message: "No User Winner",
          });
        } else {
          console.log("else ");
          const participated_usersWinner = gameUsersWinners.rows.length;
          console.log("participated_usersWinner", participated_usersWinner);
          console.log("participated_usersWinner", participated_users);

          // get jackpot
          jackpot = parseFloat(entry_fee) * parseFloat(participated_users);
          // deduct commision from jackpot
          const commission_amount =
            parseFloat(jackpot) * (parseFloat(commisssion) / 100);
          // deduct commission from jackpot
          jackpot = jackpot - commission_amount;

          const winning_amount_single =
            parseFloat(jackpot) / parseFloat(participated_usersWinner);

          // update user win games of participated_usersWinners
          for (let i = 0; i < participated_usersWinner; i++) {
            const user_id = gameUsersWinners.rows[i].user_id;
            const userWinGames = await pool.query(
              "SELECT * FROM users WHERE user_id=$1",
              [user_id]
            );
            if (userWinGames.rows.length > 0) {
              const playedGame = await pool.query(
                "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
                [
                  parseFloat(userWinGames.rows[0].win_games) + parseFloat(1),
                  user_id,
                ]
              );
              // add winning_amount_single to user wallet
              const userWallet = await pool.query(
                "SELECT * FROM wallet WHERE user_id=$1",
                [user_id]
              );
              if (userWallet.rows.length > 0) {
                console.log(
                  parseFloat(userWallet.rows[0].balance) +
                    parseFloat(winning_amount_single)
                );
                console.log("AAAAAAAA");

                const wallet = await pool.query(
                  "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
                  [
                    parseFloat(userWallet.rows[0].balance) +
                      parseFloat(winning_amount_single),
                    user_id,
                  ]
                );
                if (wallet.rows.length > 0) {
                  console.log("wallet updated");
                }
              }
              // end
            }
          }

          // Update the game lastly
          const played_at = new Date();
          const gameUserWinner = await pool.query(
            "UPDATE games SET winner_ball=$1, game_status=$2,winning_amount=$3,commision_winning_amount=$4,participants=$5,winners=$6,played_at=$7,winning_amount_single=$8 WHERE game_id=$9 RETURNING *",
            [
              winning_ball,
              game_statusData,
              jackpot,
              commission_amount,
              participated_users,
              participated_usersWinner,
              played_at,
              winning_amount_single,
              game_id,
            ]
          );
          if (gameUserWinner.rows.length > 0) {
            res.json({
              error: false,
              winner_ball_image_url: ballImageUrls[winning_ball], // Add the URL of the winner ball

              game_details: gameUserWinner.rows[0],
              participated_users: participated_users,
              winners: participated_usersWinner,
              message: "Result Announced Successfully",
            });
          } else {
            res.json({
              error: true,
              again_start_game: true,
              message: "Cant Announce Winner Ball Right Now !",
            });
          }
        }
      }
    } else {
      res.json({
        error: true,
        again_start_game: true,
        message: "Game Not Found",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};

// get games by year
exports.getGamesByYear = async (req, res) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const year = req.query.year; // assuming the year is passed as a URL parameter
    const query = `
            SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
            FROM games
            WHERE EXTRACT(YEAR FROM created_at) = $1
            GROUP BY month
            ORDER BY month ASC
        `;
    const result = await pool.query(query, [year]);
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
        December: counts[11],
      },
      message: "Games Found",
    });
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
