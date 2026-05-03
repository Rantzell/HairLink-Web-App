import app from './app';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`[HairLink API] Server running on http://localhost:${PORT}`);
  console.log(`[HairLink API] Health check: http://localhost:${PORT}/health`);
});
