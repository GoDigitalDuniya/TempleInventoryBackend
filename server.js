require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");

connectDB();

const PORT = process.env.PORT;   // always from env

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
