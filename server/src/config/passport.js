import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/user.model.js';

/* ---------------- GOOGLE ---------------- */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          googleId: profile.id,
        });

        if (!user) {
          const email = profile.emails?.[0]?.value;

          user = await User.findOne({ email });

          if (user) {
            // Existing email account ko Google se link karo
            user.googleId = profile.id;
            user.isVerified = true;

            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }

            await user.save();
          } else {
            // Naya user create karo
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value,
              isVerified: true,
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

/* ---------------- GITHUB ---------------- */

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/github/callback`,
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          githubId: profile.id,
        });

        const email =
          profile.emails?.[0]?.value ||
          `${profile.username}@github.com`;

        if (!user) {
          user = await User.findOne({ email });

          if (user) {
            user.githubId = profile.id;
            user.isVerified = true;

            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }

            await user.save();
          } else {
            user = await User.create({
              githubId: profile.id,
              name: profile.displayName || profile.username,
              email,
              avatar: profile.photos?.[0]?.value,
              isVerified: true,
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;