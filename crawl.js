const { Telegraf } = require("telegraf");
const axios = require("axios").default;
const { get, find } = require("lodash");

// ENV
const botID = process.env.botID
const roomID = process.env.roomID
const appleStoreID = process.env.appleStoreID
const applePart = process.env.applePart
const storePickupTitle = process.env.storePickupTitle

const bot = new Telegraf(botID);
const endpoint = `https://www.apple.com/th/shop/retail/pickup-message?pl=true&searchNearby=true&store=${appleStoreID}&parts.0=${applePart}`
let fetching = false;
const loop = async () => {
  if (fetching) return;
  console.log(`${new Date().toLocaleString()}`);
  try {
    fetching = true;
    const response = await axios.get(endpoint, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36",
      },
    });
    const stores = get(response.data.body, "stores", []);
    if (stores.length === 0) return;
    const store = find(stores, (store) => store.storeNumber === appleStoreID);
    const { storePickupQuote, storePickupProductTitle, ...other } = get(
      store.partsAvailability,
      applePart,
      {
        storePickupQuote: "ขณะนี้ยังไม่มีจำหน่ายที่",
        storePickupProductTitle: storePickupTitle,
      }
    );
    console.info(other)
    if (!(`${storePickupQuote}`.startsWith("ขณะนี้ยังไม่มีจำหน่ายที่") || `${storePickupQuote}`.startsWith("ไม่มีสิทธิ์"))) {
      bot.telegram.sendMessage(
        roomID,
        `${storePickupQuote} - ${storePickupProductTitle}`
      );
    } else {
      // bot.telegram.sendMessage(id, 'NOPE')
      console.info(`${storePickupQuote} - ${storePickupProductTitle}`);
    }
  } catch (err) {
    console.error(err);
    if (err.message) bot.telegram.sendMessage(roomID, err.message);
  } finally {
    fetching = false;
  }
};

const delay = 60 // in second

bot
  .launch()
  .then(() => {
    setInterval(loop, delay * 1000);
    loop();
  })
  .catch((err) => {
    console.error(err)
    setTimeout(() => {
      process.exit(err ? 1 : 0);
    }, 2000);
  });
