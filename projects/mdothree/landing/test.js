module.exports = (req, res) => {
  res.json({ 
    message: 'API is working!',
    env: process.env.STRIPE_SECRET_KEY ? 'STRIPE_SECRET_KEY is set' : 'STRIPE_SECRET_KEY is NOT set'
  });
};
