import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const gameShortName = 'AsteroidAttk';

const port = process.env.PORT || 3000;

function initBot(): TelegramBot {
  dotenv.config();
  const token = process.env.TBOT_API_KEY;
  const bot = new TelegramBot(token, { polling: true });
  return bot;
}

const bot = initBot();

interface query {
  inline_message_id: string;
  user_id: string;
  name: string;
}

const queries: { [key: string]: query } = {};

async function runBot(): Promise<void> {
  bot.onText(/start|game/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendGame(chatId, gameShortName);
  });

  bot.on('callback_query', async (query) => {
    if (query.game_short_name === gameShortName) {
      const chatId = query.id;
      queries[chatId] = {
        user_id: String(query.from.id),
        inline_message_id: query.inline_message_id,
        name: query.from.first_name,
      };

      const highScores = await bot.getGameHighScores(
        queries[chatId].user_id,
        queries[chatId],
      );

      let highScore = 0;
      let currentScore = 0;
      highScores.forEach((score) => {
        if (score.score > highScore) {
          highScore = score.score;
        }
        if (score.user.id === query.from.id) {
          currentScore = score.score;
        }
      });

      const urlParams = new URLSearchParams({
        chat_id: chatId,
        name: queries[chatId].name,
        high_score: String(highScore),
        score: String(currentScore),
      }).toString();

      const site = 'https://www.game1.superraptor911.tech/?';
      const url = site + urlParams;
      console.log('url', url);
      await bot.answerCallbackQuery(query.id, { url: url });
    } else {
      await bot.answerCallbackQuery(query.id, { text: 'Wrong game' });
    }
  });

  bot.on('inline_query', (query) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = [
      {
        type: 'game',
        id: '0',
        game_short_name: gameShortName,
      },
    ];
    bot.answerInlineQuery(query.id, results);
  });
}

app.post(`/highscore/${gameShortName}`, async (req, res) => {
  const chatId = req.body.chat_id as string;
  const score = parseInt(req.body.score as string);

  const query = queries[chatId];
  console.log('query', query);
  if (query) {
    await bot.setGameScore(query.user_id, score, query);
  }

  res.send('ok');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

runBot();
