import express from 'express';
import NotificationSubscription from '../models/NotificationSubscription.js';


const notifrouter = express.Router();

// Subscribe to push notifications
notifrouter.post('/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body;

    // Upsert subscription (update if exists, insert if new)
    await NotificationSubscription.findOneAndUpdate(
      { userId },
      { userId, subscription },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Subscription saved' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription' });
  }
});

// Get VAPID public key
notifrouter.get('/vapid-public-key', (req, res) => {
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY, });

});

export default notifrouter;