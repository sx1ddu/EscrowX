import nodemailer from 'nodemailer';
import logger from './logger.js';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT),
  secure: false,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const emailTemplates = {
  otp: (otp) => ({
    subject: 'Your EscrowX OTP Code',
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#6366f1;">EscrowX</h2>
      <p>Your OTP is:</p>
      <h1 style="letter-spacing:8px;color:#111;">${otp}</h1>
      <p>Expires in 10 minutes. Do not share this with anyone.</p>
    </div>`
  }),
  orderPlaced: (order) => ({
    subject: `Order Confirmed #${order._id}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#6366f1;">EscrowX</h2>
      <p>Your order has been placed and payment is held in escrow.</p>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Amount:</strong> ₹${order.amount}</p>
      <p>Funds will be released to seller only after you confirm delivery.</p>
    </div>`
  }),
  fundsReleased: (amount) => ({
    subject: 'Funds Released to Your Wallet!',
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#6366f1;">EscrowX</h2>
      <p>Great news! ₹${amount} has been released to your wallet.</p>
    </div>`
  }),
  buyerRefunded: (amount) => ({
    subject: 'Refund Credited to Your Wallet',
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#6366f1;">EscrowX</h2>
      <p>Your dispute was resolved in your favor. ₹${amount} has been refunded to your wallet.</p>
    </div>`
  }),
  disputeRaised: (disputeId) => ({
    subject: `Dispute Raised #${disputeId}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#6366f1;">EscrowX</h2>
      <p>A dispute has been raised for your order. Our team will review within 48 hours.</p>
    </div>`
  }),
};

export const sendEmail = async ({ to, template, data }) => {
  try {
    const { subject, html } = emailTemplates[template](data);
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`📧 Email sent [${template}] to ${to}`);
  } catch (err) {
    logger.error(`❌ Email failed: ${err.message}`);
  }
};
