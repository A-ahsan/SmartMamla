// Standalone payment + SMS API (production, e.g. Render). In development `npm run dev` already serves /api.
import app from './app.js'

// Render/Heroku give the port in PORT
const PORT = process.env.PORT || process.env.SMARTMAMLA_PORT || 5050
app.listen(PORT, () => console.log(`✔ SmartMamla API listening on :${PORT}`))
