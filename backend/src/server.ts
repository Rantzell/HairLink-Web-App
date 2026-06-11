import './env';
import app from './app';
import { checkDueDeliverySchedules } from './services/deliverySchedule.service';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`[HairLink API] Server running on http://localhost:${PORT}`);
  console.log(`[HairLink API] Health check: http://localhost:${PORT}/health`);
});

// Check for donor-scheduled deliveries that have come due, every minute.
checkDueDeliverySchedules();
setInterval(checkDueDeliverySchedules, 60 * 1000);
