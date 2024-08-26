const express = require('express');
const router = express.Router();
const controller = require("../../controllers/GAMES/gamesController")

// games 
router.post("/create_game", controller.createGame);

router.put("/change_game_status", controller.changeStatus);
router.delete("/delete_game", controller.deleteGame);
router.get("/get_all_games", controller.getAllGames);
router.get("/get_all_games_pagination", controller.getAllGamesPagination);
router.post("/announce_result", controller.announceResult);

router.get("/get_game_details_by_user_id", controller.getGameUserByGameId);
router.get("/get_games_by_year", controller.getGamesByYear);
router.get("/get_scheduled_games", controller.getScheduledGames);
// getCompletedGameLatestByUserId
router.get("/get_completed_games_latest_by_user_id", controller.getCompletedGameLatestByUserId);



module.exports = router;