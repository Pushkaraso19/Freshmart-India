const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('./setupEnv');

const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api', routes);

// Not found
app.use((req, res) => {
	res.status(404).json({ error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
	console.error(err);
	res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
